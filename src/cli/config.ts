// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Command } from "@cliffy/command";
import { ErrFromText, Ok } from "lib-result";
import { CONFIG_PATH, DEFAULT_CONFIG, OS } from "@/lib/constants.ts";
import { Log } from "@/lib/logger.ts";
import { JsonParse, JsonStringify } from "@/lib/utils.ts";
import CommandService from "@/services/command.ts";
import ConfigService from "@/services/config.ts";
import ConfigValidationService from "@/services/configValidation.ts";
import FileSystemService from "@/services/fileSystem.ts";

// ─── TYPE_MAP ────────────────────────────────────────────────────────────────

const TYPE_MAP: Record<
  string,
  Record<string, "boolean" | "number" | "string">
> = {
  generation: {
    maxRetries: "number",
    retryDelay: "number",
    temperature: "number",
    maxPromptTokens: "number",
    diffStrategy: "string",
  },
  commit: {
    autoCommit: "boolean",
    autoPush: "boolean",
    commitFormat: "string",
    onlyStagedChanges: "boolean",
    commitLanguage: "string",
    promptForRefs: "boolean",
    maxLength: "number",
    bodyStyle: "string",
  },
};

const PROVIDER_ENTRY_MAP: Record<string, "boolean" | "number" | "string"> = {
  baseUrl: "string",
  apiKey: "string",
  apiType: "string",
  timeoutMs: "number",
  reasoning: "string",
  contextWindow: "number",
  maxInputTokens: "number",
  maxOutputTokens: "number",
};

