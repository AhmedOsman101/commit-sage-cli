import { scriptDir } from "../main.ts";

type JsonValue = string | number | boolean | Array<JsonValue> | object | null;

// Configuration for the Gemini provider
type GeminiConfig = {
  model:
    | "gemini-2.0-flash-exp"
    | "gemini-1.0-pro"
    | "gemini-1.5-pro"
    | "gemini-1.5-flash";
};

// Configuration for the Ollama provider
type OllamaConfig = {
  model: string;
  baseUrl: "http://localhost:11434" | string;
};

// Configuration for the Codestral provider
type CodestralConfig = {
  model: "codestral-2405" | "codestral-latest";
};

// Configuration for the OpenAI provider
type OpenaiConfig = {
  model: "gpt-3.5-turbo";
  baseUrl: "https://api.openai.com/v1" | string;
};

export type CommitLanguage = "english" | "russian" | "chinese" | "japanese";

// Configuration for commit-related settings
type CommitConfig = {
  autoCommit: boolean; // Literal type inferred, no alternatives specified
  autoPush: boolean; // Literal type inferred, no alternatives specified
  commitFormat: "conventional" | "angular" | "karma" | "emoji" | "semantic";
  onlyStagedChanges: boolean; // Literal type inferred, no alternatives specified
  commitLanguage: CommitLanguage;
  promptForRefs: boolean; // Literal type inferred, no alternatives specified
};

// Configuration for the provider selection
type ProviderConfig = {
  type: "gemini" | "codestral" | "openai" | "ollama";
};

type CacheValue = string | boolean | number;

// Main configuration type combining all sub-types
type Config = {
  gemini: GeminiConfig;
  ollama: OllamaConfig;
  codestral: CodestralConfig;
  openai: OpenaiConfig;
  commit: CommitConfig;
  provider: ProviderConfig;
};

type ConfigSection = keyof Config;
type ConfigKey<T extends ConfigSection> = keyof Config[T];
type ConfigValue<
  T extends ConfigSection,
  G extends ConfigKey<T>,
> = Config[T][G];

const ConfigService = {
  cache: new Map<string, CacheValue>(),
  configPath: `${scriptDir}/config.json`,
  load(): Config {
    const configFile = Deno.readTextFileSync(this.configPath);
    return JSON.parse(configFile) as Config;
  },
  get<T extends ConfigSection>(
    section: T,
    key: ConfigKey<T>,
    defaultValue: JsonValue = null
  ): JsonValue {
    const config = this.load();
    return config[section][key] ?? defaultValue;
  },
  set(key: keyof Config, value: JsonValue): void {
    const config = this.load();
    config[key] = value;

    Deno.writeTextFileSync(this.configPath, JSON.stringify(config));
  },
};

export default ConfigService;
