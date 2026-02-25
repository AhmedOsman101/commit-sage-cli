import { basename } from "node:path";
import { Secret } from "@cliffy/prompt/secret";
import { Err, ErrFromText, Ok, type Result } from "lib-result";
import type {
  ApiService,
  Config,
  ConfigKey,
  ConfigSection,
  ConfigValue,
} from "@/lib/configServiceTypes.d.ts";
import { CONFIG_PATH, DEFAULT_CONFIG, OS } from "@/lib/constants.ts";
import { AiServiceError, ConfigurationError } from "@/lib/errors.ts";
import { logError, logInfo, logSuccess } from "@/lib/logger.ts";
import ConfigValidationService from "./configValidationService.ts";
import FileSystemService from "./fileSystemService.ts";
import KeyValidationService from "./keyValidationService.ts";

class ConfigService {
  protected static shell = "";

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
      const { ok: configContents, error } =
        await FileSystemService.readFile(CONFIG_PATH);

      if (error !== undefined) {
        if (checked) break;
        const createConfigResult = await ConfigService.createConfigFile();
        if (createConfigResult.isError()) return Err(createConfigResult.error);
        checked = true;
        continue;
      }

      if (!configContents) {
        return ErrFromText("Config file is empty after successful read");
      }

      const validation = ConfigValidationService.validate(configContents);
      if (validation.isError()) logError(validation.error.message);

      return Ok(validation.ok);
    }

    return ErrFromText("Cannot create config file");
  }

  static async get<T extends ConfigSection, K extends ConfigKey<T>>(
    section: T,
    key: K
  ): Promise<Result<ConfigValue<T, K>>> {
    const configResult = await ConfigService.load();
    if (configResult.isError()) return Err(configResult.error);

    const value = configResult.ok[section][key] ?? DEFAULT_CONFIG[section][key];

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
    if (validation.isError()) logError(validation.error.message);

    const writeResult = await FileSystemService.writeFile(
      CONFIG_PATH,
      JSON.stringify(config)
    );

    if (writeResult.isError()) return Err(writeResult.error);

    return Ok(true);
  }

  static async getApiKey(service: ApiService): Promise<string> {
    try {
      if (!ConfigService.shell) {
        ConfigService.shell = basename(Deno.env.get("SHELL") ?? "bash");
      }
      const key =
        Deno.env.get(`${service.toUpperCase()}_API_KEY`) ??
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

    const validation = KeyValidationService.baseValidation(key);

    if (validation.isError()) {
      throw new ConfigurationError(validation.error.message, {
        cause: validation.error,
      });
    }

    logSuccess(`${service} API key has been set for this run`);
    logInfo(ConfigService.infoMessage(service));

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
        case "OpenAI": {
          const { error } = KeyValidationService.validateOpenAIApiKey(key);
          if (error !== undefined) {
            throw new AiServiceError(error.message, { cause: error });
          }
          break;
        }
      }
    } catch (error) {
      logError("Failed to validate and set API key:", (error as Error).message);
    }
  }
}

export default ConfigService;
