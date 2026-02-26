// Configuration for the general section
type GeneralConfig = {
  maxRetries: number;
  initialRetryDelayMs: number;
};

// Configuration for the Ollama provider (self-hosted, requires baseUrl)
type OllamaConfig = {
  model: string;
  baseUrl: "http://localhost:11434" | (string & {});
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

// Supported AI provider types
export type ProviderType =
  | "gemini"
  | "openai"
  | "anthropic"
  | "deepseek"
  | "mistral"
  | "xai"
  | "ollama";

// Configuration for the provider selection
type ProviderConfig = {
  type: ProviderType;
  model: string;
};

export type CommitLanguage = "english" | "russian" | "chinese" | "japanese";

// Main configuration type combining all sub-types
export type Config = {
  readonly $schema: "https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/refs/heads/main/config.schema.json";
  general: GeneralConfig;
  ollama: OllamaConfig;
  commit: CommitConfig;
  provider: ProviderConfig;
};

export type ApiService =
  | "Gemini"
  | "OpenAI"
  | "Anthropic"
  | "DeepSeek"
  | "Mistral"
  | "Xai";

export type ConfigSection = keyof Config;
export type ConfigKey<T extends ConfigSection> = keyof Config[T];
export type ConfigValue<
  T extends ConfigSection,
  G extends ConfigKey<T>,
> = Config[T][G];
