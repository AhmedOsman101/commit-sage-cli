// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Command } from "@cliffy/command";
import { Log } from "@/lib/logger.ts";

class ConfigCommand extends Command {
  constructor() {
    super();
    this.description("Inspect or modify the commit-sage configuration.").action(
      () => {
        throw Log.error("`config` is not yet implemented.").exit();
      }
    );
  }
}

export { ConfigCommand };
