import {
  blue,
  bold,
  brightWhite,
  cyan,
  gray,
  green,
  magenta,
  red,
  white,
  yellow,
} from "@std/fmt/colors";
import { Encoder } from "@/lib/utils.ts";
import FileLogger from "@/services/fileLogger.ts";

// Cached debug flag - checked once at module load
const DEBUG_ENABLED = Deno.env.get("DEBUG") === "1";

function toCustomString(value: unknown, indentLevel = 0): string {
  const indent = "  ".repeat(indentLevel); // 2 spaces for indentation

  // Handle null or undefined
  if (value === null) return bold(yellow("null"));

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";

    const items = value.map(item => toCustomString(item, indentLevel + 1));
    const needIndent = value.some(
      item => typeof item === "object" || Array.isArray(item)
    );

    if (needIndent) {
      return `[\n${indent}  ${items.join(`${white(",\n")}${indent}  `)}\n${indent}]`;
    }

    return `[${items.join(white(", "))}]`;
  }

  // Handle objects
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";

    const items = entries.map(([key, val]) => {
      // Key without quotes, value processed recursively
      return `${indent}  ${brightWhite(`${key}:`)} ${toCustomString(val, indentLevel + 1)}`;
    });

    return `{\n${items.join(white(",\n"))}\n${indent}}`;
  }

  switch (typeof value) {
    case "number":
    case "bigint":
      return yellow(String(value));
    case "boolean":
      return blue(String(value));
    case "undefined":
      return gray(String(value));
    case "symbol":
      return green(`Symbol(${value.description ?? ""})`);
    case "function":
      return cyan(`[Function: ${value.name}]`);
    default:
      return String(value);
  }
}

function makeOutput(...data: unknown[]): string {
  let str = "";
  for (const item of data) {
    str += ` ${toCustomString(item)}`;
  }
  return str.trim();
}

type Level = "error" | "info" | "warning" | "success" | "debug";
type Stream = "stdout" | "stderr";
type LogLevel = { label: string; color: (s: string) => string; stream: Stream };

const LEVEL_CONFIG: Record<Level, LogLevel> = {
  error: { label: "[ERROR]", color: red, stream: "stderr" },
  info: { label: "[INFO]", color: blue, stream: "stdout" },
  warning: { label: "[WARNING]", color: yellow, stream: "stderr" },
  success: { label: "[SUCCESS]", color: green, stream: "stdout" },
  debug: { label: "[DEBUG]", color: magenta, stream: "stdout" },
};

class LogResult {
  // Type never indicates that this function never returns, as it terminates program execution
  exit(code = 1): never {
    return Deno.exit(code);
  }
}

class LogBuilder {
  #stream?: Stream;

  stdOut(): this {
    this.#stream = "stdout";
    return this;
  }

  stdErr(): this {
    this.#stream = "stderr";
    return this;
  }

  // terminals

  info(...data: unknown[]): LogResult {
    return this.#exec("info", data);
  }

  warning(...data: unknown[]): LogResult {
    return this.#exec("warning", data);
  }

  success(...data: unknown[]): LogResult {
    return this.#exec("success", data);
  }

  error(...data: unknown[]): LogResult {
    return this.#exec("error", data);
  }

  debug(...data: unknown[]): LogResult {
    if (!DEBUG_ENABLED) return new LogResult();
    return this.#exec("debug", data);
  }

  // core

  #exec(level: Level, data: unknown[]): LogResult {
    const { label, color, stream: defaultStream } = LEVEL_CONFIG[level];

    const message = makeOutput(...data);

    const prefix =
      level === "debug"
        ? `${label} [${new Date().toISOString().replace("T", "@").substring(0, 22)}]`
        : label;

    const line = `${color(prefix)} ${message}\n`;
    const text = Encoder.encode(line);

    const stream = this.#stream ?? defaultStream;

    if (stream === "stdout") {
      Deno.stdout.writeSync(text);
    } else {
      Deno.stderr.writeSync(text);
    }

    this.#logToFile(level, message, data);

    return new LogResult();
  }

  #logToFile(level: Level, message: string, data: unknown[]): void {
    switch (level) {
      case "error":
        FileLogger.error(message, data);
        break;
      case "warning":
        FileLogger.warn(message, data);
        break;
      case "debug":
        FileLogger.debug(message);
        break;
      default:
        FileLogger.info(message);
    }
  }
}

// root instance
const Log = new LogBuilder();

export { Log };
