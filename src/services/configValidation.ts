import { ErrFromText, Ok, type Result, wrapThrowable } from "lib-result";
import { z } from "zod";
import { CONFIG_PATH } from "@/lib/constants.ts";
import { Log } from "@/lib/logger.ts";
import { COMMIT_FORMATS, SUPPORTED_LANGUAGES } from "@/lib/types/commit.ts";
import {
  BODY_STYLES,
  type Config,
  DIFF_STRATEGIES,
  SUPPORTED_PROVIDERS,
  SUPPORTED_REASONING_LEVELS,
} from "@/lib/types/config.ts";
import { JsonParse } from "@/lib/utils.ts";

const INF = Number.POSITIVE_INFINITY;
const NINF = Number.NEGATIVE_INFINITY;

const ConfigSchema = z.strictObject({
  $schema: z
    .enum([
      "https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/refs/heads/main/config.schema.json",
    ])
    .optional(),
  general: z
    .object({
      maxRetries: z.uint32(),
      initialRetryDelayMs: z.uint32(),
      temperature: z.float32().min(0).max(2),
      maxInputChars: z.uint32().min(1),
      diffStrategy: z.enum(DIFF_STRATEGIES),
    })
    .optional(),
  ollama: z
    .object({
      baseUrl: z.url().optional(),
    })
    .optional(),
  openrouter: z
    .object({
      baseUrl: z.url().optional(),
    })
    .optional(),
  openai: z
    .object({
      baseUrl: z.url().optional(),
      apiKeyEnvVar: z.string().optional(),
      useChatCompletions: z.boolean().optional(),
    })
    .optional(),
  commit: z.object({
    autoCommit: z.boolean().optional(),
    autoPush: z.boolean().optional(),
    onlyStagedChanges: z.boolean(),
    commitFormat: z.enum(COMMIT_FORMATS),
    commitLanguage: z.enum(SUPPORTED_LANGUAGES),
    promptForRefs: z.boolean().optional(),
    maxSubjectLength: z.uint32().optional(),
    bodyStyle: z.enum(BODY_STYLES).optional(),
  }),
  provider: z.object({
    type: z.enum(SUPPORTED_PROVIDERS),
    model: z.string(),
    timeoutMs: z.uint32().optional(),
    reasoning: z.enum(SUPPORTED_REASONING_LEVELS).optional(),
  }),
});

type ConfigSchema = z.infer<typeof ConfigSchema>;

const safeParse = wrapThrowable(ConfigSchema.parse);

