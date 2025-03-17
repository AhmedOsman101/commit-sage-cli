import { logInfo } from "./utils/Logger.ts";

export const scriptDir = import.meta.dirname;

export let repoPath: string;

if (import.meta.main) {
  logInfo("Running at", Date.now());
}
