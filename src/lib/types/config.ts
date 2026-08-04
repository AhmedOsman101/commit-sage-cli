import type { CommitFormat, CommitLanguage } from "@/lib/types/commit.ts";

// Configuration for the general section
const DIFF_STRATEGIES = ["staged", "unstaged", "auto"] as const;
type DiffStrategy = (typeof DIFF_STRATEGIES)[number];

type GeneralConfig = {
  maxRetries: number;
  initialRetryDelayMs: number;
  temperature: number;
  maxInputChars: number;
  diffStrategy: DiffStrategy;
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
const BODY_STYLES = [
  "subject-only",
  "subject-body",
  "subject-body-footer",
] as const;
type BodyStyles = (typeof BODY_STYLES)[number];

type CommitConfig = {
  autoCommit: boolean;
  autoPush: boolean;
  commitFormat: CommitFormat;
  onlyStagedChanges: boolean;
  commitLanguage: CommitLanguage;
  promptForRefs: boolean;
  maxSubjectLength: number;
  bodyStyle: BodyStyles;
};

const SUPPORTED_REASONING_LEVELS = [
  "off",
  "default",
  "low",
  "medium",
  "high",
  "xhigh",
  "ultra",
] as const;

type ProviderReasoning = (typeof SUPPORTED_REASONING_LEVELS)[number];

const SUPPORTED_PROVIDERS = [
  "gemini",
  "openai",
  "anthropic",
  "deepseek",
  "mistral",
  "xai",
  "ollama",
  "moonshotai",
  "zai",
  "minimax",
  "openrouter",
] as const;

// Supported AI provider types
type ProviderType = (typeof SUPPORTED_PROVIDERS)[number];

// Configuration for the provider selection
type ProviderConfig = {
  type: ProviderType;
  model: string;
  timeoutMs: number;
  reasoning: ProviderReasoning;
};

// Main configuration type combining all sub-types
type Config = {
  readonly $schema: "https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/refs/heads/main/config.schema.json";
  general: GeneralConfig;
  ollama: OllamaConfig;
  openrouter: OpenRouterConfig;
  openai: OpenaiConfig;
  commit: CommitConfig;
  provider: ProviderConfig;
};

type ApiService =
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

type ConfigSection = keyof Config;
type ConfigKey<T extends ConfigSection> = keyof Config[T];
type ConfigValue<
  T extends ConfigSection,
  G extends ConfigKey<T>,
> = Config[T][G];

export type {
  ApiService,
  BodyStyles,
  Config,
  ConfigKey,
  ConfigSection,
  ConfigValue,
  DiffStrategy,
  ProviderReasoning,
  ProviderType,
};

export {
  BODY_STYLES,
  DIFF_STRATEGIES,
  SUPPORTED_PROVIDERS,
  SUPPORTED_REASONING_LEVELS,
};
