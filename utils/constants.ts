import type { Config } from "../services/configServiceTypes.d.ts";
import GitService from "../services/gitService.ts";

const homedir = Deno.env.get("HOME");

export const configPath = `${homedir}/commitSage/config.json`;

export const repoPath = GitService.initialize();

export const defaultConfig: Config = {
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

export const messages = {
  fetchingDiff: "Fetching Git changes...",
  analyzingChanges: "Analyzing code changes...",
  generating: "Generating commit message...",
  settingMessage: "Setting commit message...",
  done: "Done!",
  success: "Commit message generated using {0} model",
  noStagedChanges:
    "No staged changes to commit. Please stage your changes first.",
  gitConfigError:
    "Git user.name or user.email is not configured. Please configure Git before committing.",
  checkingGitConfig: "Checking Git configuration...",
  committing: "Committing changes...",
  pushing: "Pushing changes...",
};

export const errorMessages = {
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
};
