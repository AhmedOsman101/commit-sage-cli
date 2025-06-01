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

const encoder = new TextEncoder();

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

// Type never indicates that this function never returns, as it terminates program execution
export function logError(...data: string[]): never {
  const text = encoder.encode(red(`[ERROR] ${data.join(" ")}\n`));
  Deno.stderr.writeSync(text);

  Deno.exit(1);
}

export function logInfo(...data: unknown[]): void {
  console.info(blue(`[INFO] ${makeOutput(...data)}`));
}

export function logWarning(...data: unknown[]): void {
  console.warn(yellow(`[WARNING] ${makeOutput(...data)}`));
}

export function logSuccess(...data: unknown[]): void {
  console.info(green(`[SUCCESS] ${makeOutput(...data)}`));
}

export function logDebug(...data: unknown[]): void {
  console.info(magenta(`[DEBUG] ${makeOutput(...data)}`));
}
