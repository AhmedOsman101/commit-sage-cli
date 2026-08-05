// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Command } from "@cliffy/command";
import { Err, ErrFromText, Ok, type Result } from "lib-result";
import type { GenerateOptions } from "@/cli/types/generateOptions.ts";
import { OS } from "@/lib/constants.ts";
import { Log } from "@/lib/logger.ts";
import {
  COMMIT_FORMATS,
  type CommitFormat,
  type CommitLanguage,
  SUPPORTED_LANGUAGES,
} from "@/lib/types/commit.ts";
import { type ProviderType, SUPPORTED_PROVIDERS } from "@/lib/types/config.ts";
import AiService from "@/services/ai.ts";
import CommandService from "@/services/command.ts";
import ConfigService from "@/services/config.ts";
import FileSystemService from "@/services/fileSystem.ts";
import GitService from "@/services/git.ts";

// ─── Option parsing helpers ────────────────────────────────────────────────

/** Resolve GenerateOptions from CLI flags. Each value: `flag ?? undefined`. */
function resolveOptions(opts: Record<string, unknown>): GenerateOptions {
  return {
    provider: opts.provider as ProviderType | undefined,
    model: opts.model as string | undefined,
    format: opts.format as CommitFormat | undefined,
    maxLength: opts.maxLength as number | undefined,
    language: opts.lang as CommitLanguage | undefined,
    context: opts.context as string | undefined,
    offline: opts.offline as boolean | undefined,
    edit: opts.edit as boolean | undefined,
  };
}

/** Validate resolved GenerateOptions. Returns `Err` with a user-facing message on invalid input. */
function validateOptions(runOptions: GenerateOptions): Result<true, Error> {
  if (runOptions.format) {
    const valid = COMMIT_FORMATS.includes(runOptions.format);
    if (!valid) {
      return ErrFromText(
        `Invalid format "${runOptions.format}". Valid: ${COMMIT_FORMATS.join(", ")}`
      );
    }
  }

  if (runOptions.provider) {
    const valid = SUPPORTED_PROVIDERS.includes(runOptions.provider);
    if (!valid) {
      return ErrFromText(
        `Invalid provider "${runOptions.provider}". Valid: ${SUPPORTED_PROVIDERS.join(", ")}`
      );
    }
  }

  if (runOptions.language) {
    const valid = SUPPORTED_LANGUAGES.includes(runOptions.language);
    if (!valid) {
      return ErrFromText(
        `Invalid language "${runOptions.language}". Valid: ${SUPPORTED_LANGUAGES.join(", ")}`
      );
    }
  }

  if (runOptions.maxLength !== undefined) {
    if (runOptions.maxLength <= 0 || !Number.isInteger(runOptions.maxLength)) {
      return ErrFromText("--max-length must be a positive integer");
    }
  }

  return Ok(true);
}

/**
 * Resolve the env var name for the active provider.
 * Returns `null` for ollama (no key needed).
 */
async function resolveProviderEnvVar(
  providerType: ProviderType
): Promise<string | null> {
  if (providerType === "ollama") return null;

  if (providerType === "openai") {
    const result = await ConfigService.get("openai", "apiKeyEnvVar");
    return result.isOk() && result.ok ? result.ok : "OPENAI_API_KEY";
  }

  return `${providerType.toUpperCase()}_API_KEY`;
}

/**
 * Guard: non-TTY + no API key + not --offline → hard fail.
 * Interactive `Secret.prompt` in `ConfigService.getApiKey` would hang.
 */
async function guardNonTTY(opts: Record<string, unknown>): Promise<true> {
  if (opts.offline) return true; // offline doesn't need a key
  if (Deno.stdin.isTerminal()) return true; // interactive session

  // Determine the active provider
  const providerOverride = opts.provider as ProviderType | undefined;
  const providerType: ProviderType =
    providerOverride ?? (await ConfigService.get("provider", "type")).unwrap();

  const envVarName = await resolveProviderEnvVar(providerType);
  if (envVarName && !Deno.env.get(envVarName)) {
    throw Log.error(
      `No API key found in $${envVarName} and stdin is not a TTY. ` +
        `Export $${envVarName} or use --offline.`
    ).exit();
  }

  return true;
}

