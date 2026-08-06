// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Command } from "@cliffy/command";
import { resolveOptions, validateOptions } from "@/cli/flags.ts";
import { runEditor } from "@/cli/handlers/editor.ts";
import { runOffline } from "@/cli/handlers/offline.ts";
import { selectFilesToStage } from "@/cli/prompts.ts";
import { Log } from "@/lib/logger.ts";
import { COMMIT_FORMATS, SUPPORTED_LANGUAGES } from "@/lib/types/commit.ts";
import type { ProviderType } from "@/lib/types/config.ts";
import AiService from "@/services/ai.ts";
import ConfigService from "@/services/config.ts";
import GitService from "@/services/git.ts";

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

class GenerateCommand extends Command {
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
        await GitService.initialize();

        // Nothing staged yet? Offer the same staging picker as `commit`.
        const hasStaged = await GitService.hasChanges("staged");
        if (!hasStaged) {
          const picked = await selectFilesToStage();
          for (const file of picked) {
            const add = await GitService.execGit(["add", "--", file]);
            if (add.isError()) {
              throw Log.error(
                `Failed to stage ${file}: ${add.error.message}`
              ).exit();
            }
          }
        }

        // --offline: static-analysis path (delegates to offline handler)
        if (opts.offline) {
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

export { GenerateCommand };
