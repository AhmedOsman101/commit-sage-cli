import { decode, encode } from "gpt-tokenizer/encoding/o200k_base";

// Single-encoding token counting for prompt truncation.
//
// `o200k_base` matches the default model family (`openai/gpt-5-*`) and is a
// close-enough approximation for other providers — truncation only needs to
// keep the diff roughly within the model's window, not exact per-model
// counts. The slim `gpt-tokenizer/encoding/*` subpath import keeps exactly
// one BPE rank table in the `deno compile` bundle instead of all encodings.

type FileDiffBlock = {
  /** Repo-relative path (`b/` side of `diff --git`), or `"unknown"`. */
  path: string;
  /** Full per-file diff chunk, including any `# ...` prefix and header. */
  content: string;
};

function countTokens(text: string): number {
  return encode(text).length;
}

const TRUNCATION_MARKER = "\n...(truncated)";
const MARKER_TOKENS = countTokens(TRUNCATION_MARKER);

// Basenames that carry almost no commit-message signal (vendored/lock
// output). Matched case-insensitively against the block path.
const NOISY_BASENAMES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "cargo.lock",
  "gemfile.lock",
  "poetry.lock",
  "pdm.lock",
  "composer.lock",
  "go.sum",
  "pubspec.lock",
  "podfile.lock",
  "package.resolved",
  "flake.lock",
]);

const NOISY_SUFFIXES = [
  ".min.js",
  ".min.css",
  ".bundle.js",
  ".bundle.css",
  ".chunk.js",
  ".map",
  ".lock",
];

const NOISY_DIR_SEGMENTS = new Set([
  "dist",
  "build",
  "out",
  "target",
  "vendor",
  "node_modules",
  ".next",
  "coverage",
]);

const NOISY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".pdf",
]);

function isNoisyFile(filePath: string): boolean {
  const normalized = filePath.toLowerCase().replaceAll("\\", "/");
  const segments = normalized.split("/");
  const basename = segments.at(-1) as string;
  if (NOISY_BASENAMES.has(basename)) return true;
  if (segments.some(segment => NOISY_DIR_SEGMENTS.has(segment))) {
    return true;
  }
  if (NOISY_SUFFIXES.some(suffix => basename.endsWith(suffix))) {
    return true;
  }
  const dotIndex = basename.lastIndexOf(".");
  if (dotIndex !== -1 && NOISY_EXTENSIONS.has(basename.slice(dotIndex))) {
    return true;
  }
  return false;
}

function extractDiffPath(block: string): string {
  const gitMatch = /^diff --git a\/(.*?) b\/(.*?)$/m.exec(block);
  if (gitMatch?.[2]) return gitMatch[2].trim();
  const plusMatch = /^\+\+\+ b\/(.+)$/m.exec(block);
  if (plusMatch?.[1]) return plusMatch[1].trim();
  return "unknown";
}

/**
 * Split a combined diff into per-file blocks at the `diff --git` join
 * points (`GitService.getDiff` joins per-file diffs with `"\n\n"`).
 * Any `# ...` group label directly above a `diff --git` header stays with
 * that file's block; preamble before the first header is prepended to the
 * first block. Chunks without a `diff --git` header are folded into the
 * following block so no content is lost.
 */
