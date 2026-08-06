// Copyright (C) 2025 Ahmad Osman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Command } from "@cliffy/command";
import { ErrFromText, Ok, type Result } from "lib-result";
import { runEditor } from "@/cli/handlers/editor.ts";
import { runOffline } from "@/cli/handlers/offline.ts";
import type { GenerateOptions } from "@/cli/types/generateOptions.ts";
import { Log } from "@/lib/logger.ts";
import {
  COMMIT_FORMATS,
  type CommitFormat,
  type CommitLanguage,
  SUPPORTED_LANGUAGES,
} from "@/lib/types/commit.ts";
import { type ProviderType, SUPPORTED_PROVIDERS } from "@/lib/types/config.ts";
import AiService from "@/services/ai.ts";
import ConfigService from "@/services/config.ts";
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

// ─── The generate subcommand ────────────────────────────────────────────────

export class GenerateCommand extends Command {
  constructor() {
    super();
    this.description(
      "Generate a commit message from the staged diff and print it to stdout."
    )
      .option(
        "--offline",
        "Use static-analysis generator (no API). Always conventional-shape output. Ignores --format."
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
        `Commit format. One of: ${COMMIT_FORMATS.join(", ")}. Ignored when --offline is set.`
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

        // Must be in a git repository (offline needs GitService for diff-index)
        if (!GitService.isGitRepo()) {
          throw Log.error("Not in a git repository").exit();
        }

        // --offline: static-analysis path (delegates to offline handler)
        if (opts.offline) {
          await GitService.initialize();
          const offlineResult = await runOffline({
            maxLength: opts.maxLength as number | undefined,
            edit: opts.edit as boolean | undefined,
          });
          if (offlineResult.isError()) {
            throw Log.error(offlineResult.error.message).exit();
          }
          console.log(offlineResult.ok);
          return;
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
