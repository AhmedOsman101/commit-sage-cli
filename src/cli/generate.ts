// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Command } from "@cliffy/command";
import { logError } from "@/lib/logger.ts";

export class GenerateCommand extends Command {
  constructor() {
    super();
    this.description(
      "Generate a commit message from the staged diff and print it to stdout."
    ).action(() => {
      logError("`generate` is not yet implemented.");
    });
  }
}
