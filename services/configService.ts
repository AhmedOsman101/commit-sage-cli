/** biome-ignore-all lint/nursery/noAwaitInLoop: <explanation> */

import { Secret } from "@cliffy/prompt/secret";
import KeyValidationService from "../lib/apiKeyValidator.ts";
import type {
  ApiService,
  Config,
  ConfigKey,
  ConfigSection,
  ConfigValue,
} from "../lib/configServiceTypes.d.ts";
import { configPath, defaultConfig } from "../lib/constants.ts";
import { logError, logInfo } from "../lib/Logger.ts";
import { Err, Ok, type Result, Text2Err } from "../lib/result.ts";
import { AiServiceError, ConfigurationError } from "../models/errors.ts";
import FileSystemService from "./fileSystemService.ts";

const infoMessage = (service: ApiService, shell: string) => {
  // Map shell to common config files, with a fallback
  const shellConfigMap: Record<string, string> = {
    bash: "~/.bashrc or ~/.bash_profile",
    zsh: "~/.zshrc",
    fish: "~/.config/fish/config.fish",
  };
  const configFile = shellConfigMap[shell.toLowerCase()] || `${shell} config`;

  return `
To set the ${service} API key for future use, add the following line to your ${configFile} file:
  export ${service.toUpperCase()}_API_KEY="your_api_key"
Replace "your_api_key" with your actual API key.
After adding the line, restart your terminal or run 'source ${configFile}' to apply the changes.`;
};

const ConfigService = {
  shell: "",
  async createConfigFile(): Promise<Result<null>> {
    const { ok: file, error: createFileError } =
      await FileSystemService.createFile(configPath);

    if (createFileError !== undefined) return Err(createFileError);

    const { error: writeFileError } = await FileSystemService.writeFile(
      configPath,
      JSON.stringify(defaultConfig, null, 2),
      file
    );
    file.close();

    if (writeFileError !== undefined) return Err(writeFileError);

    return Ok(null);
  },
  async load(): Promise<Result<Config>> {
    let checked = false;
    while (true) {
      const { ok: configFile, error } =
        await FileSystemService.readFile(configPath);

      if (error !== undefined) {
        if (checked) break;
        const { error: createConfigError } = await this.createConfigFile();
        if (createConfigError !== undefined) return Err(createConfigError);
        checked = true;
        continue;
      }

      if (configFile === null) {
        return Text2Err("Config file is null after successful read");
      }
      return Ok(JSON.parse(configFile) as Config);
    }

    return Text2Err("Cannot create config file");
  },
  async get<T extends ConfigSection, G extends ConfigKey<T>>(
    section: T,
    key: G
  ): Promise<Awaited<Result<ConfigValue<T, G>>>> {
    const { ok: config, error } = await this.load();
    if (error !== undefined) return Err(error);

    const value = config[section][key] ?? defaultConfig[section][key];

    return Ok(value);
  },
  async set<T extends ConfigSection, G extends ConfigKey<T>>(
    section: T,
    key: G,
    value: ConfigValue<T, G>
  ): Promise<Result<boolean>> {
    const { ok: config, error: configError } = await this.load();
    if (configError !== undefined) return Err(configError);

    config[section][key] = value;

    const { ok: didWrite, error: writeError } =
      await FileSystemService.writeFile(configPath, JSON.stringify(config));

    if (writeError !== undefined) return Err(writeError);

    return Ok(didWrite);
  },
  async getApiKey(service: ApiService): Promise<string> {
    try {
      if (!this.shell) {
        const parts = Deno.env.get("SHELL")?.split("/") || ["bash"];
        this.shell = parts[parts.length - 1];
      }
      const key =
        Deno.env.get(`${service.toUpperCase()}_API_KEY`) ||
        (await this.promptForApiKey(service));

      if (key) {
        this.setApiKey(service, key);
      } else {
        throw new ConfigurationError(`${service} API key input was cancelled`);
      }

      return key;
    } catch (error) {
      void logError("Error getting API key:", (error as Error).message);
      throw new AiServiceError(
        `Failed to get API key: ${(error as Error).message}`
      );
    }
  },
  async promptForApiKey(service: ApiService): Promise<string> {
    const key: string = await Secret.prompt({
      message: `Enter your ${service} API Key:`,
      label: "API Key",
      prefix: "",
      minLength: 32,
    });

    const { error: validationErr } = KeyValidationService.baseValidation(key);

    if (validationErr !== undefined)
      throw new ConfigurationError(validationErr.message);

    logInfo(
      `${service} API key has been successfully validated and saved for this session`
    );
    logInfo(infoMessage(service, this.shell));

    return key;
  },
  setApiKey(service: ApiService, key: string): void {
    try {
      switch (service) {
        case "Codestral": {
          const { error } = KeyValidationService.validateCodestralApiKey(key);
          if (error !== undefined) throw new AiServiceError(error.message);
          break;
        }
        case "Gemini": {
          const { error } = KeyValidationService.validateGeminiApiKey(key);

          if (error !== undefined) throw new AiServiceError(error.message);
          break;
        }
        case "OpenAI": {
          const { error } = KeyValidationService.validateOpenAIApiKey(key);
          if (error !== undefined) throw new AiServiceError(error.message);
          break;
        }
      }
    } catch (error) {
      void logError(
        "Failed to validate and set API key:",
        (error as Error).message
      );
      throw error;
    }
  },
};

export default ConfigService;
