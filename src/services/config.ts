import { basename } from "node:path";
import { Secret } from "@cliffy/prompt/secret";
import { Err, ErrFromText, Ok, type Result } from "lib-result";
import { CONFIG_PATH, DEFAULT_CONFIG, OS } from "@/lib/constants.ts";
import { AiServiceError, ConfigurationError } from "@/lib/errors.ts";
import { Log } from "@/lib/logger.ts";
import { splitProviderModel } from "@/lib/modelString.ts";
import type { ApiService, Config, ProviderType } from "@/lib/types/config.ts";
import { JsonParse, JsonStringify } from "@/lib/utils.ts";
import KeyValidationService from "@/services/apiKeyValidation.ts";
import ConfigValidationService from "@/services/configValidation.ts";
import FileSystemService from "@/services/fileSystem.ts";

class ConfigService {
  protected static shell = "";

  protected static migrateSectionDefaults(
    section: Record<string, unknown>,
    defaults: Record<string, unknown>
  ): boolean {
    let changed = false;

    for (const [key, value] of Object.entries(defaults)) {
      if (!(key in section)) {
        section[key] = value;
        changed = true;
      }
    }

    return changed;
  }

  static migrateConfig(config: Record<string, unknown>): Result<boolean> {
    const warnings: string[] = [];
    let changed = false;

    // 0. $schema
    if (!("$schema" in config)) {
      config.$schema = DEFAULT_CONFIG.$schema as string;
      changed = true;
    }

    // 1. general → generation
    if ("general" in config) {
      const general = config.general as Record<string, unknown> | undefined;
      if (general && typeof general === "object") {
        const generation = (config.generation as Record<string, unknown>) ?? {};
        if ("maxRetries" in general) generation.maxRetries = general.maxRetries;
        if ("initialRetryDelayMs" in general)
          generation.retryDelay = general.initialRetryDelayMs;
        if ("temperature" in general)
          generation.temperature = general.temperature;
        if ("maxInputChars" in general)
          generation.maxPromptTokens = general.maxInputChars;
        if ("diffStrategy" in general)
          generation.diffStrategy = general.diffStrategy;
        // also copy already-renamed keys if present in general for safety
        if ("retryDelay" in general) generation.retryDelay = general.retryDelay;
        if ("maxPromptTokens" in general)
          generation.maxPromptTokens = general.maxPromptTokens;
        config.generation = generation;
        warnings.push("Migrated general→generation");
        changed = true;
      }
      delete config.general;
      changed = true;
    }

    // Handle generation renames if generation already existed with old keys
    if (
      "generation" in config &&
      typeof config.generation === "object" &&
      config.generation !== null
    ) {
      const gen = config.generation as Record<string, unknown>;
      if ("initialRetryDelayMs" in gen) {
        gen.retryDelay = gen.initialRetryDelayMs;
        delete gen.initialRetryDelayMs;
        warnings.push(
          "Migrated generation.initialRetryDelayMs→generation.retryDelay"
        );
        changed = true;
      }
      if ("maxInputChars" in gen) {
        gen.maxPromptTokens = gen.maxInputChars;
        delete gen.maxInputChars;
        warnings.push(
          "Migrated generation.maxInputChars→generation.maxPromptTokens"
        );
        changed = true;
      }
    }

    // 2. provider.type+model → model (first-slash split)
    const hasProvider = "provider" in config;
    if (hasProvider) {
      const provider = config.provider as Record<string, unknown> | undefined;
      if (provider && typeof provider === "object") {
        const hasType = "type" in provider;
        const hasModel = "model" in provider;

        const modelMap: Record<ProviderType, string> = {
          gemini: "gemini-2.5-flash-lite",
          openai: "gpt-5-nano",
          anthropic: "claude-sonnet-4-5",
          deepseek: "deepseek-chat",
          mistral: "mistral-small-latest",
          xai: "grok-3-mini",
          ollama: "llama3.2",
          moonshotai: "kimi-k2.5",
          zai: "glm-4.5-flash",
          minimax: "MiniMax-M2.5",
          openrouter: "openai/gpt-4.1-mini",
          "9router": "kc/stealth/ox-alpha",
        } as Record<ProviderType, string>;

        if (hasType && hasModel) {
          const t = provider.type as string;
          const m = provider.model as string;
          if (!t || !m) {
            return ErrFromText(
              `Invalid model "${t}/${m}": expected "provider/model"`
            );
          }
          config.model = `${t}/${m}`;
          warnings.push(`Migrated provider.type+model→model ("${t}/${m}")`);
          changed = true;
        } else if (hasType && !hasModel) {
          const oldType = provider.type as ProviderType;
          const newModel = modelMap[oldType] || "gemini-2.5-flash-lite";
          config.model = `${oldType}/${newModel}`;
          warnings.push(
            `Migrated provider.type→model ("${oldType}/${newModel}") — added default model`
          );
          changed = true;
        } else if (!hasType && hasModel) {
          const model = provider.model as string;
          return ErrFromText(
            `Config migration requires provider.type to be set explicitly for model "${model}"`
          );
        }
      }
    }

    // Ensure providers + defaults exist for upcoming moves
    if (
      !("providers" in config) ||
      typeof config.providers !== "object" ||
      config.providers === null
    ) {
      config.providers = {};
      changed = true;
    }
    const providers = config.providers as Record<string, unknown>;
    if (
      !("defaults" in providers) ||
      typeof providers.defaults !== "object" ||
      providers.defaults === null
    ) {
      providers.defaults = {};
      changed = true;
    }
    const defaults = providers.defaults as Record<string, unknown>;

    // Move provider.timeoutMs / reasoning → providers.defaults
    if (hasProvider) {
      const provider = config.provider as Record<string, unknown> | undefined;
      if (provider && typeof provider === "object") {
        if ("timeoutMs" in provider && !("timeoutMs" in defaults)) {
          defaults.timeoutMs = provider.timeoutMs;
          warnings.push(
            "Migrated provider.timeoutMs→providers.defaults.timeoutMs"
          );
          changed = true;
        }
        if ("reasoning" in provider && !("reasoning" in defaults)) {
          defaults.reasoning = provider.reasoning;
          warnings.push(
            "Migrated provider.reasoning→providers.defaults.reasoning"
          );
          changed = true;
        }
        // finally delete provider
        delete config.provider;
        changed = true;
      }
    }

    // 3. Ensure model exists and is valid; fail only on empty/invalid
    if (
      !("model" in config) ||
      typeof config.model !== "string" ||
      (config.model as string).trim() === ""
    ) {
      if (!("model" in config)) {
        config.model = DEFAULT_CONFIG.model;
        warnings.push(`Set default model→${DEFAULT_CONFIG.model}`);
        changed = true;
      } else {
        return ErrFromText(
          `Invalid model "${config.model}": expected "provider/model"`
        );
      }
    } else {
      const modelStr = config.model as string;
      const split = splitProviderModel(modelStr);
      if (split.isError()) {
        return Err(split.error);
      }
    }

    // 4. ollama/openai/openrouter → providers.<name>
    const providerMoves: Array<{ oldKey: string; newKey: string }> = [
      { oldKey: "ollama", newKey: "ollama" },
      { oldKey: "openrouter", newKey: "openrouter" },
      { oldKey: "openai", newKey: "openai" },
    ];
    for (const { oldKey, newKey } of providerMoves) {
      if (oldKey in config) {
        const oldVal = config[oldKey] as Record<string, unknown> | undefined;
        if (oldVal && typeof oldVal === "object") {
          const target = (providers[newKey] as Record<string, unknown>) ?? {};
          if ("baseUrl" in oldVal) {
            target.baseUrl = oldVal.baseUrl;
            warnings.push(
              `Moved ${oldKey}.baseUrl→providers.${newKey}.baseUrl`
            );
            changed = true;
          }
          if (oldKey === "openai") {
            if ("apiKeyEnvVar" in oldVal) {
              const envVar = oldVal.apiKeyEnvVar as string;
              if (typeof envVar === "string" && envVar) {
                target.apiKey = `$${envVar}`;
                warnings.push(
                  `Migrated openai.apiKeyEnvVar→providers.openai.apiKey ($${envVar})`
                );
                changed = true;
              }
            }
            if ("useChatCompletions" in oldVal) {
              const b = oldVal.useChatCompletions as boolean;
              target.apiType = b ? "openai-chat" : "openai-responses";
              warnings.push(
                `Migrated openai.useChatCompletions→providers.openai.apiType (${target.apiType})`
              );
              changed = true;
            }
            if ("apiKey" in oldVal && !("apiKey" in target)) {
              target.apiKey = oldVal.apiKey;
              warnings.push(
                `Moved ${oldKey}.apiKey→providers.${newKey}.apiKey`
              );
              changed = true;
            }
            if ("apiType" in oldVal && !("apiType" in target)) {
              target.apiType = oldVal.apiType;
              changed = true;
            }
            if ("baseUrl" in oldVal && !target.baseUrl) {
              // already handled
            }
          }
          // if target got any key, keep it; also handle generic fallback for any other keys
          if (Object.keys(target).length > 0) {
            providers[newKey] = target;
          } else if (Object.keys(oldVal).length > 0) {
            // preserve empty? still set
            providers[newKey] = target;
          }
        }
        delete config[oldKey];
        changed = true;
      }
    }

    // 5. commit.maxSubjectLength → commit.maxLength
    if (
      "commit" in config &&
      typeof config.commit === "object" &&
      config.commit !== null
    ) {
      const commit = config.commit as Record<string, unknown>;
      if ("maxSubjectLength" in commit) {
        commit.maxLength = commit.maxSubjectLength;
        delete commit.maxSubjectLength;
        warnings.push("Migrated commit.maxSubjectLength→commit.maxLength");
        changed = true;
      }
    }

    // 6. Fill defaults for missing sections
    if (
      !("generation" in config) ||
      typeof config.generation !== "object" ||
      config.generation === null
    ) {
      config.generation = {};
      changed = true;
    }
    const generation = config.generation as Record<string, unknown>;
    changed =
      ConfigService.migrateSectionDefaults(
        generation,
        DEFAULT_CONFIG.generation as unknown as Record<string, unknown>
      ) || changed;

    if (
      !("commit" in config) ||
      typeof config.commit !== "object" ||
      config.commit === null
    ) {
      config.commit = {};
      changed = true;
    }
    const commit = config.commit as Record<string, unknown>;
    changed =
      ConfigService.migrateSectionDefaults(
        commit,
        DEFAULT_CONFIG.commit as unknown as Record<string, unknown>
      ) || changed;

    changed =
      ConfigService.migrateSectionDefaults(
        defaults,
        (DEFAULT_CONFIG.providers as unknown as Record<string, unknown>)
          .defaults as Record<string, unknown>
      ) || changed;

    if (warnings.length > 0) {
      Log.warning(warnings.join("\n"));
      Log.info("Config migrated — review with: commit-sage config list");
    }

    return Ok(changed);
  }

