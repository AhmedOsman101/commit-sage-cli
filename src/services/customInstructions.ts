import { Ok, type Result } from "lib-result";
import { Log } from "@/lib/logger.ts";
import FileSystemService from "@/services/fileSystem.ts";

const MARKDOWN_SUFFIX = ".md";

/**
 * Decide whether `customInstructions` is a path or literal text (ADR 005).
 *
 * Detection is suffix + existence: a value ending in `.md` whose file is
 * readable is a path, anything else is instruction text. The known trade-off
 * (a literal instruction string that happens to end in `.md` is misread) is
 * accepted — users can inline-wrap or rename.
 *
 * Kept separate from the read so the decision is inspectable on its own and
 * the resolution logs can distinguish the two paths.
 */
async function isInstructionFile(
  value: string
): Promise<{ isFile: true; path: string } | { isFile: false }> {
  if (!value.endsWith(MARKDOWN_SUFFIX)) return { isFile: false };

  const exists = await FileSystemService.fileExists(value);
  return exists.isOk() && exists.ok
    ? { isFile: true, path: value }
    : {
        isFile: false,
      };
}

/**
 * Resolve `commit.customInstructions` to the text to inject.
 *
 * `.md` path + file exists → file contents. Otherwise → the value verbatim.
 * Empty/whitespace-only → empty string, so callers can skip the section
 * entirely with zero overhead.
 *
 * A `.md`-looking value whose file cannot be read falls back to literal text
 * rather than erroring: the user's instruction still reaches the model even
 * if the path is wrong, and a warning says what happened.
 */
async function resolveCustomInstructions(
  value: string
): Promise<Result<string>> {
  const trimmed = value.trim();
  if (trimmed === "") return Ok("");

  const kind = await isInstructionFile(trimmed);
  if (!kind.isFile) return Ok(trimmed);

  const readResult = await FileSystemService.readFile(kind.path);
  if (readResult.isError()) {
    Log.warning(
      `customInstructions points at "${kind.path}" but it could not be read (${readResult.error.message}) — using the value as literal instruction text`
    );
    return Ok(trimmed);
  }

  return Ok(readResult.ok.trim());
}

const CustomInstructionsService = {
  isInstructionFile,
  resolveCustomInstructions,
};

export { CustomInstructionsService };
