import { a, type ValidationException } from "@arrirpc/schema";
import { ErrFromText, Ok, type Result } from "lib-result";
import type { Config } from "../lib/configServiceTypes.d.ts";
import { CONFIG_PATH } from "../lib/constants.ts";
import { logError, logWarning } from "../lib/logger.ts";

const INF = Number.POSITIVE_INFINITY;
const NINF = Number.NEGATIVE_INFINITY;

const ConfigSchema = a.object(
  {
    $schema: a.stringEnum([
      "https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/refs/heads/main/config.schema.json",
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
    } catch {
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
    const pathRegex = /\/[a-zA-Z0-9/$]+\./g;
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
  validateGeneral(general: object): Result<boolean> {
    if ("maxRetries" in general) {
      const maxRetries = this.validateInt(general.maxRetries);
      if (maxRetries.isError()) {
        logError(
          `Error at key general.maxRetries => ${maxRetries.error.message}`
        );
      }
    }
    if ("initialRetryDelayMs" in general) {
      const validation = this.validateInt(general.initialRetryDelayMs);
      if (validation.isError()) {
        logError(
          `Error at key general.initialRetryDelayMs => ${validation.error.message}`
        );
      }
    }
    return Ok(true);
  },
  validateModelUrl(model: object, name: "ollama" | "openai"): Result<boolean> {
    if ("baseUrl" in model) {
      const baseUrl = this.validateUrl(model.baseUrl);
      if (baseUrl.isError()) {
        logError(`Error at key ${name}.baseUrl => ${baseUrl.error.message}`);
      }
    }

    return Ok(true);
  },
  validate(config: unknown): Result<Config> {
    let configContent: unknown;
    try {
      configContent =
        typeof config === "string"
          ? this.$ConfigSchema.parseUnsafe(config)
          : config;
    } catch (e) {
      logError(
        this.transformErrorMessage((e as ValidationException).errors[0].message)
      );
    }

    if (typeof configContent === "object" && configContent !== null) {
      // check for an empty array
      if (Array.isArray(configContent)) {
        logWarning("Configuration file's structure is invalid");
        logWarning(
          `Delete the config file located at ${CONFIG_PATH} to generate a new one`
        );
        Deno.exit(1);
      }

      // check for an empty object
      if (Object.keys(configContent).length === 0) {
        logWarning("Configuration file is Empty");
        logWarning(
          `Delete the config file located at ${CONFIG_PATH} to generate a new one`
        );
        Deno.exit(1);
      }

      if ("$schema" in configContent) {
        if (
          typeof configContent.$schema === "object" &&
          configContent.$schema !== null
        ) {
          const validation = this.validateUrl(configContent.$schema);
          if (validation.isError()) {
            logError(`Error at key $schema => ${validation.error.message}`);
          }
        }
      } else {
        logError("Error at key $schema => Missing a required value.");
      }

      if ("general" in configContent) {
        if (
          typeof configContent.general === "object" &&
          configContent.general !== null
        ) {
          this.validateGeneral(configContent.general);
        }
      }

      if ("ollama" in configContent) {
        if (
          typeof configContent.ollama === "object" &&
          configContent.ollama !== null
        ) {
          this.validateModelUrl(configContent.ollama, "ollama");
        }
      }

      if ("openai" in configContent) {
        if (
          typeof configContent.openai === "object" &&
          configContent.openai !== null
        ) {
          this.validateModelUrl(configContent.openai, "openai");
        }
      }
    }

    return Ok(configContent as Config);
  },
};

export default ConfigValidationService;
