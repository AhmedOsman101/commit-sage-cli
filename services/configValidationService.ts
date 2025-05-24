import { a } from "@arrirpc/schema";
import { ErrFromText, isErr, Ok, type Result } from "lib-result";
import { configPath } from "../lib/constants.ts";
import { logError, logWarning } from "../lib/Logger.ts";

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
  validateGeneral(general: object): Result<boolean> {
    if ("maxRetries" in general) {
      const maxRetries = this.validateInt(general.maxRetries);
      if (isErr(maxRetries)) {
        logError(
          `Error at key general.maxRetries => ${maxRetries.error.message}`
        );
      }
    }
    if ("initialRetryDelayMs" in general) {
      const validation = this.validateInt(general.initialRetryDelayMs);
      if (isErr(validation)) {
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
      if (isErr(baseUrl)) {
        logError(`Error at key ${name}.baseUrl => ${baseUrl.error.message}`);
      }
    }

    return Ok(true);
  },
  validate(config: unknown): Result<boolean> {
    if (typeof config === "object" && config !== null) {
      // check for an empty array
      if (Array.isArray(config)) {
        logWarning("Configuration file's structure is invalid");
        logWarning(
          `Delete the config file located at ${configPath} to generate a new one`
        );
        Deno.exit(1);
      }

      // check for an empty object
      if (Object.keys(config).length === 0) {
        logWarning("Configuration file is Empty");
        logWarning(
          `Delete the config file located at ${configPath} to generate a new one`
        );
        Deno.exit(1);
      }

      if ("$schema" in config) {
        if (typeof config.$schema === "object" && config.$schema !== null) {
          const validation = this.validateUrl(config.$schema);
          if (isErr(validation)) {
            logError(`Error at key $schema => ${validation.error.message}`);
          }
        }
      } else {
        logError("Error at key $schema => Missing a required value.");
      }

      if ("general" in config) {
        if (typeof config.general === "object" && config.general !== null) {
          this.validateGeneral(config.general);
        }
      }

      if ("ollama" in config) {
        if (typeof config.ollama === "object" && config.ollama !== null) {
          this.validateModelUrl(config.ollama, "ollama");
        }
      }

      if ("openai" in config) {
        if (typeof config.openai === "object" && config.openai !== null) {
          this.validateModelUrl(config.openai, "openai");
        }
      }
    }

    const errors = a.errors(ConfigSchema, config, true);
    if (errors.length !== 0) {
      logError(this.transformErrorMessage(errors[0].message));
    }

    return Ok(true);
  },
};

export default ConfigValidationService;
