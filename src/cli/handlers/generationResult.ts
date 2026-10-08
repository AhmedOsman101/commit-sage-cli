import type { Result } from "lib-result";
import { LanguageTranslationDeclinedError } from "@/lib/errors.ts";
import { Log } from "@/lib/logger.ts";
import type { CommitMessage } from "@/lib/types/commit.ts";

/**
 * Generation result handling shared by `generate` and `commit`.
 *
 * Declining to translate an unknown `commitLanguage` is a choice, not a
 * failure (ADR 003) — warn and exit 0 so pipes and CI stay unblocked. Every
 * other failure keeps its exit-1 behaviour. Lives in one place so a future
 * non-fatal generation outcome doesn't need a third edit.
 */
function handleGenerationResult(result: Result<CommitMessage, Error>): void {
  if (result.error instanceof LanguageTranslationDeclinedError) {
    throw Log.warning(result.error.message).exit(0);
  }
  if (result.isError()) throw Log.error(result.error.message).exit();
}

export { handleGenerationResult };
