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

const ConfigValidationService = {};

export default ConfigValidationService;