const ConfigValidationService = {
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
    if (!["bigint", "number"].includes(typeof n) || !Number.isInteger(n)) {
      return ErrFromText("must be an integer.");
    }

    if (typeof n === "number" || typeof n === "bigint") {
      if (min !== NINF && n < min) {
        return ErrFromText(`must be at least ${min}.`);
      }
      if (max !== INF && max < n) return ErrFromText(`must not exceed ${max}.`);
    }
    return Ok(true);
  },
  transformErrorMessage(message: string) {
    const keyErrRegex = /Unrecognized key: "([^"]+)"/;
    const keyErrMatch = keyErrRegex.exec(message);
    if (keyErrMatch !== null) return `Invalid key => ${keyErrMatch[0]}`;

    // Zod messages don't contain /path. patterns; return as-is
    return message;
  },
  validateGeneral(general: object): Result<boolean> {
    if ("maxRetries" in general) {
      const maxRetries = this.validateInt(general.maxRetries);
      if (maxRetries.isError()) {
        throw Log.error(
          `Error at key general.maxRetries => ${maxRetries.error.message}`
        ).exit();
      }
    }
    if ("initialRetryDelayMs" in general) {
      const validation = this.validateInt(general.initialRetryDelayMs);
      if (validation.isError()) {
        throw Log.error(
          `Error at key general.initialRetryDelayMs => ${validation.error.message}`
        ).exit();
      }
    }
    if ("temperature" in general) {
      if (
        typeof general.temperature !== "number" ||
        Number.isNaN(general.temperature)
      ) {
        throw Log.error(
          "Error at key general.temperature => must be a number."
        ).exit();
      }

      if (typeof general.temperature === "number") {
        if (general.temperature < 0) {
          throw Log.error(
            "Error at key general.temperature => must be at least 0."
          ).exit();
        }
        if (general.temperature > 2) {
          throw Log.error(
            "Error at key general.temperature => must not exceed 2."
          ).exit();
        }
      }
    }
    if ("maxInputChars" in general) {
      const validation = this.validateInt(general.maxInputChars, 1);
      if (validation.isError()) {
        throw Log.error(
          `Error at key general.maxInputChars => ${validation.error.message}`
        ).exit();
      }
    }
    return Ok(true);
  },
  validateCommit(commit: object): Result<boolean> {
    if ("maxSubjectLength" in commit) {
      const validation = this.validateInt(commit.maxSubjectLength, 1);
      if (validation.isError()) {
        throw Log.error(
          `Error at key commit.maxSubjectLength => ${validation.error.message}`
        ).exit();
      }
    }

    return Ok(true);
  },
  validateProvider(provider: object): Result<boolean> {
    if ("timeoutMs" in provider) {
      const validation = this.validateInt(provider.timeoutMs, 0);
      if (validation.isError()) {
        throw Log.error(
          `Error at key provider.timeoutMs => ${validation.error.message}`
        ).exit();
      }
    }

    return Ok(true);
  },
  validateProviderUrl(
    provider: object,
    name: "ollama" | "openrouter" | "openai"
  ): Result<boolean> {
    if ("baseUrl" in provider) {
      const baseUrl = this.validateUrl(provider.baseUrl);
      if (baseUrl.isError()) {
        throw Log.error(
          `Error at key ${name}.baseUrl => ${baseUrl.error.message}`
        ).exit();
      }
    }
    return Ok(true);
  },
  validateEnvVarName(value: unknown): Result<boolean> {
    if (typeof value !== "string") {
      return ErrFromText("Environment variable name must be a string");
    }

    if (!/^[A-Z_][A-Z0-9_]*$/.test(value)) {
      return ErrFromText(
        "Environment variable name must match /^[A-Z_][A-Z0-9_]*$/"
      );
    }

    return Ok(true);
  },
  validate(config: unknown): Result<Config> {
    let configContent: unknown;

    if (typeof config === "string") {
      const jsonResult = JsonParse(config);
      if (jsonResult.isError()) {
        throw Log.error(jsonResult.error.message).exit();
      }
      const parseResult = safeParse(jsonResult.ok);
      if (parseResult.isError()) {
        const zodError = parseResult.error as z.ZodError;
        throw Log.error(
          this.transformErrorMessage(zodError.issues[0].message)
        ).exit();
      }
      configContent = parseResult.ok;
    } else {
      configContent = config;
    }

    if (typeof configContent === "object" && configContent !== null) {
      // check for an empty array
      if (Array.isArray(configContent)) {
        Log.warning("Configuration file's structure is invalid");
        throw Log.warning(
          `Delete the config file located at ${CONFIG_PATH} to generate a new one`
        ).exit(1);
      }

      // check for an empty object
      if (Object.keys(configContent).length === 0) {
        Log.warning("Configuration file is Empty");
        throw Log.warning(
          `Delete the config file located at ${CONFIG_PATH} to generate a new one`
        ).exit(1);
      }

      if ("$schema" in configContent) {
        if (
          typeof configContent.$schema === "object" &&
          configContent.$schema !== null
        ) {
          const validation = this.validateUrl(configContent.$schema);
          if (validation.isError()) {
            throw Log.error(
              `Error at key $schema => ${validation.error.message}`
            ).exit();
          }
        }
      } else {
        throw Log.error(
          "Error at key $schema => Missing a required value."
        ).exit();
      }

      if ("general" in configContent) {
        if (
          typeof configContent.general === "object" &&
          configContent.general !== null
        ) {
          this.validateGeneral(configContent.general);
        }
      }

      if ("commit" in configContent) {
        if (
          typeof configContent.commit === "object" &&
          configContent.commit !== null
        ) {
          this.validateCommit(configContent.commit);
        }
      }

      if ("ollama" in configContent) {
        if (
          typeof configContent.ollama === "object" &&
          configContent.ollama !== null
        ) {
          this.validateProviderUrl(configContent.ollama, "ollama");
        }
      }

      if ("openrouter" in configContent) {
        if (
          typeof configContent.openrouter === "object" &&
          configContent.openrouter !== null
        ) {
          this.validateProviderUrl(configContent.openrouter, "openrouter");
        }
      }

      if ("openai" in configContent) {
        if (
          typeof configContent.openai === "object" &&
          configContent.openai !== null
        ) {
          this.validateProviderUrl(configContent.openai, "openai");
          if ("apiKeyEnvVar" in configContent.openai) {
            const validation = this.validateEnvVarName(
              configContent.openai.apiKeyEnvVar
            );
            if (validation.isError()) {
              throw Log.error(
                `Error at key openai.apiKeyEnvVar => ${validation.error.message}`
              ).exit();
            }
          }
        }
      }

      if ("provider" in configContent) {
        if (
          typeof configContent.provider === "object" &&
          configContent.provider !== null
        ) {
          this.validateProvider(configContent.provider);
        }
      }
    }

    return Ok(configContent as Config);
  },
};

export default ConfigValidationService;
export type { ConfigSchema };