// ─── --edit tempfile flow ───────────────────────────────────────────────────

/**
 * Open an editor with `initialContent`, return the final text.
 *
 * 1. Create temp file via FileSystemService
 * 2. Write initial content
 * 3. Spawn editor via CommandService.spawnInteractive (inherits stdio)
 * 4. Read back edited content
 * 5. Cleanup temp file
 */
async function runEditor(
  initialContent: string
): Promise<Result<string, Error>> {
  // Create temp file
  const tmpFileResult = await FileSystemService.createTempFile(
    "commit-sage-",
    ".txt"
  );
  if (tmpFileResult.isError()) return Err(tmpFileResult.error);
  const tmpFile = tmpFileResult.ok;

  try {
    // Write initial content
    const writeResult = await FileSystemService.writeFile(
      tmpFile,
      initialContent
    );
    if (writeResult.isError()) return Err(writeResult.error);

    // Determine editor
    const editor =
      Deno.env.get("VISUAL") ??
      Deno.env.get("EDITOR") ??
      (OS === "windows" ? "notepad" : "vi");

    // Handle "code --wait" style strings: split on first space
    const [editorBin, ...editorArgs] = editor.split(/\s+/);

    // Spawn editor with inherited stdio (interactive)
    const spawnResult = await CommandService.spawnInteractive(
      editorBin,
      [...editorArgs, tmpFile],
      {
        inheritStdin: true,
        inheritStdout: true,
        inheritStderr: true,
      }
    );
    if (spawnResult.isError()) {
      Log.warning(`Editor exited with error: ${spawnResult.error.message}`);
      return Ok(initialContent.trim());
    }

    // Read back edited content
    const readResult = await FileSystemService.readFile(tmpFile);
    if (readResult.isError()) return Err(readResult.error);

    const edited = readResult.ok.trim();
    return Ok(edited || initialContent.trim());
  } finally {
    // Best-effort cleanup
    await FileSystemService.removeFile(tmpFile);
  }
}

// ─── The generate subcommand ────────────────────────────────────────────────

export class GenerateCommand extends Command {
  constructor() {
    super();
    this.description(
      "Generate a commit message from the staged diff and print it to stdout."
    )
      .option(
        "--offline",
        "Use static-analysis generator (no API). Always conventional-shape output. [T5 stub]"
      )
      .option(
        "--context <text:string>",
        "Additional context to inject into the prompt (AI only)."
      )
      .option(
        "--provider <name:string>",
        "Override provider.type for this run."
      )
      .option("--model <name:string>", "Override provider.model for this run.")
      .option(
        "--format <name:string>",
        `Commit format. One of: ${COMMIT_FORMATS.join(", ")}.`
      )
      .option(
        "--lang <name:string>",
        `Commit language. One of: ${SUPPORTED_LANGUAGES.join(", ")}.`
      )
      .option(
        "--max-length <n:number>",
        "Override maxSubjectLength. Applies to --offline too."
      )
      .option(
        "--edit",
        "Open the generated message in $EDITOR/$VISUAL before printing."
      )
      .action(async (opts: Record<string, unknown>) => {
        const runOptions = resolveOptions(opts);

        // Validate flag values
        const validation = validateOptions(runOptions);
        if (validation.isError())
          throw Log.error(validation.error.message).exit();

        // Non-TTY + no API key guard
        await guardNonTTY(opts);

        // --offline stub (T5)
        if (opts.offline) {
          throw Log.error(
            "--offline is not yet implemented (T5 in progress)."
          ).exit();
        }

        // Must be in a git repository
        if (!GitService.isGitRepo()) {
          throw Log.error("Not in a git repository").exit();
        }

        Log.debug(`[generate] runOptions=${JSON.stringify(runOptions)}`);

        const result = await AiService.generateMessage(runOptions);
        if (result.isError()) throw Log.error(result.error.message).exit();

        let message = result.ok?.message.trim() as string;
        if (!message) throw Log.error("Generated message is empty.").exit();

        // --edit: open in $EDITOR, re-read, print final
        if (opts.edit) {
          const editResult = await runEditor(message);
          if (editResult.isError()) {
            throw Log.error(editResult.error.message).exit();
          }
          message = editResult.ok as string;
        }

        console.log(message);
      });
  }
}
