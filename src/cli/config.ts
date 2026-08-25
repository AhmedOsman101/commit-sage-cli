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
  general: {
    maxRetries: "number",
    initialRetryDelayMs: "number",
    temperature: "number",
    maxInputChars: "number",
    diffStrategy: "string",
  },
  ollama: { baseUrl: "string" },
  openrouter: { baseUrl: "string" },
  openai: {
    baseUrl: "string",
    apiKeyEnvVar: "string",
    useChatCompletions: "boolean",
  },
  commit: {
    autoCommit: "boolean",
    autoPush: "boolean",
    commitFormat: "string",
    onlyStagedChanges: "boolean",
    commitLanguage: "string",
    promptForRefs: "boolean",
    maxSubjectLength: "number",
    bodyStyle: "string",
  },
  provider: {
    type: "string",
    model: "string",
    timeoutMs: "number",
    reasoning: "string",
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDotPath(arg: string) {
  const dot = arg.indexOf(".");
  if (dot === -1 || dot === 0 || dot === arg.length - 1) {
    return ErrFromText(
      `Invalid key "${arg}". Usage: config get/set <section>.<key> (e.g. provider.model)`
    );
  }
  if (arg.indexOf(".", dot + 1) !== -1) {
    return ErrFromText(
      `Invalid key "${arg}". Usage: config get/set <section>.<key> (e.g. provider.model)`
    );
  }
  const section = arg.slice(0, dot);
  const key = arg.slice(dot + 1);
  if (!(section in TYPE_MAP)) {
    return ErrFromText(
      `Unknown config section "${section}". Valid sections: ${Object.keys(TYPE_MAP).join(", ")}`
    );
  }
  if (!(key in (TYPE_MAP[section] as Record<string, string>))) {
    return ErrFromText(
      `Unknown key "${section}.${key}". Valid keys for ${section}: ${Object.keys(TYPE_MAP[section]).join(", ")}`
    );
  }
  return Ok([section, key] as const);
}

function coerceValue(section: string, key: string, raw: string) {
  const expected = (TYPE_MAP[section] as Record<string, string>)[key];
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
  if (!(section in obj)) return false;
  const sec = obj[section] as Record<string, unknown> | null;
  if (typeof sec !== "object" || sec === null) return false;
  return key in sec;
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
