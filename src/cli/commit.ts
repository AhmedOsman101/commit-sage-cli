// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Command } from "@cliffy/command";
import { renderMarkdown } from "@littletof/charmd";
import { bold } from "@std/fmt/colors";
import { resolveOptions, validateOptions } from "@/cli/flags.ts";
import { runOffline } from "@/cli/handlers/offline.ts";
import { confirmPrompt, selectFilesToStage } from "@/cli/prompts.ts";
import { Log } from "@/lib/logger.ts";
import { COMMIT_FORMATS, SUPPORTED_LANGUAGES } from "@/lib/types/commit.ts";
import { SUPPORTED_PROVIDERS } from "@/lib/types/config.ts";
import AiService from "@/services/ai.ts";
import ConfigService from "@/services/config.ts";
import GitService from "@/services/git.ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Split a commit message into subject + body. The subject is the first line;
 * the body is everything after the first blank line, trimmed. If the message
 * is single-line, the body is empty.
 */
function splitMessage(message: string): { subject: string; body: string } {
  const normalized = message.replace(/\r\n/g, "\n").trim();
  const newlineIndex = normalized.indexOf("\n");
  if (newlineIndex === -1) return { subject: normalized, body: "" };

  const subject = normalized.substring(0, newlineIndex).trim();
  let body = normalized.substring(newlineIndex + 1).trim();

  // Skip a single leading blank line (the conventional separator)
  if (body.startsWith("\n")) body = body.replace(/^\n+/, "").trim();

  return { subject, body };
}

/**
 * Render a commit message for terminal preview. Subject is rendered as a
 * markdown heading (H3) so it stands out from the body. When the message is
 * single-line (no body) we render just the subject — the heading itself
 * communicates the preview framing.
 */
function renderPreview(message: string): string {
  let { subject, body } = splitMessage(message);
  subject = bold(subject);

  if (!body) return renderMarkdown(`${subject}`);
  return renderMarkdown(`${subject}\n\n${body}`);
}

/**
 * Resolve current branch name. Returns `null` if HEAD is unborn (no commits).
 */

// ─── The commit subcommand ──────────────────────────────────────────────────