function splitDiffByFile(diff: string): FileDiffBlock[] {
  if (!diff.trim()) return [];
  const chunks = diff.split(/\n\n(?=(?:#[^\n]*\n)*diff --git )/g);
  const blocks: FileDiffBlock[] = [];
  let pending = "";
  for (const chunk of chunks) {
    const text = chunk.trim();
    if (!text) continue;
    if (!text.includes("diff --git ")) {
      pending = pending ? `${pending}\n\n${text}` : text;
      continue;
    }
    const content = pending ? `${pending}\n\n${text}` : text;
    pending = "";
    blocks.push({ path: extractDiffPath(content), content });
  }
  if (pending) {
    if (blocks.length > 0) {
      const last = blocks.at(-1) as FileDiffBlock;
      last.content = `${last.content}\n\n${pending}`;
    } else {
      blocks.push({ path: extractDiffPath(pending), content: pending });
    }
  }
  return blocks;
}

/** Header lines to always preserve: up to and including `diff --git`. */
function blockHeader(content: string): string {
  const lines = content.split("\n");
  const headerIndex = lines.findIndex(line => line.startsWith("diff --git "));
  if (headerIndex === -1) return lines[0] as string;
  return lines.slice(0, headerIndex + 1).join("\n");
}

/**
 * Token-truncate one block, keeping cuts on line boundaries. The result
 * never exceeds `budgetTokens` and always ends with the truncation marker
 * when truncated. The `diff --git` header line always survives: when even
 * the header does not fit, the header plus marker is returned (over
 * budget) so golden-fixture tests still see every file header.
 */
function truncateBlockToTokens(content: string, budgetTokens: number): string {
  if (countTokens(content) <= budgetTokens) return content;
  const header = blockHeader(content);
  const headerWithMarker = `${header}${TRUNCATION_MARKER}`;
  if (budgetTokens <= MARKER_TOKENS) {
    // Budget cannot fit real content: keep the header plus marker (over
    // budget by design) so every file stays represented.
    return headerWithMarker;
  }
  if (countTokens(headerWithMarker) >= budgetTokens) {
    return headerWithMarker;
  }
  const truncated = truncateToTokens(content, budgetTokens);
  const markerIndex = truncated.lastIndexOf(TRUNCATION_MARKER);
  const body = (
    markerIndex === -1 ? truncated : truncated.slice(0, markerIndex)
  ).replace(/\n[^\n]*$/, "");
  const result = body ? `${body}${TRUNCATION_MARKER}` : headerWithMarker;
  if (countTokens(result) > budgetTokens && result !== headerWithMarker) {
    return headerWithMarker;
  }
  return result;
}

/**
 * File-aware diff truncation under a shared token budget.
 *
 * Order: noisy files (lockfiles, generated, minified, build output)
 * collapse to header-plus-marker first; if still over budget the
 * remainder is split water-filling style — small files pass through
 * whole while large files share the leftover evenly. Cuts land on line
 * boundaries with a `...(truncated)` marker, and every file header
 * survives even when the budget cannot fit all headers.
 */
function truncateDiffByFile(
  blocks: FileDiffBlock[],
  budgetTokens: number
): string {
  if (blocks.length === 0) return "";
  const join = (contents: string[]): string => contents.join("\n\n");
  const totalTokens = blocks.reduce(
    (sum, block) => sum + countTokens(block.content),
    0
  );
  if (totalTokens <= budgetTokens) return join(blocks.map(b => b.content));

  // Tier 1: collapse noisy files to header-plus-marker first.
  const collapsed = blocks.map(block =>
    isNoisyFile(block.path)
      ? `${blockHeader(block.content)}${TRUNCATION_MARKER}`
      : block.content
  );
  const collapsedTotal = collapsed.reduce(
    (sum, content) => sum + countTokens(content),
    0
  );
  if (collapsedTotal <= budgetTokens) return join(collapsed);

  // Tier 2: water-filling fair share over the collapsed sizes. Small
  // files keep their full content; the leftover budget splits evenly
  // across the remaining large files.
  const order = collapsed
    .map((content, index) => ({ content, index }))
    .sort((a, b) => countTokens(a.content) - countTokens(b.content));
  const output = new Array<string>(collapsed.length);
  let remaining = budgetTokens;
  let remainingCount = order.length;
  for (const { content, index } of order) {
    const share = Math.max(0, Math.floor(remaining / remainingCount));
    const size = countTokens(content);
    if (size <= share) {
      output[index] = content;
      remaining -= size;
    } else {
      output[index] = truncateBlockToTokens(content, share);
      remaining -= countTokens(output[index] as string);
    }
    remainingCount -= 1;
  }
  return join(output as string[]);
}

function truncateToTokens(text: string, maxTokens: number): string {
  const tokens = encode(text);
  if (tokens.length <= maxTokens) return text;
  // Reserve marker budget up front so the result never exceeds maxTokens.
  if (maxTokens <= MARKER_TOKENS) return decode(tokens.slice(0, maxTokens));
  return `${decode(tokens.slice(0, maxTokens - MARKER_TOKENS))}${TRUNCATION_MARKER}`;
}

export type { FileDiffBlock };
export {
  countTokens,
  isNoisyFile,
  splitDiffByFile,
  truncateDiffByFile,
  truncateToTokens,
};
