import type { CommitFormat, CommitLanguage } from "@/lib/types/commit.ts";

const DIFF_STRATEGIES = ["staged", "unstaged", "auto"] as const;
type DiffStrategy = (typeof DIFF_STRATEGIES)[number];

type GenerationConfig = {
  maxRetries: number;
  retryDelay: number;
  temperature: number;
  maxPromptTokens: number;
  diffStrategy: DiffStrategy;
};

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
  maxLength: number;
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
  "openai",
  "anthropic",
  "gemini",
  "9router",
  "ollama",
  "openrouter",
  "mistral",
  "xai",
  "deepseek",
  "moonshotai",
  "zai",
  "minimax",
] as const;

type KnownProvider = (typeof SUPPORTED_PROVIDERS)[number];
type ProviderName = KnownProvider | (string & {});

type ProviderType = KnownProvider;

const SUPPORTED_API_TYPES = [
  "openai-chat",
  "openai-responses",
  "anthropic",
] as const;
type ApiType = (typeof SUPPORTED_API_TYPES)[number];

type ModelPreset = {
  name?: string;
  reasoning?: boolean | ProviderReasoning;
  contextWindow?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  temperature?: number;
};

type ProviderDefaults = {
  timeoutMs: number;
  reasoning: boolean | ProviderReasoning;
  apiType: ApiType;
  contextWindow?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
};

type ProviderEntry = {
  baseUrl?: string;
  apiKey?: string;
  apiType?: ApiType;
  timeoutMs?: number;
  reasoning?: boolean | ProviderReasoning;
  contextWindow?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  models?: Record<string, ModelPreset>;
};

type ProvidersConfig = {
  defaults: ProviderDefaults;
} & Record<string, ProviderEntry>;

type Config = {
  readonly $schema: "https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/refs/heads/main/config.schema.json";
  model: string;
  generation: GenerationConfig;
  providers: ProvidersConfig;
  commit: CommitConfig;
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
type ConfigKey<T extends ConfigSection> = T extends "model"
  ? never
  : keyof Config[T];
type ConfigValue<
  T extends ConfigSection,
  G extends ConfigKey<T>,
> = T extends "model" ? never : Config[T][G];

export type {
  ApiService,
  ApiType,
  BodyStyles,
  Config,
  ConfigKey,
  ConfigSection,
  ConfigValue,
  DiffStrategy,
  GenerationConfig,
  KnownProvider,
  ModelPreset,
  ProviderDefaults,
  ProviderEntry,
  ProviderName,
  ProviderReasoning,
  ProvidersConfig,
  ProviderType,
};

export {
  BODY_STYLES,
  DIFF_STRATEGIES,
  SUPPORTED_API_TYPES,
  SUPPORTED_PROVIDERS,
  SUPPORTED_REASONING_LEVELS,
};
