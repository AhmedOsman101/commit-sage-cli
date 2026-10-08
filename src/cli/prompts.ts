// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Checkbox, Confirm, Input } from "@cliffy/prompt";
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
async function selectFormatsToTranslate<T extends string>(
  available: readonly T[],
  preselected: T
): Promise<T[] | null> {
  if (available.length === 0) return [];

  guardTTY();

  try {
    const selected = await Checkbox.prompt<T>({
      message:
        "Translate these format instructions too (space = toggle, enter = confirm):",
      options: available.map(format => ({
        name: format === preselected ? `${format} (requested)` : format,
        value: format,
        checked: format === preselected,
      })),
    });
    // Cliffy widens T to string internally; the values came from
    // `available`, so narrowing back is safe.
    return (selected ?? null) as T[] | null;
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

/**
 * Single text input for refs (issue/ticket IDs).
 *
 * TTY-guarded. Cancellation (Esc/Ctrl-C) is NOT caught — Cliffy's
 * `CancelError` propagates to `main.ts`, which exits 130, the same abort
 * path as every other dismissed prompt. An empty answer is NOT an abort:
 * it resolves to `""` and the caller omits refs silently.
 */
async function promptForRef(): Promise<string> {
  guardTTY();
  return await Input.prompt({
    message: "Enter a ref (e.g. issue or ticket number) to add to the message:",
  });
}

export {
  confirmPrompt,
  guardTTY,
  promptForRef,
  selectFilesToStage,
  selectFormatsToTranslate,
};
