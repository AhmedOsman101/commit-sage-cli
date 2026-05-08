// Configuration for the general section
type GeneralConfig = {
  maxRetries: number;
  initialRetryDelayMs: number;
  temperature: number;
  maxInputChars: number;
  diffStrategy: "staged" | "unstaged" | "auto";
};

// Configuration for the Ollama provider (self-hosted, requires baseUrl)
type OllamaConfig = {
  baseUrl?: "http://localhost:11434" | (string & {});
};

// Configuration for the OpenRouter meta-provider
type OpenRouterConfig = {
  baseUrl?: "https://openrouter.ai/api/v1" | (string & {});
};

// Configuration for any OpenAI-compatible provider
type OpenaiConfig = {
  baseUrl: "https://api.openai.com/v1" | (string & {});
  apiKeyEnvVar: string;
  useChatCompletions: boolean;
};

// Configuration for commit-related settings
type CommitConfig = {
  autoCommit: boolean;
  autoPush: boolean;
  commitFormat: "conventional" | "angular" | "karma" | "emoji" | "semantic";
  onlyStagedChanges: boolean;
  commitLanguage: CommitLanguage;
  promptForRefs: boolean;
  maxSubjectLength: number;
  bodyStyle: "subject-only" | "subject-body" | "subject-body-footer";
};

export type ProviderReasoning = "off" | "low" | "medium" | "high";

// Supported AI provider types
export type ProviderType =
  | "gemini"
  | "openai"
  | "anthropic"
  | "deepseek"
  | "mistral"
  | "xai"
  | "ollama"
  | "moonshotai"
  | "zai"
  | "minimax"
  | "openrouter";

// Configuration for the provider selection
type ProviderConfig = {
  type: ProviderType;
  model: string;
  timeoutMs: number;
  reasoning: ProviderReasoning;
};

export type CommitLanguage = "english" | "russian" | "chinese" | "japanese";

// Main configuration type combining all sub-types
export type Config = {
  readonly $schema: "https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/refs/heads/main/config.schema.json";
  general: GeneralConfig;
  ollama: OllamaConfig;
  openrouter: OpenRouterConfig;
  openai: OpenaiConfig;
  commit: CommitConfig;
  provider: ProviderConfig;
};

export type ApiService =
  | "Gemini"
  | "OpenAI"
  | "Anthropic"
  | "DeepSeek"
  | "Mistral"
  | "Xai"
  | "MoonshotAI"
  | "Zai"
  | "MiniMax"
  | "OpenRouter";

export type ConfigSection = keyof Config;
export type ConfigKey<T extends ConfigSection> = keyof Config[T];
export type ConfigValue<
  T extends ConfigSection,
  G extends ConfigKey<T>,
> = Config[T][G];
