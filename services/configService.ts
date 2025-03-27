import { scriptDir } from "../main.ts";
import { defaultConfig } from "../utils/constants.ts";
import type {
  CacheValue,
  Config,
  ConfigKey,
  ConfigSection,
  ConfigValue,
} from "./configServiceTypes.d.ts";

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
};

export default ConfigService;
