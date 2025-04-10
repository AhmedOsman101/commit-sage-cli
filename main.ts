import AiService from "./services/aiService.ts";
import GitService from "./services/gitService.ts";
import { logError } from "./utils/Logger.ts";

const homedir = Deno.env.get("HOME");

export const configPath = `${homedir}/commitSage/config.json`;

export const repoPath = await GitService.initialize();

async function main(): Promise<void> {
  try {
    await GitService.initialize();
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
