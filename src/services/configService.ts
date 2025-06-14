/** biome-ignore-all lint/nursery/noAwaitInLoop: intended */

import { basename } from "node:path";
import { Secret } from "@cliffy/prompt/secret";
import { Err, ErrFromText, isErr, Ok, type Result } from "lib-result";
import type {
  ApiService,
  Config,
  ConfigKey,
  ConfigSection,
  ConfigValue,
} from "../lib/configServiceTypes.d.ts";
import { CONFIG_PATH, DEFAULT_CONFIG } from "../lib/constants.ts";
import { logError, logInfo, logSuccess } from "../lib/logger.ts";
import { AiServiceError, ConfigurationError } from "../models/errors.ts";
import ConfigValidationService from "./configValidationService.ts";
import FileSystemService from "./fileSystemService.ts";
import KeyValidationService from "./keyValidationService.ts";

class ConfigService {
  protected static shell = "";

  static async createConfigFile(): Promise<Result<null>> {
    const { ok: file, error: createFileError } =
      await FileSystemService.createFile(CONFIG_PATH);

    if (createFileError !== undefined) return Err(createFileError);

    const { error: writeFileError } = await FileSystemService.writeFile(
      CONFIG_PATH,
      JSON.stringify(DEFAULT_CONFIG, null, 2),
      file
    );
    file.close();

    if (writeFileError !== undefined) return Err(writeFileError);

    return Ok(null);
  }

  static async load(): Promise<Result<Config>> {
    let checked = false;
    while (true) {
      const { ok: configFile, error } =
        await FileSystemService.readFile(CONFIG_PATH);

      if (error !== undefined) {
        if (checked) break;
        const { error: createConfigError } =
          await ConfigService.createConfigFile();
        if (createConfigError !== undefined) return Err(createConfigError);
        checked = true;
        continue;
      }

      if (configFile === null) {
        return ErrFromText("Config file is null after successful read");
      }

      const validation = ConfigValidationService.validate(configFile);
      if (isErr(validation)) logError(validation.error.message);

      return Ok(validation.ok);
    }

    return ErrFromText("Cannot create config file");
  }

  static async get<T extends ConfigSection, G extends ConfigKey<T>>(
    section: T,
    key: G
  ): Promise<Awaited<Result<ConfigValue<T, G>>>> {
    const { ok: config, error } = await ConfigService.load();
    if (error !== undefined) return Err(error);

    const value = config[section][key] ?? DEFAULT_CONFIG[section][key];

    return Ok(value);
  }

  static async set<T extends ConfigSection, G extends ConfigKey<T>>(
    section: T,
    key: G,
    value: ConfigValue<T, G>
  ): Promise<Result<boolean>> {
    const { ok: config, error: configError } = await ConfigService.load();
    if (configError !== undefined) return Err(configError);

    config[section][key] = value;

    const validation = ConfigValidationService.validate(config);
    if (isErr(validation)) logError(validation.error.message);

    const writeResult = await FileSystemService.writeFile(
      CONFIG_PATH,
      JSON.stringify(config)
    );

    if (isErr(writeResult)) return Err(writeResult.error);

    return Ok(true);
  }

  static async getApiKey(service: ApiService): Promise<string> {
    try {
      if (!ConfigService.shell) {
        ConfigService.shell = basename(Deno.env.get("SHELL") ?? "bash");
      }
      const key =
        Deno.env.get(`${service.toUpperCase()}_API_KEY`) ||
        (await ConfigService.promptForApiKey(service));

      if (key) ConfigService.validateApiKey(service, key);
      else {
        throw new ConfigurationError(`${service} API key input was cancelled`);
      }

      return key;
    } catch (error) {
      logError(
        new AiServiceError(`Failed to get API key: ${(error as Error).message}`)
          .message
      );
    }
  }

  protected static infoMessage(service: ApiService) {
    // Map shell to common config files, with a fallback
    const shellConfigMap: Record<string, string> = {
      bash: "~/.bashrc or ~/.bash_profile",
      zsh: "~/.zshrc",
      fish: "~/.config/fish/config.fish",
    };
    const shellConfigFile =
      shellConfigMap[ConfigService.shell.toLowerCase()] ||
      `${ConfigService.shell} config`;

    return `
To set the ${service} API key for future use, add the following line to your ${shellConfigFile} file:
  export ${service.toUpperCase()}_API_KEY="your_api_key"
Replace "your_api_key" with your actual API key.
After adding the line, restart your terminal or run 'source ${shellConfigFile}' to apply the changes.`;
  }

  protected static async promptForApiKey(service: ApiService): Promise<string> {
    const key: string = await Secret.prompt({
      message: `Enter your ${service} API Key:`,
      label: "API Key",
      prefix: "",
      minLength: 32,
    });

    const { error: validationErr } = KeyValidationService.baseValidation(key);

    if (validationErr !== undefined) {
      throw new ConfigurationError(validationErr.message);
    }

    logSuccess(
      `${service} API key has been successfully validated and saved for this session`
    );
    logInfo(ConfigService.infoMessage(service));

    return key;
  }

  static validateApiKey(service: ApiService, key: string): void {
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
      logError("Failed to validate and set API key:", (error as Error).message);
    }
  }
}

export default ConfigService;
