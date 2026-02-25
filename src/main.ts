// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { EmptyCommitMessageError } from "@/lib/errors.ts";
import { logError } from "@/lib/logger.ts";
import AiService from "@/services/aiService.ts";
import GitService from "@/services/gitService.ts";

async function main(): Promise<void> {
  try {
    GitService.initialize();
  } catch (error) {
    logError("Failed during initialization:", (error as Error).message);
  }

  try {
    const response = await AiService.generateAndApplyMessage();
    if (response.message.trim()) {
      console.log(response.message);
    } else {
      throw new EmptyCommitMessageError();
    }
  } catch (error) {
    logError((error as Error).message);
  }
}

if (import.meta.main) await main();
