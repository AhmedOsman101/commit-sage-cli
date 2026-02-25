// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { formatUserError } from "@/lib/errorFormatter.ts";
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
    const result = await AiService.generateAndApplyMessage();

    if (result.isError()) {
      logError(formatUserError(result.error));
    }

    const response = result.ok;

    if (response.message.trim()) {
      console.log(response.message);
    } else {
      throw new EmptyCommitMessageError();
    }
  } catch (error) {
    logError(formatUserError(error as Error));
  }
}

if (import.meta.main) await main();
