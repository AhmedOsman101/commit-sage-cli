import { Err, Ok, type Result } from "lib-result";
import { promptForRef } from "@/cli/prompts.ts";
import type { GenerateOptions } from "@/cli/types/generateOptions.ts";
import { DEFAULT_CONFIG } from "@/lib/constants.ts";
import { Log } from "@/lib/logger.ts";
import type { RefsConfig } from "@/lib/types/config.ts";
import ConfigService from "@/services/config.ts";
import GitService from "@/services/git.ts";
import {
  applyRefsPlacement,
  extractRef,
  parseRefTokens,
} from "@/services/refUtils.ts";

/**
 * Read `commit.refs`, merged over compiled defaults.
 *
 * The merge covers partially-set objects (e.g. a hand-edited config with
 * only `enabled` present): anything absent falls back to the default rather
 * than surfacing as `undefined` downstream.
 */
async function resolveRefsConfig(): Promise<Result<RefsConfig, Error>> {
  const result = await ConfigService.get("commit", "refs");
  if (result.isError()) return Err(result.error);
  const stored =
    typeof result.ok === "object" && result.ok !== null
      ? (result.ok as Partial<RefsConfig>)
      : {};
  return Ok({ ...DEFAULT_CONFIG.commit.refs, ...stored });
}

/**
 * Resolve the ref tokens for this run.
 *
 * Precedence: `--ref` wins over `--refs`, which wins over the configured
 * source. `branch` with no match (or no branch on unborn HEAD) resolves to
 * nothing — refs are omitted silently, never an error. `prompt` on non-TTY
 * warns and resolves to nothing so pipes and CI stay unblocked; on a TTY
 * the prompt runs exactly once, and dismissing it propagates Cliffy's
 * `CancelError` (exit 130, same abort path as every other prompt).
 */
async function resolveRefsTokens(
  runOptions: Pick<GenerateOptions, "ref" | "refs">,
  refs: RefsConfig
): Promise<string[]> {
  const flagTokens = (runOptions.ref ?? [])
    .map(token => token.trim())
    .filter(token => token.length > 0);
  if (flagTokens.length > 0) return flagTokens;

  const source = runOptions.refs === true ? "prompt" : refs.source;

  switch (source) {
    case "branch": {
      const branch = await GitService.currentBranch();
      if (!branch) return [];
      const token = extractRef(branch, refs.branchPattern);
      return token ? [token] : [];
    }
    case "input":
      return parseRefTokens(refs.value);
    default: {
      if (!Deno.stdin.isTerminal()) {
        Log.warning(
          "Refs need an interactive prompt but stdin is not a TTY — continuing without refs."
        );
        return [];
      }
      return parseRefTokens(await promptForRef());
    }
  }
}

/**
 * Attach refs to `message` per config + flags.
 *
 * Explicit flags imply refs for the run: `--ref`/`--refs` attach even when
 * `commit.refs.enabled` is false (flags override config — the switch gates
 * only the config-driven flow). `--offline` callers never reach here —
 * formats and refs are AI-only by design.
 */
async function applyRefs(
  message: string,
  runOptions: Pick<GenerateOptions, "ref" | "refs">
): Promise<Result<string, Error>> {
  const configResult = await resolveRefsConfig();
  if (configResult.isError()) return Err(configResult.error);
  const refs = configResult.ok;

  const hasFlagOverride =
    (runOptions.ref?.length ?? 0) > 0 || runOptions.refs === true;
  if (!refs.enabled && !hasFlagOverride) return Ok(message);

  const tokens = await resolveRefsTokens(runOptions, refs);
  return Ok(applyRefsPlacement(message, tokens, refs.placement));
}

export { applyRefs };
