import { homedir } from "node:os";
import { join } from "node:path";
import GitService from "../services/gitService.ts";
import type { Config } from "./configServiceTypes.d.ts";

function getConfigPath(): string {
  switch (OS) {
    case "freebsd":
    case "netbsd":
    case "darwin": // macOS
    case "linux":
      return join(`${HOME_DIR}/.config/commitSage/config.json`);
    // biome-ignore lint/suspicious/noFallthroughSwitchClause: If no config dir is found, fall through to the default case
    case "windows": {
      const configDir = Deno.env.get("APPDATA");
      if (configDir) {
        return join(configDir, "commitSage", "config.json");
      }
    }
    default:
      return join(HOME_DIR, "commitSage", "config.json");
  }
}

export const OS: Readonly<string> = Deno.build.os;

export const HOME_DIR: Readonly<string> = homedir();

export const CONFIG_PATH: Readonly<string> = getConfigPath();

export const REPO_PATH: Readonly<string> = GitService.initialize();

export const DEFAULT_CONFIG: Readonly<Config> = {
  $schema:
    "https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/refs/heads/main/config.schema.json",
  general: {
    maxRetries: 3,
    initialRetryDelayMs: 1000,
  },
  gemini: {
    model: "gemini-2.0-flash-exp",
  },
  ollama: {
    model: "llama3.2",
    baseUrl: "http://localhost:11434",
  },
  codestral: {
    model: "codestral-2405",
  },
  openai: {
    model: "gpt-3.5-turbo",
    baseUrl: "https://api.openai.com/v1",
  },
  commit: {
    autoCommit: false,
    autoPush: false,
    commitFormat: "conventional",
    onlyStagedChanges: true,
    commitLanguage: "english",
    promptForRefs: false,
  },
  provider: {
    type: "gemini",
  },
};

export const ERROR_MESSAGES = {
  commandExecution: "Error in command execution:",
  generateCommitMessage: "Failed to generate commit message",
  apiError: "API Error: {0}",
  networkError: "Network Error: {0}",
  configError: "Configuration error: {0}",
  fileNotFound: "File not found",
  gitError: "Git Error: {0}",
  invalidInput: "Invalid Input: {0}",
  paymentRequired:
    "Payment Required: Your API key requires a valid subscription or has exceeded its quota. Please check your billing status.",
  invalidRequest:
    "Invalid Request: The request was malformed or the input was invalid. This may happen if the content is too long or contains unsupported characters.",
  rateLimitExceeded:
    "Rate Limit Exceeded: Too many requests in a short time period. Please wait a moment before trying again.",
  serverError:
    "Server Error: The service is temporarily unavailable. Please try again later.",
  authenticationError:
    "Authentication Error: The API key is invalid or has been revoked. Please check your API key.",
  noChanges: "No changes to commit",
  noRepository: "No Git repository found",
  noWorkspace: "No workspace folder is open",
  noCommitsYet: "Repository has no commits yet",
  fileNotCommitted: "File has not been committed yet",
  fileDeleted: "File has been deleted",
} as const;
