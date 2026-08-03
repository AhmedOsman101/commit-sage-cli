// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Command } from "@cliffy/command";
import { HelpCommand } from "@cliffy/command/help";
import { CommitCommand } from "@/cli/commit.ts";
import { ConfigCommand } from "@/cli/config.ts";
import { GenerateCommand } from "@/cli/generate.ts";
import { VERSION } from "@/cli/version.ts";

export function buildRootCommand(): Command {
  const root = new Command()
    .name("commit-sage")
    .version(VERSION)
    .description("Generate meaningful git commit messages with AI.")
    .help({ auto: true })
    .throwErrors();

  root.command("generate", new GenerateCommand());
  root.command("commit", new CommitCommand());
  root.command("config", new ConfigCommand());
  root.command("help", new HelpCommand());

  return root;
}
