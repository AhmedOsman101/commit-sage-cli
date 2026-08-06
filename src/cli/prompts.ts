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

  const selected = await Checkbox.prompt<string>({
    message: "Select files to stage:",
    options: files.map(name => ({ name, value: name, checked: false })),
  });

  // Cliffy joins all selected values on one line — show a clean list instead.
  if (selected.length > 0) {
    console.log();
    for (const file of selected) {
      console.log(`  ${file}`);
    }
    console.log();
  }

  return selected;
}

/**
 * Yes/no confirmation. TTY-guarded so callers don't need to check manually.
 */
async function confirmPrompt(message: string): Promise<boolean> {
  guardTTY();
  return await Confirm.prompt(message);
}

export { confirmPrompt, guardTTY, selectFilesToStage };
