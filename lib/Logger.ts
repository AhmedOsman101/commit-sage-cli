/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */
import {
  blue,
  bold,
  dim,
  gray,
  green,
  magenta,
  red,
  white,
  yellow,
} from "@std/fmt/colors";

const encoder = new TextEncoder();

function toCustomString(value: any): string {
  // Handle null or undefined
  if (value === null) {
    return dim(white(bold(String(value))));
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map(item => toCustomString(item));
    return `[${items.join(white(", "))}]`;
  }

  // Handle objects
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    const items = entries.map(([key, val]) => {
      // Key without quotes, value processed recursively
      return `  ${white(key)}${dim(white(":"))} ${toCustomString(val)} `;
    });
    return `\n{\n${items.join(white(",\n"))}\n}\n`;
  }

  switch (typeof value) {
    case "number":
    case "bigint":
      return yellow(String(value));
    case "boolean":
      return green(String(value));
    case "undefined":
      return gray(String(value));
    default:
      return String(value);
  }
}

function makeOutput(...data: any[]): string {
  let str = "";
  for (const item of data) {
    str += ` ${toCustomString(item)}`;
  }
  return str.trim();
}

export function logError(...data: any[]): void {
  // console.error(red(`[ERROR]: ${makeOutput(...data)}`));

  const text = encoder.encode(red(`[ERROR]: ${makeOutput(...data)}\n`));
  Deno.stderr.writeSync(text);

  Deno.exit(1);
}

export function logInfo(...data: any[]): void {
  console.info(blue(`[INFO]: ${makeOutput(...data)}`));
}

export function logWarning(...data: any[]): void {
  console.warn(yellow(`[WARNING]: ${makeOutput(...data)}`));
}

export function logSuccess(...data: any[]): void {
  console.info(green(`[SUCCESS]: ${makeOutput(...data)}`));
}

export function logDebug(...data: any[]): void {
  console.info(magenta(`[DEBUG]: ${makeOutput(...data)}`));
}
