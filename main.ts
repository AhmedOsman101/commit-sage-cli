import AiService from "./services/aiService.ts";
import GitService from "./services/gitService.ts";
import { logError } from "./utils/Logger.ts";

async function main(): Promise<void> {
  try {
    GitService.initialize();
  } catch (error) {
    void logError("Failed during initialization:", error as Error);
    return;
  }

  try {
    const response = await AiService.generateAndApplyMessage();
    console.log(response.message);
  } catch (error) {
    void logError(error);
  }
}

if (import.meta.main) {
  await main();
}
