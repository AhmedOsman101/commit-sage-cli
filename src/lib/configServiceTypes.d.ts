import type { google } from "@ai-sdk/google";
import type { openai } from "@ai-sdk/openai";
import type { ollama } from "ollama-ai-provider-v2";

// Configuration for the general section
type GeneralConfig = {
  maxRetries: number;
  initialRetryDelayMs: number;
};

// Configuration for the Gemini provider
type GeminiConfig = {
  model: Parameters<typeof google>[0];
  baseUrl: "https://generativelanguage.googleapis.com/v1beta" | (string & {});
};

// Configuration for the Ollama provider
type OllamaConfig = {
  model: Parameters<typeof ollama>[0];
  baseUrl: "http://localhost:11434" | (string & {});
};

// Configuration for the OpenAI provider
type OpenaiConfig = {
  model: Parameters<typeof openai>[0];
  baseUrl: "https://api.openai.com/v1/models" | (string & {});
};

// Configuration for commit-related settings
type CommitConfig = {
  autoCommit: boolean;
  autoPush: boolean;
  commitFormat: "conventional" | "angular" | "karma" | "emoji" | "semantic";
  onlyStagedChanges: boolean;
  commitLanguage: CommitLanguage;
  promptForRefs: boolean;
};

// Configuration for the provider selection
type ProviderConfig = {
  type: "gemini" | "openai" | "ollama";
};

export type CommitLanguage = "english" | "russian" | "chinese" | "japanese";

// Main configuration type combining all sub-types
export type Config = {
  readonly $schema: "https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/refs/heads/main/config.schema.json";
  general: GeneralConfig;
  gemini: GeminiConfig;
  ollama: OllamaConfig;
  openai: OpenaiConfig;
  commit: CommitConfig;
  provider: ProviderConfig;
};

export type ConfigSection = keyof Config;
export type ConfigKey<T extends ConfigSection> = keyof Config[T];
export type ConfigValue<
  T extends ConfigSection,
  G extends ConfigKey<T>,
> = Config[T][G];

export type ApiService = "Gemini" | "OpenAI";