class CommitCommand extends Command {
  constructor() {
    super();
    this.description(
      "Interactive commit flow: stage files, generate message, preview, commit, optional push."
    )
      // Generate-style flags (parity with `generate`).
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
      .option(
        "--model <name:string>",
        `Override provider.model for this run.\n  Possible values [${SUPPORTED_PROVIDERS.join(", ")}]`
      )
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
        "Pass -e to git commit so $EDITOR/$VISUAL opens before saving."
      )
      // Commit-specific flags.
      .option(
        "--push [branch:string]",
        "Push after commit. Bare --push pushes the current branch; --push <name> pushes the named branch."
      )
      .option(
        "-y, --yes",
        "Skip the confirm dialog (and the push confirm) regardless of commit.autoCommit / commit.autoPush."
      )
      .action(async (opts: Record<string, unknown>) => {
        const runOptions = resolveOptions(opts);

        // Validate flag values (same rules as `generate`)
        const validation = validateOptions(runOptions);
        if (validation.isError()) {
          throw Log.error(validation.error.message).exit();
        }
        const autoCommitResult = await ConfigService.get(
          "commit",
          "autoCommit"
        );
        if (autoCommitResult.isError()) {
          throw Log.error(autoCommitResult.error.message).exit();
        }
        const autoCommit = autoCommitResult.ok;

        const autoPushResult = await ConfigService.get("commit", "autoPush");
        if (autoPushResult.isError()) {
          throw Log.error(autoPushResult.error.message).exit();
        }
        const autoPush = autoPushResult.ok;

        const yes = Boolean(opts.yes);
        const pushValue = opts.push as string | true | undefined;

        // ── Git repository check ──────────────────────────────────────────
        if (!GitService.isGitRepo()) {
          throw Log.error("Not in a git repository").exit();
        }
        await GitService.initialize();

        // Does the user already have changes staged? If not, the picker runs.
        const hasStaged = await GitService.hasChanges("staged");

        // ── Stage: pick from unstaged if nothing staged yet ──────────────
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

        // Re-check after picker — the user may have selected nothing
        const stillNoStaged = !(await GitService.hasChanges("staged"));
        if (stillNoStaged) {
          const onlyStagedResult = await ConfigService.get(
            "commit",
            "onlyStagedChanges"
          );
          if (onlyStagedResult.isError()) {
            throw Log.error(onlyStagedResult.error.message).exit();
          }
          if (onlyStagedResult.ok) {
            throw Log.info(
              "No staged changes (commit.onlyStagedChanges=true; nothing to commit)."
            ).exit(0);
          }
          // Fall through — generateMessage will use the diffMode fallback
        }

        // ── Generate the message ─────────────────────────────────────────
        let message: string;
        if (opts.offline) {
          const offlineResult = await runOffline({
            maxLength: opts.maxLength as number | undefined,
            edit: opts.edit as boolean | undefined,
          });
          if (offlineResult.isError()) {
            throw Log.error(offlineResult.error.message).exit();
          }
          message = offlineResult.ok;
        } else {
          const result = await AiService.generateMessage(runOptions);
          if (result.isError()) throw Log.error(result.error.message).exit();
          message = (result.ok?.message ?? "").trim();
          if (!message) throw Log.error("Generated message is empty.").exit();
        }

        // ── Markdown preview ─────────────────────────────────────────────
        console.log(`\n${renderPreview(message)}\n`);

        // ── Confirm dialog ───────────────────────────────────────────────
        if (!autoCommit && !yes) {
          const confirmed = await confirmPrompt("Commit changes?");
          if (!confirmed) throw Log.info("Aborted.").exit(0);
        }

        // ── git commit ───────────────────────────────────────────────────
        const { subject, body } = splitMessage(message);
        const commitArgs: string[] = ["commit"];
        if (body) {
          commitArgs.push("-m", subject, "-m", body);
        } else {
          commitArgs.push("-m", subject);
        }
        if (opts.edit) commitArgs.push("-e");

        const commitResult = await GitService.execGit(commitArgs);
        if (commitResult.isError()) {
          throw Log.error(commitResult.error.message).exit();
        }
        // ── git push (only when --push was passed) ───────────────────────
        if (pushValue !== undefined) {
          await push(pushValue, yes || autoPush);
        }
      });
  }
}

/**
 * Push the current or named branch to `origin`. Warn-and-skip (not fail) if
 * no remote is configured or no `origin` remote exists. Auto-sets upstream
 * (`-u`) on first push to a branch.
 */
async function push(
  pushValue: string | true,
  skipConfirm: boolean
): Promise<void> {
  // Resolve target branch
  let branch: string;
  if (pushValue === true) {
    const current = await GitService.currentBranch();
    if (!current) {
      Log.warning("No current branch (unborn HEAD) — skipping push.");
      return;
    }
    branch = current;
  } else {
    branch = pushValue;
  }

  // Remote checks (origin URL treated as opaque: SSH or HTTPS both resolve)
  if (!(await GitService.hasAnyRemote())) {
    Log.warning("No remote configured — skipping push.");
    return;
  }
  if (!(await GitService.hasOriginRemote())) {
    Log.warning(`No 'origin' remote configured — skipping push to ${branch}.`);
    return;
  }

  // Confirm dialog (skipped when --yes or commit.autoPush is set)
  if (!skipConfirm) {
    const confirmed = await confirmPrompt(`Push to ${branch}?`);
    if (!confirmed) throw Log.error("Push aborted.").exit();
  }

  // Decide -u vs plain push
  const setUpstream = !(await GitService.hasUpstream(branch));

  const pushResult = await GitService.push(branch, { setUpstream });
  if (pushResult.isError()) throw Log.error(pushResult.error.message).exit();

  Log.success(`Pushed to origin/${branch}.`);
}

export { CommitCommand };