  static async createConfigFile(): Promise<Result<boolean>> {
    const { ok: file, error: creationError } =
      await FileSystemService.createFile(CONFIG_PATH);

    if (creationError !== undefined) return Err(creationError);

    const writeResult = await FileSystemService.writeFile(
      CONFIG_PATH,
      JSON.stringify(DEFAULT_CONFIG, null, 2),
      file
    );
    file.close();

    if (writeResult.isError()) return Err(writeResult.error);

    return Ok(true);
  }

  static async load(): Promise<Result<Config>> {
    let checked = false;
    while (true) {
      const readResult = await FileSystemService.readFile(CONFIG_PATH);

      if (readResult.isError()) {
        if (checked) break;
        const createConfigResult = await ConfigService.createConfigFile();
        if (createConfigResult.isError()) return Err(createConfigResult.error);
        checked = true;
        continue;
      }
      const configContents = readResult.ok;

      if (!configContents) {
        return ErrFromText("Config file is empty after successful read");
      }

      const parsedConfig = JsonParse(configContents);
      if (parsedConfig.isError()) return Err(parsedConfig.error);

      const migrationResult = ConfigService.migrateConfig(
        parsedConfig.ok as Record<string, unknown>
      );
      if (migrationResult.isError()) return Err(migrationResult.error);

      if (migrationResult.ok) {
        const stringifyResult = JsonStringify(parsedConfig.ok, null, 2);
        if (stringifyResult.isError()) return Err(stringifyResult.error);

        const writeResult = await FileSystemService.writeFile(
          CONFIG_PATH,
          stringifyResult.ok
        );
        if (writeResult.isError()) return Err(writeResult.error);
      }

      const migratedConfig = parsedConfig.ok;

      const validation = ConfigValidationService.validate(migratedConfig);
      if (validation.isError()) {
        throw Log.error(validation.error.message).exit();
      }
      return Ok(validation.ok);
    }

    return ErrFromText("Cannot create config file");
  }

