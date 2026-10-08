import type { RefsPlacement } from "@/lib/types/config.ts";

/**
 * Fallback branch pattern matching Jira/Linear-style IDs (`PROJ-123`).
 * Used when `commit.refs.branchPattern` is empty or fails to compile, so a
 * typo in settings degrades to a sane default instead of breaking the run.
 */
const DEFAULT_BRANCH_PATTERN = "[A-Z][A-Z0-9]*-[0-9]+";

/**
 * Pull a single ref token out of a branch name with `pattern`.
 *
 * The first capture group wins when the pattern defines one (lets users
 * isolate a bare number behind a prefix, e.g. `issue-([0-9]+)`); otherwise
 * the whole match is the token. Returns `null` when nothing matches — the
 * caller omits refs silently rather than failing the run.
 */
function extractRef(branchName: string, pattern: string): string | null {
  if (!branchName) return null;

  let compiled: RegExp;
  try {
    compiled = new RegExp(pattern || DEFAULT_BRANCH_PATTERN);
  } catch {
    compiled = new RegExp(DEFAULT_BRANCH_PATTERN);
  }

  const found = compiled.exec(branchName);
  if (!found) return null;
  const token = found[1] || found[0];
  return token || null;
}

/**
 * Split a free-form ref value into tokens on commas and whitespace.
 *
 * Covers `commit.refs.value` (`PROJ-1, PROJ-2`), `--ref` leftovers, and
 * interactive answers alike — empties drop out so stray separators never
 * render as phantom refs.
 */
function parseRefTokens(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map(token => token.trim())
    .filter(token => token.length > 0);
}

/**
 * Render tokens as the labeled footer line (`Refs: <a>, <b>`).
 *
 * The label is deliberate (ADR 004): a bare token line is easy to mistake
 * for body text, while `Refs:` stays greppable for changelog tooling.
 */
function formatRefsLine(tokens: string[]): string {
  return `Refs: ${tokens.join(", ")}`;
}

/**
 * Place rendered refs into `message` per `placement`.
 *
 * - `end` (default): own line below the message.
 * - `start`: own line above the message.
 * - `prefix`: same line as the subject, ahead of it — kept labeled so the
 *   line stays parseable, and deliberately not re-truncated against
 *   `maxLength` (the prefix is user-asked metadata, not model verbiage).
 *
 * Empty `tokens` is a no-op returning `message` untouched.
 */
function applyRefsPlacement(
  message: string,
  tokens: string[],
  placement: RefsPlacement
): string {
  if (tokens.length === 0) return message;
  const line = formatRefsLine(tokens);
  switch (placement) {
    case "prefix":
      return `${line} ${message}`;
    case "start":
      return `${line}\n\n${message}`;
    default:
      return `${message}\n\n${line}`;
  }
}

export {
  applyRefsPlacement,
  DEFAULT_BRANCH_PATTERN,
  extractRef,
  formatRefsLine,
  parseRefTokens,
};
