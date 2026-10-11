import os from "node:os";
import { join } from "node:path";
import type { Config } from "@/lib/types/config.ts";

const OS = os.platform();
const HOME_DIR = os.homedir();

/**
 * Directory holding the user's config and caches. One helper so
 * `config.json` and `translations.json` can never drift apart on platform
 * paths — they must live in the same directory.
 */
function getConfigDir(): string {
  switch (OS) {
    case "darwin": // macOS
    case "linux":
    case "freebsd":
    case "netbsd":
    case "openbsd": {
      const base = process.env.XDG_CONFIG_HOME ?? join(HOME_DIR, ".config");
      return join(base, "commitSage");
    }
    case "win32": {
      const base = process.env.APPDATA ?? process.env.LOCALAPPDATA;
      return base ? join(base, "commitSage") : join(HOME_DIR, "commitSage");
    }
    default:
      return join(HOME_DIR, "commitSage");
  }
}

const CONFIG_DIR = getConfigDir();
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

/**
 * User-owned cache of AI-translated format templates, keyed
 * `[language][format]`. Deleting an entry re-triggers translation on the
 * next run — that is the whole invalidation story (ADR 003).
 */
const TRANSLATIONS_PATH = join(CONFIG_DIR, "translations.json");

const DEFAULT_CONFIG: Readonly<Config> = {
  $schema:
    "https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/refs/heads/main/config.schema.json",
  model: "openai/gpt-5-nano",
  generation: {
    maxRetries: 3,
    retryDelay: 1000,
    temperature: 0.7,
    maxPromptTokens: 100_000,
    maxOutputTokens: 4096,
    diffStrategy: "auto",
  },
  providers: {
    defaults: {
      timeoutMs: 60_000,
      reasoning: "off",
      apiType: "openai-chat",
    },
    openai: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "$OPENAI_API_KEY",
      apiType: "openai-chat",
    },
    ollama: {
      baseUrl: "http://localhost:11434/api",
    },
    openrouter: {
      baseUrl: "https://openrouter.ai/api/v1",
    },
    groq: {
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: "$GROQ_API_KEY",
    },
  },
  commit: {
    autoCommit: false,
    autoPush: false,
    commitFormat: "conventional",
    onlyStagedChanges: true,
    commitLanguage: "english",
    promptForRefs: false,
    customInstructions: "",
    refs: {
      enabled: false,
      source: "prompt",
      value: "",
      placement: "end",
      branchPattern: "[A-Z][A-Z0-9]*-[0-9]+",
    },
    maxLength: 80,
    bodyStyle: "subject-body",
    recentCommits: {
      enabled: false,
      count: 5,
      scope: "all",
    },
  },
  git: {
    timeoutMs: 30_000,
  },
};

const ERROR_MESSAGES = {
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

export {
  CONFIG_DIR,
  CONFIG_PATH,
  DEFAULT_CONFIG,
  ERROR_MESSAGES,
  HOME_DIR,
  OS,
  TRANSLATIONS_PATH,
};
