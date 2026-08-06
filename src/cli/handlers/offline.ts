// Copyright (C) 2025 Ahmad Osman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Err, ErrFromText, Ok, type Result } from "lib-result";
import { runEditor } from "@/cli/handlers/editor.ts";
import { DEFAULT_CONFIG } from "@/lib/constants.ts";
import { NoChangesDetectedError } from "@/lib/errors.ts";
import AiService from "@/services/ai.ts";
import ConfigService from "@/services/config.ts";
import GitService from "@/services/git.ts";
import {
  type FileChange,
  generateOfflineMessage,
  parseDiffIndex,
} from "@/services/offlineGenerator.ts";

/**
 * Collect name-status rows for the resolved diff mode.
 *
 * - `staged` → `git diff-index --cached HEAD` (index vs HEAD).
 * - `unstaged` → `git diff-files` (working tree vs index, i.e. NOT including
 *   things already staged — those would still show in `diff-index HEAD`
 *   because the working tree differs from HEAD even after staging).
 *
 * Honors user config (`general.diffStrategy` + `commit.onlyStagedChanges`)
 * via `AiService.resolveDiffMode()`. No silent fallback — empty result is
 * surfaced as `NoChangesDetectedError`.
 */
async function collectDiffIndexChanges(
  mode: "staged" | "unstaged"
): Promise<Result<FileChange[], Error>> {
  const stagedArgs = [
    "-c",
    "core.quotePath=false",
    "diff-index",
    "--cached",
    "--name-status",
    "--find-renames",
    "--find-copies",
    "--no-color",
    "HEAD",
  ];
  const unstagedArgs = [
    "-c",
    "core.quotePath=false",
    "diff-files",
    "--name-status",
    "--find-renames",
    "--find-copies",
    "--no-color",
  ];

  const args = mode === "staged" ? stagedArgs : unstagedArgs;

  const result = await GitService.execGit(args);
  if (result.isError()) return Err(result.error);
  if (result.ok.stdout.trim().length === 0) {
    return Err(
      new NoChangesDetectedError(
        mode === "staged"
          ? "No staged changes detected."
          : "No unstaged changes detected."
      )
    );
  }
  return Ok(parseDiffIndexLines(result.ok.stdout));
}

function parseDiffIndexLines(stdout: string): FileChange[] {
  const changes: FileChange[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    changes.push(parseDiffIndex(line));
  }
  return changes;
}

/**
 * Resolve `maxLength`: flag → `commit.maxSubjectLength` config → 80 default.
 */
async function resolveMaxLength(
  flagValue: number | undefined
): Promise<number> {
  if (flagValue !== undefined) return flagValue;
  const cfg = await ConfigService.get("commit", "maxSubjectLength");
  if (cfg.isOk() && cfg.ok) return cfg.ok;
  return DEFAULT_CONFIG.commit.maxSubjectLength;
}

interface OfflineRunOptions {
  maxLength: number | undefined;
  edit: boolean | undefined;
}

/**
 * Handle the `--offline` path end-to-end. Returns the generated message or
 * `Result.isError()` for any failure.
 */
async function runOffline(
  opts: OfflineRunOptions
): Promise<Result<string, Error>> {
  // Resolve staged vs unstaged via the same code path the AI uses, so the
  // user's `general.diffStrategy` + `commit.onlyStagedChanges` config is
  // honored.
  const diffModeResult = await AiService.resolveDiffMode();
  if (diffModeResult.isError()) return Err(diffModeResult.error);

  const changesResult = await collectDiffIndexChanges(diffModeResult.ok);
  if (changesResult.isError()) return Err(changesResult.error);

  const maxLength = await resolveMaxLength(opts.maxLength);
  const message = generateOfflineMessage(changesResult.ok, { maxLength });

  if (!message) {
    return ErrFromText("Offline generator produced an empty message");
  }

  let final = message;
  if (opts.edit) {
    const editResult = await runEditor(message);
    if (editResult.isError()) return Err(editResult.error);
    final = editResult.ok as string;
  }

  return Ok(final);
}

export type { OfflineRunOptions };
export { runOffline };