const PROVIDER_DEFAULTS_MAP: Record<string, "boolean" | "number" | "string"> = {
  timeoutMs: "number",
  reasoning: "string",
  apiType: "string",
  contextWindow: "number",
  maxInputTokens: "number",
  maxOutputTokens: "number",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDotPath(arg: string) {
  const dot = arg.indexOf(".");
  if (dot === -1 || dot === 0 || dot === arg.length - 1) {
    return ErrFromText(
      `Invalid key "${arg}". Usage: config get/set <section>.<key> (e.g. generation.maxRetries)`
    );
  }
  if (arg.indexOf(".", dot + 1) !== -1) {
    return ErrFromText(
      `Invalid key "${arg}". Usage: config get/set <section>.<key> (e.g. generation.maxRetries)`
    );
  }
  const section = arg.slice(0, dot);
  const key = arg.slice(dot + 1);
  if (!(section in TYPE_MAP)) {
    return ErrFromText(
      `Unknown config section "${section}". Valid sections: ${Object.keys(TYPE_MAP).join(", ")}, model, providers.<name>.<key>`
    );
  }
  if (!(key in (TYPE_MAP[section] as Record<string, string>))) {
    return ErrFromText(
      `Unknown key "${section}.${key}". Valid keys for ${section}: ${Object.keys(TYPE_MAP[section]).join(", ")}`
    );
  }
  return Ok([section, key] as const);
}

function parseProvidersPath(arg: string) {
  const parts = arg.split(".");
  if (parts.length !== 3 || parts[0] !== "providers") {
    return ErrFromText(
      `Invalid key "${arg}". Usage: providers.<name>.<key> (e.g. providers.openai.baseUrl) or providers.defaults.<key>`
    );
  }
  const [, provider, key] = parts;
  if (!provider || !key) {
    return ErrFromText(`Invalid key "${arg}". Provider and key required.`);
  }
  if (provider === "defaults") {
    if (!(key in PROVIDER_DEFAULTS_MAP)) {
      return ErrFromText(
        `Unknown key "providers.defaults.${key}". Valid: ${Object.keys(PROVIDER_DEFAULTS_MAP).join(", ")}`
      );
    }
  } else {
    if (!(key in PROVIDER_ENTRY_MAP)) {
      return ErrFromText(
        `Unknown key "providers.${provider}.${key}". Valid: ${Object.keys(PROVIDER_ENTRY_MAP).join(", ")}`
      );
    }
  }
  return Ok([provider, key] as const);
}

function coerceValue(section: string, key: string, raw: string) {
  let expected: string | undefined;
  if (section in TYPE_MAP) {
    expected = (TYPE_MAP[section] as Record<string, string>)[key];
  } else if (section === "providers.defaults") {
    expected = PROVIDER_DEFAULTS_MAP[key];
  } else if (section.startsWith("providers.")) {
    // for providers.<name>.<key>, section is like "providers.openai"
    expected = PROVIDER_ENTRY_MAP[key];
    // fallback for defaults
    if (!expected && section === "providers.defaults")
      expected = PROVIDER_DEFAULTS_MAP[key];
  }
  if (expected === "boolean") {
    const lower = raw.toLowerCase();
    if (lower === "true") return Ok(true);
    if (lower === "false") return Ok(false);
    return ErrFromText(
      `Invalid boolean for ${section}.${key}: "${raw}" — expected "true" or "false"`
    );
  }
  if (expected === "number") {
    const num = Number(raw);
    if (raw.trim() === "" || Number.isNaN(num) || !Number.isFinite(num)) {
      return ErrFromText(
        `Invalid number for ${section}.${key}: "${raw}" — expected a finite number`
      );
    }
    return Ok(num);
  }
  return Ok(raw);
}

async function isUserSet(section: string, key: string): Promise<boolean> {
  const read = await FileSystemService.readFile(CONFIG_PATH);
  if (read.isError()) return false;
  const parsed = JsonParse(read.ok);
  if (parsed.isError()) return false;
  const obj = parsed.ok as Record<string, unknown>;
  if (section === "model") {
    return "model" in obj;
  }
  if (section.startsWith("providers.")) {
    const parts = section.split(".");
    // section is "providers.openai" or "providers.defaults"
    if (parts.length === 2) {
      const provider = parts[1];
      if (!(provider in ((obj.providers as Record<string, unknown>) ?? {})))
        return false;
      const entry = (obj.providers as Record<string, unknown>)[
        provider
      ] as Record<string, unknown> | null;
      if (typeof entry !== "object" || entry === null) return false;
      return key in entry;
    }
    return false;
  }
  if (!(section in obj)) return false;
  const sec = obj[section] as Record<string, unknown> | null;
  if (typeof sec !== "object" || sec === null) return false;
  return key in sec;
}

async function isProvidersUserSet(
  provider: string,
  key: string
): Promise<boolean> {
  const read = await FileSystemService.readFile(CONFIG_PATH);
  if (read.isError()) return false;
  const parsed = JsonParse(read.ok);
  if (parsed.isError()) return false;
  const obj = parsed.ok as Record<string, unknown>;
  const providers = obj.providers as Record<string, unknown> | undefined;
  if (!providers) return false;
  const entry = providers[provider] as Record<string, unknown> | undefined;
  if (!entry || typeof entry !== "object") return false;
  return key in entry;
}

function resolveEditor(): { bin: string; args: string[] } {
  // ponytail: duplicate 5-line editor resolution; extract resolveEditor() as follow-up
  const editor =
    Deno.env.get("VISUAL") ??
    Deno.env.get("EDITOR") ??
    (OS === "windows" ? "notepad" : "vi");
  const [bin, ...args] = editor.split(/\s+/);
  return { bin, args };
}

async function ensureConfigFile(): Promise<string> {
  let read = await FileSystemService.readFile(CONFIG_PATH);
  if (read.isError()) {
    const load = await ConfigService.load();
    if (load.isError()) {
      throw Log.error(
        `Failed to create config file: ${load.error.message}`
      ).exit();
    }
    read = await FileSystemService.readFile(CONFIG_PATH);
    if (read.isError()) {
      throw Log.error(
        `Failed to read config after creation: ${read.error.message}`
      ).exit();
    }
  }
  return read.ok;
}

async function runEditFlow(): Promise<void> {
  const oldContent = await ensureConfigFile();

  const { bin, args } = resolveEditor();

  const spawn = await CommandService.spawnInteractive(
    bin,
    [...args, CONFIG_PATH],
    {
      inheritStdin: true,
      inheritStdout: true,
      inheritStderr: true,
    }
  );
  if (spawn.isError()) {
    throw Log.error(
      `Failed to open editor "${bin}": ${spawn.error.message}`
    ).exit();
  }

  const newRead = await FileSystemService.readFile(CONFIG_PATH);
  if (newRead.isError()) {
    throw Log.error(
      `Failed to read config after edit: ${newRead.error.message}`
    ).exit();
  }
  const newContent = newRead.ok;

  const parsed = JsonParse(newContent);
  if (parsed.isError()) {
    const wr = await FileSystemService.writeFile(CONFIG_PATH, oldContent);
    if (wr.isError())
      Log.warning(`Failed to restore previous config: ${wr.error.message}`);
    throw Log.error(
      `Invalid JSON — restored previous config: ${parsed.error.message}`
    ).exit();
  }

  const validation = ConfigValidationService.validateOrError(parsed.ok);
  if (validation.isError()) {
    const wr = await FileSystemService.writeFile(CONFIG_PATH, oldContent);
    if (wr.isError())
      Log.warning(`Failed to restore previous config: ${wr.error.message}`);
    throw Log.error(
      `Invalid config — restored previous config: ${validation.error.message}`
    ).exit();
  }

  Log.success("Config saved and validated.");
}

// ─── Command ────────────────────────────────────────────────────────────────

class ConfigCommand extends Command {
  constructor() {
    super();
    this.description("Inspect or modify the commit-sage configuration.");

    this.command(
      "get",
      new Command()
        .description("Print a single config value")
        .arguments("<key:string>")
        .action(async (_opts: unknown, key: string) => {
          // model special case
          if (key === "model") {
            const userSet = await isUserSet("model", "");
            const result = await ConfigService.get("model");
            if (result.isError()) throw Log.error(result.error.message).exit();
            const value = result.ok as unknown;
            if (!userSet) {
              const fallback = (
                DEFAULT_CONFIG as unknown as Record<string, unknown>
              ).model as string;
              Log.warning(
                `Key 'model' not set — using default fallback: ${fallback}`
              );
            }
            console.log(value as string);
            return;
          }

          // providers.<name>.<key> special case
          if (key.startsWith("providers.")) {
            const parsed = parseProvidersPath(key);
            if (parsed.isError()) throw Log.error(parsed.error.message).exit();
            const [provider, subKey] = parsed.ok;
            const userSet = await isProvidersUserSet(provider, subKey);
            const loaded = await ConfigService.load();
            if (loaded.isError()) throw Log.error(loaded.error.message).exit();
            const providers = (loaded.ok as unknown as Record<string, unknown>)
              .providers as Record<string, Record<string, unknown>>;
            const entry = providers?.[provider] as
              | Record<string, unknown>
              | undefined;
            let value: unknown = entry?.[subKey];
            if (value === undefined) {
              // fallback to defaults or DEFAULT_CONFIG
              if (provider === "defaults") {
                value = (
                  DEFAULT_CONFIG.providers as unknown as Record<
                    string,
                    Record<string, unknown>
                  >
                ).defaults?.[subKey];
              } else {
                value =
                  providers?.defaults?.[subKey] ??
                  (
                    DEFAULT_CONFIG.providers as unknown as Record<
                      string,
                      Record<string, unknown>
                    >
                  )[provider]?.[subKey] ??
                  (
                    DEFAULT_CONFIG.providers as unknown as Record<
                      string,
                      Record<string, unknown>
                    >
                  ).defaults?.[subKey];
              }
            }
            if (!userSet) {
              const fallback = value;
              const display =
                typeof fallback === "string"
                  ? fallback
                  : JSON.stringify(fallback);
              Log.warning(
                `Key '${key}' not set — using default fallback: ${display}`
              );
            }
            if (typeof value === "string") console.log(value);
            else console.log(JSON.stringify(value));
            return;
          }

          const parsed = parseDotPath(key);
          if (parsed.isError()) throw Log.error(parsed.error.message).exit();
          const [section, k] = parsed.ok;

          const userSet = await isUserSet(section, k);

          const result = await ConfigService.get(section as never, k as never);
          if (result.isError()) throw Log.error(result.error.message).exit();
          const value = result.ok as unknown;

          if (!userSet) {
            const fallback = (
              DEFAULT_CONFIG as unknown as Record<
                string,
                Record<string, unknown>
              >
            )[section]?.[k];
            const display =
              typeof fallback === "string"
                ? fallback
                : JSON.stringify(fallback);
            Log.warning(
              `Key '${section}.${k}' not set — using default fallback: ${display}`
            );
          }

          if (typeof value === "string") {
            console.log(value);
          } else {
            console.log(JSON.stringify(value));
          }
        })
    );

    this.command(
      "set",
      new Command()
        .description("Persist a config value (writes to disk)")
        .arguments("<key:string> <value:string>")
        .action(async (_opts: unknown, key: string, rawValue: string) => {
          // model special case
          if (key === "model") {
            // validate provider/model shape
            if (!/^.+\/.+$/.test(rawValue)) {
              throw Log.error(
                `Invalid model "${rawValue}": expected "provider/model"`
              ).exit();
            }
            const result = await ConfigService.set("model", rawValue as never);
            if (result.isError()) throw Log.error(result.error.message).exit();
            Log.success(`Set model = ${rawValue}`);
            return;
          }

          if (key.startsWith("providers.")) {
            const parsed = parseProvidersPath(key);
            if (parsed.isError()) throw Log.error(parsed.error.message).exit();
            const [provider, subKey] = parsed.ok;
            const sectionForCoerce = `providers.${provider}`;
            const coerced = coerceValue(sectionForCoerce, subKey, rawValue);
            if (coerced.isError())
              throw Log.error(coerced.error.message).exit();
            // Directly manipulate file via load
            const loaded = await ConfigService.load();
            if (loaded.isError()) throw Log.error(loaded.error.message).exit();
            const cfg = loaded.ok as unknown as Record<string, unknown>;
            if (!cfg.providers) cfg.providers = {};
            const providers = cfg.providers as Record<string, unknown>;
            if (!providers[provider]) providers[provider] = {};
            const entry = providers[provider] as Record<string, unknown>;
            entry[subKey] = coerced.ok;
            const validation = ConfigValidationService.validateOrError(cfg);
            if (validation.isError())
              throw Log.error(validation.error.message).exit();
            const str = JsonStringify(cfg, null, 2);
            if (str.isError()) throw Log.error(str.error.message).exit();
            const wr = await FileSystemService.writeFile(CONFIG_PATH, str.ok);
            if (wr.isError()) throw Log.error(wr.error.message).exit();
            Log.success(`Set ${key} = ${rawValue}`);
            return;
          }

          const parsed = parseDotPath(key);
          if (parsed.isError()) throw Log.error(parsed.error.message).exit();
          const [section, k] = parsed.ok;

          const coerced = coerceValue(section, k, rawValue);
          if (coerced.isError()) throw Log.error(coerced.error.message).exit();

          const result = await ConfigService.set(
            section as never,
            k as never,
            coerced.ok as never
          );
          if (result.isError()) throw Log.error(result.error.message).exit();
          Log.success(`Set ${section}.${k} = ${rawValue}`);
        })
    );

    this.command(
      "list",
      new Command()
        .description("Print the current configuration as JSON")
        .alias("print")
        .action(async () => {
          const loaded = await ConfigService.load();
          if (loaded.isError()) throw Log.error(loaded.error.message).exit();
          const str = JsonStringify(loaded.ok, null, 2);
          if (str.isError()) throw Log.error(str.error.message).exit();
          console.log(str.ok);
        })
    );

    this.command(
      "path",
      new Command().description("Print the config file path").action(() => {
        console.log(CONFIG_PATH);
      })
    );

    this.command(
      "default",
      new Command()
        .description("Print the default config as JSON")
        .action(() => {
          const str = JsonStringify(DEFAULT_CONFIG, null, 2);
          if (str.isError()) throw Log.error(str.error.message).exit();
          console.log(str.ok);
        })
    );

    this.command(
      "open",
      new Command()
        .description(
          "Open config file in OS-default handler (falls back to $EDITOR)"
        )
        .action(async () => {
          await ensureConfigFile();

          let cmd: string;
          let args: string[];
          if (OS === "darwin") {
            cmd = "open";
            args = [CONFIG_PATH];
          } else if (OS === "windows") {
            cmd = "cmd";
            args = ["/c", "start", "", CONFIG_PATH];
          } else {
            cmd = "xdg-open";
            args = [CONFIG_PATH];
          }

          const res = await CommandService.execute(cmd, args);
          if (res.isError()) {
            Log.warning("OS handler not found — falling back to $EDITOR");
            await runEditFlow();
            return;
          }
        })
    );

    this.command(
      "edit",
      new Command()
        .description(
          "Open config file in $EDITOR/$VISUAL and re-validate on save"
        )
        .action(runEditFlow)
    );
  }
}

export { ConfigCommand };