  static async get(section: string, key?: string): Promise<Result<unknown>> {
    const configResult = await ConfigService.load();
    if (configResult.isError()) return Err(configResult.error);

    const cfg = configResult.ok as unknown as Record<string, unknown>;

    // model special case: no key or empty
    if (section === "model") {
      const value =
        (cfg.model as string) ??
        (DEFAULT_CONFIG as unknown as Record<string, unknown>).model;
      return Ok(value as unknown);
    }

    // legacy fallbacks: openai/ollama/openrouter -> providers
    if (
      (section === "openai" ||
        section === "ollama" ||
        section === "openrouter") &&
      key
    ) {
      const providers = cfg.providers as Record<string, unknown> | undefined;
      const entry = providers?.[section] as Record<string, unknown> | undefined;
      const value =
        entry?.[key] ??
        (
          DEFAULT_CONFIG.providers as unknown as Record<
            string,
            Record<string, unknown>
          >
        )[section]?.[key];
      return Ok(value as unknown);
    }
    if (section === "provider" && key) {
      if (key === "type" || key === "model") {
        const modelStr =
          (cfg.model as string) ??
          ((DEFAULT_CONFIG as unknown as Record<string, unknown>)
            .model as string);
        const split = splitProviderModel(modelStr);
        if (split.isError()) return Err(split.error);
        return Ok(
          (key === "type" ? split.ok.provider : split.ok.model) as unknown
        );
      }
      if (key === "timeoutMs" || key === "reasoning") {
        const defaults = (cfg.providers as Record<string, unknown>)?.defaults as
          | Record<string, unknown>
          | undefined;
        const value =
          defaults?.[key] ??
          (
            DEFAULT_CONFIG.providers as unknown as Record<
              string,
              Record<string, unknown>
            >
          ).defaults?.[key];
        return Ok(value as unknown);
      }
    }
    if (section === "general" && key) {
      // map old general keys to generation
      const map: Record<string, string> = {
        maxRetries: "maxRetries",
        initialRetryDelayMs: "retryDelay",
        retryDelay: "retryDelay",
        temperature: "temperature",
        maxInputChars: "maxPromptTokens",
        maxPromptTokens: "maxPromptTokens",
        diffStrategy: "diffStrategy",
      };
      const newKey = map[key] ?? key;
      const generation = cfg.generation as Record<string, unknown> | undefined;
      const value =
        generation?.[newKey] ??
        (DEFAULT_CONFIG.generation as unknown as Record<string, unknown>)[
          newKey
        ];
      return Ok(value as unknown);
    }

    const sectionValue = cfg[section];
    if (key) {
      if (
        sectionValue &&
        typeof sectionValue === "object" &&
        key in (sectionValue as Record<string, unknown>)
      ) {
        return Ok((sectionValue as Record<string, unknown>)[key] as unknown);
      }
      const defaultsSection = (
        DEFAULT_CONFIG as unknown as Record<string, Record<string, unknown>>
      )[section];
      const fallback = defaultsSection?.[key];
      return Ok(fallback as unknown);
    }
    return Ok(sectionValue as unknown);
  }

