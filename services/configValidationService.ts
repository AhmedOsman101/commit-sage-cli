import { a } from "@arrirpc/schema";
import { ErrFromText, isErr, Ok, type Result } from "lib-result";
import { configPath } from "../lib/constants.ts";
import { logError, logWarning } from "../lib/Logger.ts";

const INF = Number.POSITIVE_INFINITY;
const NINF = Number.NEGATIVE_INFINITY;

const ConfigSchema = a.object(
  {
    $schema: a.stringEnum([
      "https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/main/config.schema.json",
    ]),
    general: a.optional(
      a.object({
        maxRetries: a.uint8(),
        initialRetryDelayMs: a.uint16(),
      })
    ),
    gemini: a.object({
      model: a.stringEnum([
        "gemini-2.0-flash-exp",
        "gemini-1.0-pro",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
      ]),
    }),
    codestral: a.object({
      model: a.stringEnum(["codestral-2405", "codestral-latest"]),
    }),
    openai: a.object({
      model: a.stringEnum(["gpt-3.5-turbo"]),
      baseUrl: a.string(),
    }),
    ollama: a.object({
      model: a.string(),
      baseUrl: a.string(),
    }),
    commit: a.object({
      autoCommit: a.optional(a.boolean()),
      autoPush: a.optional(a.boolean()),
      onlyStagedChanges: a.boolean(),
      commitFormat: a.stringEnum([
        "conventional",
        "angular",
        "karma",
        "emoji",
        "semantic",
      ]),
      commitLanguage: a.stringEnum([
        "english",
        "russian",
        "chinese",
        "japanese",
      ]),
      promptForRefs: a.optional(a.boolean()),
    }),
    provider: a.object({
      type: a.stringEnum(["gemini", "codestral", "openai", "ollama"]),
    }),
  },
  {
    isStrict: true,
  }
);

export type ConfigSchema = a.infer<typeof ConfigSchema>;

const ConfigValidationService = {
  $ConfigSchema: a.compile(ConfigSchema),
  validateUrl(url: unknown): Result<boolean> {
    try {
      if (typeof url === "string") {
        new URL(url);
        return Ok(true);
      }

      return ErrFromText("URL must be string");
    } catch (_error) {
      return ErrFromText("Invalid URL");
    }
  },
  validateInt(n: unknown, min = NINF, max = INF): Result<boolean> {
    if (typeof n !== "number" && !Number.isInteger(n)) {
      return ErrFromText("must be an integer.");
    }

    if (typeof n === "number") {
      if (min !== NINF && n < min) {
        return ErrFromText(`must be at least ${min}.`);
      }
      if (max !== INF && max < n) return ErrFromText(`must not exceed ${max}.`);
    }
    return Ok(true);
  },
  transformErrorMessage(message: string) {
    const keyErrRegex = /Key '([a-zA-Z0-9_]+)' is not included in the schema\./;
    const keyErrMatch = keyErrRegex.exec(message);
    if (keyErrMatch !== null) return `Invalid key => ${keyErrMatch[0]}`;

    // Match paths like /state/code. or /status.
    const pathRegex = /\/[a-zA-Z0-9\/$]+\./g;
    const pathMatch = pathRegex.exec(message);
    if (pathMatch !== null) {
      const replace = `key ${pathMatch[0].replace(".", " =>").replace("/", "").replaceAll("/", ".")}`;
      const result = message
        .slice(0, pathMatch.index)
        .concat(replace, message.slice(pathMatch.index + pathMatch[0].length));
      return result;
    }
    return message;
  },

export default ConfigValidationService;
