// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Checkbox, Confirm } from "@cliffy/prompt";
import { Log } from "@/lib/logger.ts";
import GitService from "@/services/git.ts";

/**
 * Fail when stdin isn't a TTY. Centered here so every interactive prompt is
 * guarded without callers repeating the check. Interactive TUI prompts would
 * otherwise hang forever on piped/CI stdin.
 */
function guardTTY(): void {
  if (!Deno.stdin.isTerminal()) {
    throw Log.error(
      "Interactive TTY required for this prompt. Pipe stdin from CI instead."
    ).exit();
  }
}

/**
 * Run the interactive staging picker (Cliffy Checkbox) over unstaged tracked
 * + untracked files. Returns the list of paths the user chose to stage.
 *
 * Overrides Checkbox.format via prototype patch to show "N files selected"
 * instead of joining every value on one line (Cliffy's default).
 */
async function selectFilesToStage(): Promise<string[]> {
  const result = await GitService.getChangedFiles("unstaged");
  if (result.isError()) throw Log.error(result.error.message).exit();
  const files = result.ok;
  if (files.length === 0) return [];

  guardTTY();
  Log.info(
    "Tip: space = toggle, a = toggle all, type to filter, enter twice to confirm."
  );

  // Ponytail: patch Checkbox.format to show count instead of full list.
  // Restored immediately after prompt resolves — single-threaded CLI, safe.
  const proto = Checkbox.prototype as unknown as Record<string, unknown>;
  const orig = proto.format;
  proto.format = (value: string[]) => {
    const n = value.length;
    return n === 0 ? "none" : `${n} file${n === 1 ? "" : "s"} selected`;
  };
  try {
    return await Checkbox.prompt<string>({
      message: "Select files to stage:",
      options: files.map(name => ({ name, value: name, checked: false })),
    });
  } finally {
    proto.format = orig;
  }
}

/**
 * Multi-select over the translatable formats. The format actually requested
 * for this run starts selected so pressing Enter translates exactly the one
 * needed; ticking more formats fills the cache in the same pass.
 *
 * TTY-guarded. Returns `null` when the user cancels (Ctrl-C) — callers treat
 * that as declining the whole translation.
 */
async function selectFormatsToTranslate(
  available: readonly string[],
  preselected: string
): Promise<string[] | null> {
  if (available.length === 0) return [];

  guardTTY();

  // One format means no choice to make — skip the UI entirely.
  if (available.length === 1) return [available[0] as string];

  try {
    const selected = await Checkbox.prompt<string>({
      message:
        "Translate these format instructions too (space = toggle, enter = confirm):",
      options: available.map(format => ({
        name: format === preselected ? `${format} (requested)` : format,
        value: format,
        checked: format === preselected,
      })),
    });
    return selected ?? null;
  } catch {
    // Cliffy throws on cancel; a cancel is a decline, not a crash.
    return null;
  }
}

/**
 * Yes/no confirmation. TTY-guarded so callers don't need to check manually.
 */
async function confirmPrompt(
  message: string,
  defaultValue = true
): Promise<boolean> {
  guardTTY();
  return await Confirm.prompt({ message, default: defaultValue });
}

export {
  confirmPrompt,
  guardTTY,
  selectFilesToStage,
  selectFormatsToTranslate,
};