  static async set(
    section: string,
    keyOrValue: string | unknown,
    maybeValue?: unknown
  ): Promise<Result<boolean>> {
    const configResult = await ConfigService.load();
    if (configResult.isError()) return Err(configResult.error);
    const config = configResult.ok as unknown as Record<string, unknown>;

    let key: string | undefined;
    let value: unknown;
    // overload detection: set("model", value) vs set(section,key,value)
    if (maybeValue === undefined) {
      // called as set("model", value)
      if (section === "model") {
        config.model = keyOrValue as string;
      } else {
        return ErrFromText(`Invalid set call for section "${section}"`);
      }
    } else {
      key = keyOrValue as string;
      value = maybeValue;

      // handle legacy provider/general keys via mapping
      if (section === "provider") {
        // map to model or providers.defaults
        if (key === "type" || key === "model") {
          const currentModel =
            (config.model as string) ?? (DEFAULT_CONFIG.model as string);
          const split = splitProviderModel(currentModel);
          let providerPart: string;
          let modelPart: string;
          if (split.isOk()) {
            providerPart = split.ok.provider;
            modelPart = split.ok.model;
          } else {
            providerPart = "openai";
            modelPart = "gpt-5-nano";
          }
          if (key === "type") providerPart = value as string;
          else modelPart = value as string;
          config.model = `${providerPart}/${modelPart}`;
        } else if (key === "timeoutMs" || key === "reasoning") {
          const providers = config.providers as Record<string, unknown>;
          if (!providers.defaults) providers.defaults = {};
          (providers.defaults as Record<string, unknown>)[key] = value;
        } else {
          return ErrFromText(`Unknown provider key "${key}"`);
        }
      } else if (section === "general") {
        const map: Record<string, string> = {
          maxRetries: "maxRetries",
          initialRetryDelayMs: "retryDelay",
          retryDelay: "retryDelay",
          temperature: "temperature",
          maxInputChars: "maxPromptTokens",
          maxPromptTokens: "maxPromptTokens",
          diffStrategy: "diffStrategy",
        };
        const newKey = map[key] ?? key;
        if (!config.generation) config.generation = {};
        (config.generation as Record<string, unknown>)[newKey] = value;
      } else if (
        section === "openai" ||
        section === "ollama" ||
        section === "openrouter"
      ) {
        const providers = config.providers as Record<string, unknown>;
        if (!providers[section]) providers[section] = {};
        const entry = providers[section] as Record<string, unknown>;
        // map old openai keys
        if (section === "openai" && key === "apiKeyEnvVar") {
          entry.apiKey = `$${value as string}`;
        } else if (section === "openai" && key === "useChatCompletions") {
          entry.apiType = (value as boolean)
            ? "openai-chat"
            : "openai-responses";
        } else {
          entry[key] = value;
        }
      } else if (section === "commit" && key === "maxSubjectLength") {
        if (!config.commit) config.commit = {};
        (config.commit as Record<string, unknown>).maxLength = value;
      } else {
        // normal generation / commit / providers
        if (section === "providers") {
          // key is provider name? but this overload not expected; handle via direct?
          (config as Record<string, unknown>)[section] = value;
        } else {
          if (!config[section] || typeof config[section] !== "object")
            config[section] = {};
          (config[section] as Record<string, unknown>)[key] = value;
        }
      }
    }

    const validation = ConfigValidationService.validate(config);
    if (validation.isError()) throw Log.error(validation.error.message).exit();

    const stringifyResult = JsonStringify(config, null, 2);
    if (stringifyResult.isError()) {
      return Err(stringifyResult.error);
    }

    const writeResult = await FileSystemService.writeFile(
      CONFIG_PATH,
      stringifyResult.ok
    );

    if (writeResult.isError()) return Err(writeResult.error);

    return Ok(true);
  }

