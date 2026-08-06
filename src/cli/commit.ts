// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Command } from "@cliffy/command";
import { Log } from "@/lib/logger.ts";

class CommitCommand extends Command {
  constructor() {
    super();
    this.description(
      "Interactive commit flow: stage files, generate message, preview, commit."
    ).action(() => {
      throw Log.error("`commit` is not yet implemented.").exit();
    });
  }
}

export { CommitCommand };
