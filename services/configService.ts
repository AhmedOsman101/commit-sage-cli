import { scriptDir } from "../main.ts";
import { ConfigurationError } from "../models/errors.ts";
import { defaultConfig } from "../utils/constants.ts";
import { logInfo } from "../utils/Logger.ts";
import type {
  ApiService,
  CacheValue,
  Config,
  ConfigKey,
  ConfigSection,
  ConfigValue,
} from "./configServiceTypes.d.ts";

const infoMessage = (service: ApiService, shell: string) => `
To set the API key for future use, add the following line to your ${shell} configuration file (~/.${shell}rc for ${shell}):
$ export ${service.toUpperCase()}_API_KEY='your_api_key'
Replace 'your_api_key' with your actual API keys.
After adding these lines, restart your terminal or run 'source <config_file>' (e.g., 'source ~/.${shell}rc') to apply the changes.`;

const ConfigService = {
  cache: new Map<string, CacheValue>(),
  configPath: `${scriptDir}/config.json`,
  load(): Config {
    const configFile = Deno.readTextFileSync(this.configPath);
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

    Deno.writeTextFileSync(this.configPath, JSON.stringify(config));
  },
  getApiKey(service: ApiService): string {
    let key = Deno.env.get(`${service.toUpperCase()}_API_KEY`);

    if (!key) {
      key = prompt(`Enter your ${service} API Key: `) ?? undefined;
    }
    if (key) {
      const parts = Deno.env.get("SHELL")?.split("/") || ["bash"];
      const shell = parts[parts.length - 1];
      logInfo(infoMessage(service, shell));
    } else {
      throw new ConfigurationError(`${service} API key input was cancelled`);
    }
    return key;
  },
};

export default ConfigService;