  static async getApiKey(service: ApiService): Promise<string> {
    try {
      if (!ConfigService.shell) {
        ConfigService.shell = basename(Deno.env.get("SHELL") ?? "bash");
      }
      const envVarName = await ConfigService.getApiKeyEnvVar(service);
      const key =
        Deno.env.get(envVarName) ??
        (await ConfigService.promptForApiKey(service));

      if (key) ConfigService.validateApiKey(service, key);
      else {
        throw new ConfigurationError(`${service} API key input was cancelled`);
      }

      return key;
    } catch (error) {
      throw Log.error(
        new AiServiceError(`Failed to get API key: ${(error as Error).message}`)
          .message
      ).exit();
    }
  }

  protected static getShell() {
    if (!ConfigService.shell) {
      const shellPath = Deno.env.get("SHELL");
      if (shellPath) ConfigService.shell = basename(shellPath);
      else
        switch (OS) {
          case "windows":
            ConfigService.shell = "powershell";
            break;
          case "linux":
            ConfigService.shell = "sh";
            break;
          case "darwin": // macOS
            ConfigService.shell = "bash";
            break;
        }
    }
    return ConfigService.shell.toLowerCase();
  }

  protected static infoMessage(service: ApiService) {
    // Map shell to common config files, with a fallback
    const shellConfigMap: Record<string, string> = {
      bash: "~/.bashrc or ~/.bash_profile",
      zsh: "~/.zshrc",
      fish: "~/.config/fish/config.fish",
    };
    const shellConfigFile =
      shellConfigMap[ConfigService.getShell()] ||
      `${ConfigService.getShell()} config`;

    const defaultEnvVarName = `${service.toUpperCase()}_API_KEY`;

    return `
To set the ${service} API key for future use, add the following line to your ${shellConfigFile} file:
  export ${defaultEnvVarName}="your_api_key"
Replace "your_api_key" with your actual API key.
After adding the line, restart your terminal or run 'source ${shellConfigFile}' to apply the changes.`;
  }

