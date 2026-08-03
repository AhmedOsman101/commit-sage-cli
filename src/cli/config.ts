// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Command } from "@cliffy/command";
import { logError } from "@/lib/logger.ts";

export class ConfigCommand extends Command {
  constructor() {
    super();
    this.description("Inspect or modify the commit-sage configuration.").action(
      () => {
        logError("`config` is not yet implemented.");
      }
    );
  }
}
