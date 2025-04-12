import { AiServiceError, ConfigurationError } from "../models/errors.ts";
import KeyValidationService from "../utils/apiKeyValidator.ts";
import { configPath, defaultConfig } from "../utils/constants.ts";
import { logError, logInfo } from "../utils/Logger.ts";
import CommandService from "./commandService.ts";
import type {
  ApiService,
  Config,
  ConfigKey,
  ConfigSection,
  ConfigValue,
} from "./configServiceTypes.d.ts";

const infoMessage = (service: ApiService, shell: string) => `
To set the API key for future use, add the following line to your ~/.${shell}rc file:
$ export ${service.toUpperCase()}_API_KEY='your_api_key'
Replace 'your_api_key' with your actual API key.
After adding these lines, restart your terminal or run 'source ~/.${shell}rc' to apply the changes.`;

const ConfigService = {
  shell: "",
  load(): Config {
    const configFile = Deno.readTextFileSync(configPath);
    return JSON.parse(configFile) as Config;
  },
  get<T extends ConfigSection, G extends ConfigKey<T>>(
    section: T,
    key: G
  ): ConfigValue<T, G> {
    const config = this.load();
    return config[section][key] ?? defaultConfig[section][key];
  },
  set<T extends ConfigSection, G extends ConfigKey<T>>(
    section: T,
    key: G,
    value: ConfigValue<T, G>
  ): void {
    const config = this.load();

    config[section][key] = value;

    Deno.writeTextFileSync(configPath, JSON.stringify(config));
  },
  getApiKey(service: ApiService): string {
    try {
      if (!this.shell) {
        const parts = Deno.env.get("SHELL")?.split("/") || ["bash"];
        this.shell = parts[parts.length - 1];
      }
      const key =
        Deno.env.get(`${service.toUpperCase()}_API_KEY`) ||
        this.promptForApiKey(service);

      if (key) {
        this.setApiKey(service, key);
      } else {
        throw new ConfigurationError(`${service} API key input was cancelled`);
      }

      return key;
    } catch (error) {
      void logError("Error getting API key:", error);
      throw new AiServiceError(
        `Failed to get API key: ${(error as Error).message}`
      );
    }
  },
  promptForApiKey(service: ApiService) {
    const [cmdOutput, cmdErr] = CommandService.execute("gum", [
      "input",
      "--header",
      `"Enter your ${service} API Key: "`,
      "--placeholder=''",
      "--password",
    ]);

    if (cmdErr !== null) {
      throw new ConfigurationError(
        `Failed to capture the API key for ${service}`
      );
    }

    const { code: cmdCode, stdout: cmdOut, stderr: cmdError } = cmdOutput;

    switch (cmdCode) {
      case 1:
        throw new ConfigurationError(
          `${service} API key input was ${cmdError}`
        );
      case 130:
        throw new ConfigurationError(`${service} API key input was cancelled`);
    }

    const key = cmdOut ?? "";

    const [, validationErr] = KeyValidationService.baseValidation(key);

    if (validationErr !== null) throw new ConfigurationError(validationErr);

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
          const [, err] = KeyValidationService.validateCodestralApiKey(key);
          if (err !== null) throw new AiServiceError(err);
          break;
        }
        case "Gemini": {
          const [, err] = KeyValidationService.validateGeminiApiKey(key);

          if (err !== null) throw new AiServiceError(err);
          break;
        }
        case "OpenAI": {
          const [, err] = KeyValidationService.validateOpenAIApiKey(key);
          if (err !== null) throw new AiServiceError(err);
          break;
        }
      }
    } catch (error) {
      void logError("Failed to validate and set API key:", error);
      throw error;
    }
  },
};

export default ConfigService;