  protected static async getApiKeyEnvVar(service: ApiService): Promise<string> {
    if (service !== "OpenAI") {
      return `${service.toUpperCase()}_API_KEY`;
    }

    // Try new providers.openai.apiKey first (if $ENV, return env var name)
    try {
      const cfg = await ConfigService.load();
      if (cfg.isOk()) {
        const providers = (cfg.ok as unknown as Record<string, unknown>)
          .providers as Record<string, unknown> | undefined;
        const openai = providers?.openai as Record<string, unknown> | undefined;
        const apiKey = openai?.apiKey as string | undefined;
        if (typeof apiKey === "string" && apiKey.startsWith("$")) {
          return apiKey.slice(1);
        }
        if (typeof apiKey === "string" && apiKey && !apiKey.startsWith("$")) {
          // literal key, not env var — fallback to default env var name
          return `${service.toUpperCase()}_API_KEY`;
        }
      }
    } catch {
      // ignore
    }

    return `${service.toUpperCase()}_API_KEY`;
  }

  protected static async getApiKeyInfoMessage(
    service: ApiService
  ): Promise<string> {
    if (service !== "OpenAI") {
      return ConfigService.infoMessage(service);
    }

    const envVarName = await ConfigService.getApiKeyEnvVar(service);

    return ConfigService.infoMessage(service).replace(
      `${service.toUpperCase()}_API_KEY`,
      envVarName
    );
  }

  protected static async promptForApiKey(service: ApiService): Promise<string> {
    const key: string = await Secret.prompt({
      message: `Enter your ${service} API Key:`,
      label: "API Key",
      prefix: "",
    });

    const validation = KeyValidationService.baseValidation(key);

    if (validation.isError()) {
      throw new ConfigurationError(validation.error.message, {
        cause: validation.error,
      });
    }

    Log.success(`${service} API key has been set for this run`);
    Log.info(await ConfigService.getApiKeyInfoMessage(service));

    return key;
  }

  static validateApiKey(service: ApiService, key: string): void {
    try {
      switch (service) {
        case "Gemini": {
          const { error } = KeyValidationService.validateGeminiApiKey(key);
          if (error !== undefined) {
            throw new AiServiceError(error.message, { cause: error });
          }
          break;
        }
        case "OpenRouter": {
          const { error } = KeyValidationService.validateOpenRouterApiKey(key);
          if (error !== undefined) {
            throw new AiServiceError(error.message, { cause: error });
          }
          break;
        }
        default: {
          const validation = KeyValidationService.baseValidation(key);

          if (validation.isError()) {
            throw new AiServiceError(validation.error.message, {
              cause: validation.error,
            });
          }
        }
      }
    } catch (error) {
      throw Log.error(
        "Failed to validate and set API key:",
        (error as Error).message
      ).exit();
    }
  }
}

export default ConfigService;
