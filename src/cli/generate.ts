// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Command } from "@cliffy/command";
import { resolveOptions, validateOptions } from "@/cli/flags.ts";
import { runEditor } from "@/cli/handlers/editor.ts";
import { runOffline } from "@/cli/handlers/offline.ts";
import { selectFilesToStage } from "@/cli/prompts.ts";
import { Log } from "@/lib/logger.ts";
import { splitProviderModel } from "@/lib/modelString.ts";
import { COMMIT_FORMATS, SUPPORTED_LANGUAGES } from "@/lib/types/commit.ts";
import type { ProviderType } from "@/lib/types/config.ts";
import AiService from "@/services/ai.ts";
import ConfigService from "@/services/config.ts";
import GitService from "@/services/git.ts";

/**
 * Guard: non-TTY + no API key + not --offline → hard fail.
 * Resolves `providers.<name>.apiKey` via `ConfigService.resolveApiKey`
 * (`$ENV` → env, literal passthrough, local providers need no key,
 * otherwise `${NAME}_API_KEY` fallback). An `Err` means no key is
 * available for this run.
 */
async function guardNonTTY(opts: Record<string, unknown>): Promise<true> {
  if (opts.offline) return true; // offline doesn't need a key
  if (Deno.stdin.isTerminal()) return true; // interactive session

  // Determine the active provider: --model provider/model wins, then the
  // config model string.
  const modelOpt = opts.model as string | undefined;
  let providerType: ProviderType;
  const modelSplit = modelOpt?.includes("/")
    ? splitProviderModel(modelOpt)
    : undefined;
  if (modelSplit?.isOk()) {
    providerType = modelSplit.ok.provider as ProviderType;
  } else {
    const modelResult = await ConfigService.get("model");
    const modelStr = (
      modelResult.isOk()
        ? (modelResult.ok as unknown as string)
        : "openai/gpt-5-nano"
    ) as string;
    const split = splitProviderModel(modelStr);
    providerType = (
      split.isOk() ? split.ok.provider : "openai"
    ) as ProviderType;
  }

  const loaded = await ConfigService.load();
  let raw: unknown;
  if (loaded.isOk()) {
    const providers = (loaded.ok as unknown as Record<string, unknown>)
      .providers as Record<string, unknown> | undefined;
    const entry = providers?.[providerType] as
      | Record<string, unknown>
      | undefined;
    raw = entry?.apiKey;
  }
  const resolved = ConfigService.resolveApiKey(raw, providerType);
  if (resolved.isOk()) return true;

  throw Log.error(
    `No API key found for provider "${providerType}" (${resolved.error.message}) and stdin is not a TTY. ` +
      `Export $${providerType.toUpperCase()}_API_KEY or use --offline.`
  ).exit();
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
        "--model <name:string>",
        'Model for this run in provider/model format (e.g. "openai/gpt-5-nano"). First slash splits provider from model id; multi-segment ids preserved ("9router/kc/stealth/ox-alpha"). Overrides config model.'
      )
      .option(
        "--format <name:string>",
        `Commit format. One of: ${COMMIT_FORMATS.join(", ")}. Ignored when --offline is set.`
      )
      .option(
        "--lang <name:string>",
        `Commit language (BCP-47, stored as-given, e.g. en, en-US, jp). Canonical: ${SUPPORTED_LANGUAGES.join(", ")}.`
      )
      .option(
        "--max-length <n:number>",
        "Override maxLength. Applies to --offline too."
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
