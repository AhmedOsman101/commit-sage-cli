import type { CommitFormat, CommitLanguage } from "@/lib/types/commit.ts";

const DIFF_STRATEGIES = ["staged", "unstaged", "auto"] as const;
type DiffStrategy = (typeof DIFF_STRATEGIES)[number];

type GenerationConfig = {
  maxRetries: number;
  retryDelay: number;
  /** `null` means "do not send temperature" (reasoning models reject it). */
  temperature: number | null;
  maxPromptTokens: number;
  maxOutputTokens: number;
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
  /** @deprecated Superseded by `commit.refs.*` (ADR 004). Kept for compat; never read. */
  promptForRefs: boolean;
  /** Inline instruction text, or a path to an `.md` file (ADR 005). */
  customInstructions: string;
  /** Issue/ticket refs footer (ADR 004). */
  refs: RefsConfig;
  maxLength: number;
  bodyStyle: BodyStyles;
  recentCommits: RecentCommitsConfig;
};

type GitConfig = {
  timeoutMs: number;
};

const RECENT_COMMITS_SCOPES = ["all", "mine"] as const;
type RecentCommitsScope = (typeof RECENT_COMMITS_SCOPES)[number];

type RecentCommitsConfig = {
  enabled: boolean;
  count: number;
  scope: RecentCommitsScope;
};

const REFS_SOURCES = ["prompt", "branch", "input"] as const;
type RefsSource = (typeof REFS_SOURCES)[number];

const REFS_PLACEMENTS = ["end", "start", "prefix"] as const;
type RefsPlacement = (typeof REFS_PLACEMENTS)[number];

type RefsConfig = {
  enabled: boolean;
  source: RefsSource;
  value: string;
  placement: RefsPlacement;
  branchPattern: string;
};

const SUPPORTED_REASONING_LEVELS = [
  "off",
  "none",
  "default",
  "low",
  "minimal",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
] as const;

type ProviderReasoning = (typeof SUPPORTED_REASONING_LEVELS)[number];

const GEMINI_THINKING_LEVELS = ["minimal", "low", "medium", "high"] as const;
type GeminiThinkingLevel = (typeof GEMINI_THINKING_LEVELS)[number];

const SUPPORTED_PROVIDERS = [
  "openai",
  "anthropic",
  "gemini",
  "ollama",
  "openrouter",
  "mistral",
  "xai",
  "deepseek",
  "moonshotai",
  "zai",
  "minimax",
  "groq",
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
  /** `null` means "do not send temperature" (reasoning models reject it). */
  temperature?: number | null;
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
  /**
   * Escape hatch for gateways: extra headers merged into the client
   * (gateway auth, attribution). Entry-level only — model presets never
   * carry headers. Honored by generic-gateway dispatch; known literals
   * keep their own fixed headers.
   */
  headers?: Record<string, string>;
  /**
   * `false` sends no `Authorization` header even when a key is configured.
   * Defaults to `true`.
   */
  useApiKey?: boolean;
  /**
   * Gemini-only. Thinking token budget for `gemini-2.5*`: `0` disables,
   * `-1` lets the model decide, Pro models floor at 128. Other families
   * ignore it. Defaults to `0`.
   */
  thinkingBudget?: number;
  /**
   * Gemini-only. Thinking depth for `gemini-3*` (`minimal|low|medium|high`,
   * cannot be disabled). Other families ignore it. Defaults to `"low"`.
   */
  thinkingLevel?: GeminiThinkingLevel;
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
  git: GitConfig;
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
  GeminiThinkingLevel,
  GenerationConfig,
  GitConfig,
  KnownProvider,
  ModelPreset,
  ProviderDefaults,
  ProviderEntry,
  ProviderName,
  ProviderReasoning,
  ProvidersConfig,
  ProviderType,
  RecentCommitsConfig,
  RecentCommitsScope,
  RefsConfig,
  RefsPlacement,
  RefsSource,
};

export {
  BODY_STYLES,
  DIFF_STRATEGIES,
  GEMINI_THINKING_LEVELS,
  RECENT_COMMITS_SCOPES,
  REFS_PLACEMENTS,
  REFS_SOURCES,
  SUPPORTED_API_TYPES,
  SUPPORTED_PROVIDERS,
  SUPPORTED_REASONING_LEVELS,
};
