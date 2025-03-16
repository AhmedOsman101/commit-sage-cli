import { scriptDir } from "../main.ts";

type JsonValue = string | number | boolean | Array<JsonValue> | object;

// TODO: implement the full configuration interface
type Config = {
  onlyStaged: boolean;
};

const configService = {
  configPath: `${scriptDir}/config.json`,
  load(): Record<string, JsonValue> {
    const configFile = Deno.readTextFileSync(this.configPath);
    return JSON.parse(configFile);
  },
  get(key: string, defaultValue = null): string | null {
    const configFile = Deno.readTextFileSync(this.configPath);
    const config = JSON.parse(configFile);
    return config[key] || defaultValue;
  },
  set(key: keyof Config, value: JsonValue): void {
    const config = this.load();
    config[key] = value;

    Deno.writeTextFileSync(this.configPath, JSON.stringify(config));
  },
};

export default configService;
