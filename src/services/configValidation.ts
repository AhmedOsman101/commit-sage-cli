import { Err, ErrFromText, Ok, type Result, wrapThrowable } from "lib-result";
import { z } from "zod";
import { CONFIG_PATH } from "@/lib/constants.ts";
import { Log } from "@/lib/logger.ts";
import { COMMIT_FORMATS, SUPPORTED_LANGUAGES } from "@/lib/types/commit.ts";
import {
  BODY_STYLES,
  type Config,
  DIFF_STRATEGIES,
  SUPPORTED_API_TYPES,
  SUPPORTED_REASONING_LEVELS,
} from "@/lib/types/config.ts";
import { JsonParse } from "@/lib/utils.ts";

const INF = Number.POSITIVE_INFINITY;
const NINF = Number.NEGATIVE_INFINITY;

const providerDefaultsSchema = z.object({
  timeoutMs: z.uint32().optional(),
  reasoning: z
    .union([z.boolean(), z.enum(SUPPORTED_REASONING_LEVELS)])
    .optional(),
  apiType: z.enum(SUPPORTED_API_TYPES).optional(),
  contextWindow: z.uint32().optional(),
  maxInputTokens: z.uint32().optional(),
  maxOutputTokens: z.uint32().optional(),
});

const modelPresetSchema = z.object({
  name: z.string().optional(),
  reasoning: z
    .union([z.boolean(), z.enum(SUPPORTED_REASONING_LEVELS)])
    .optional(),
  contextWindow: z.uint32().optional(),
  maxInputTokens: z.uint32().optional(),
  maxOutputTokens: z.uint32().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

const providerEntrySchema = z.object({
  baseUrl: z.url().optional(),
  apiKey: z.string().optional(),
  apiType: z.enum(SUPPORTED_API_TYPES).optional(),
  timeoutMs: z.uint32().optional(),
  reasoning: z
    .union([z.boolean(), z.enum(SUPPORTED_REASONING_LEVELS)])
    .optional(),
  contextWindow: z.uint32().optional(),
  maxInputTokens: z.uint32().optional(),
  maxOutputTokens: z.uint32().optional(),
  models: z.record(z.string(), modelPresetSchema).optional(),
});

const ConfigSchema = z.strictObject({
  $schema: z
    .enum([
      "https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/refs/heads/main/config.schema.json",
    ])
    .optional(),
  model: z.string().regex(/^.+\/.+$/),
  generation: z
    .object({
      maxRetries: z.uint32(),
      retryDelay: z.uint32(),
      temperature: z.number().min(0).max(2),
      maxPromptTokens: z.uint32().min(1),
      diffStrategy: z.enum(DIFF_STRATEGIES),
    })
    .optional(),
  providers: z
    .object({
      defaults: providerDefaultsSchema.optional(),
    })
    .catchall(providerEntrySchema)
    .optional(),
  commit: z.object({
    autoCommit: z.boolean().optional(),
    autoPush: z.boolean().optional(),
    onlyStagedChanges: z.boolean(),
    commitFormat: z.enum(COMMIT_FORMATS),
    commitLanguage: z.enum(SUPPORTED_LANGUAGES),
    promptForRefs: z.boolean().optional(),
    maxLength: z.uint32().optional(),
    bodyStyle: z.enum(BODY_STYLES).optional(),
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
  validateGeneration(generation: object): Result<boolean> {
    if ("maxRetries" in generation) {
      const maxRetries = this.validateInt(
        (generation as Record<string, unknown>).maxRetries
      );
      if (maxRetries.isError()) {
        throw Log.error(
          `Error at key generation.maxRetries => ${maxRetries.error.message}`
        ).exit();
      }
    }
    if ("retryDelay" in generation) {
      const validation = this.validateInt(
        (generation as Record<string, unknown>).retryDelay
      );
      if (validation.isError()) {
        throw Log.error(
          `Error at key generation.retryDelay => ${validation.error.message}`
        ).exit();
      }
    }
    if ("temperature" in generation) {
      const temp = (generation as Record<string, unknown>).temperature;
      if (typeof temp !== "number" || Number.isNaN(temp)) {
        throw Log.error(
          "Error at key generation.temperature => must be a number."
        ).exit();
      }

      if (typeof temp === "number") {
        if (temp < 0) {
          throw Log.error(
            "Error at key generation.temperature => must be at least 0."
          ).exit();
        }
        if (temp > 2) {
          throw Log.error(
            "Error at key generation.temperature => must not exceed 2."
          ).exit();
        }
      }
    }
    if ("maxPromptTokens" in generation) {
      const validation = this.validateInt(
        (generation as Record<string, unknown>).maxPromptTokens,
        1
      );
      if (validation.isError()) {
        throw Log.error(
          `Error at key generation.maxPromptTokens => ${validation.error.message}`
        ).exit();
      }
    }
    return Ok(true);
  },
  validateCommit(commit: object): Result<boolean> {
    if ("maxLength" in commit) {
      const validation = this.validateInt(
        (commit as Record<string, unknown>).maxLength,
        1
      );
      if (validation.isError()) {
        throw Log.error(
          `Error at key commit.maxLength => ${validation.error.message}`
        ).exit();
      }
    }

    return Ok(true);
  },
  validateProviders(providers: object): Result<boolean> {
    const p = providers as Record<string, unknown>;
    if (
      "defaults" in p &&
      typeof p.defaults === "object" &&
      p.defaults !== null
    ) {
      const d = p.defaults as Record<string, unknown>;
      if ("timeoutMs" in d) {
        const validation = this.validateInt(d.timeoutMs, 0);
        if (validation.isError()) {
          throw Log.error(
            `Error at key providers.defaults.timeoutMs => ${validation.error.message}`
          ).exit();
        }
      }
    }
    for (const [name, entry] of Object.entries(p)) {
      if (name === "defaults") continue;
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      if ("baseUrl" in e) {
        const baseUrl = this.validateUrl(e.baseUrl);
        if (baseUrl.isError()) {
          throw Log.error(
            `Error at key providers.${name}.baseUrl => ${baseUrl.error.message}`
          ).exit();
        }
      }
      if ("timeoutMs" in e) {
        const validation = this.validateInt(e.timeoutMs, 0);
        if (validation.isError()) {
          throw Log.error(
            `Error at key providers.${name}.timeoutMs => ${validation.error.message}`
          ).exit();
        }
      }
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
      const parseResult = safeParse(config);
      if (parseResult.isError()) {
        const zodError = parseResult.error as z.ZodError;
        throw Log.error(
          this.transformErrorMessage(zodError.issues[0].message)
        ).exit();
      }
      configContent = parseResult.ok ?? config;
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
          const validation = this.validateUrl(
            (configContent as Record<string, unknown>).$schema
          );
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

      if ("model" in configContent) {
        const m = (configContent as Record<string, unknown>).model;
        if (typeof m !== "string" || !/^.+\/.+$/.test(m)) {
          throw Log.error(
            `Error at key model => must match "^.+\\\\/.+$" (expected "provider/model").`
          ).exit();
        }
      } else {
        throw Log.error(
          "Error at key model => Missing a required value."
        ).exit();
      }

      if ("generation" in configContent) {
        if (
          typeof (configContent as Record<string, unknown>).generation ===
            "object" &&
          (configContent as Record<string, unknown>).generation !== null
        ) {
          this.validateGeneration(
            (configContent as Record<string, unknown>).generation as object
          );
        }
      }

      if ("commit" in configContent) {
        if (
          typeof (configContent as Record<string, unknown>).commit ===
            "object" &&
          (configContent as Record<string, unknown>).commit !== null
        ) {
          this.validateCommit(
            (configContent as Record<string, unknown>).commit as object
          );
        }
      }

      if ("providers" in configContent) {
        if (
          typeof (configContent as Record<string, unknown>).providers ===
            "object" &&
          (configContent as Record<string, unknown>).providers !== null
        ) {
          this.validateProviders(
            (configContent as Record<string, unknown>).providers as object
          );
        }
      }
    }

    return Ok(configContent as Config);
  },
  validateOrError(config: unknown): Result<Config, Error> {
    let configContent: unknown;

    if (typeof config === "string") {
      const jsonResult = JsonParse(config);
      if (jsonResult.isError()) return Err(jsonResult.error);
      const parseResult = safeParse(jsonResult.ok);
      if (parseResult.isError()) {
        const zodError = parseResult.error as z.ZodError;
        return ErrFromText(
          this.transformErrorMessage(zodError.issues[0].message)
        );
      }
      configContent = parseResult.ok;
    } else {
      // Non-string: run through Zod directly to catch schema violations,
      // then continue with field-level checks below.
      const parseResult = safeParse(config);
      if (parseResult.isError()) {
        const zodError = parseResult.error as z.ZodError;
        return ErrFromText(
          this.transformErrorMessage(zodError.issues[0].message)
        );
      }
      configContent = parseResult.ok ?? config;
    }

    if (typeof configContent === "object" && configContent !== null) {
      if (Array.isArray(configContent)) {
        return ErrFromText(
          `Configuration file's structure is invalid — delete ${CONFIG_PATH} to regenerate`
        );
      }

      if (Object.keys(configContent).length === 0) {
        return ErrFromText(
          `Configuration file is empty — delete ${CONFIG_PATH} to regenerate`
        );
      }

      if ("$schema" in configContent) {
        if (
          typeof (configContent as Record<string, unknown>).$schema ===
            "object" &&
          (configContent as Record<string, unknown>).$schema !== null
        ) {
          const validation = this.validateUrl(
            (configContent as Record<string, unknown>).$schema
          );
          if (validation.isError()) {
            return ErrFromText(
              `Error at key $schema => ${validation.error.message}`
            );
          }
        }
      } else {
        return ErrFromText("Error at key $schema => Missing a required value.");
      }

      if ("model" in configContent) {
        const m = (configContent as Record<string, unknown>).model;
        if (typeof m !== "string" || !/^.+\/.+$/.test(m)) {
          return ErrFromText(
            `Error at key model => must match "^.+\\\\/.+$" (expected "provider/model").`
          );
        }
      } else {
        return ErrFromText("Error at key model => Missing a required value.");
      }

      if ("generation" in configContent) {
        if (
          typeof (configContent as Record<string, unknown>).generation ===
            "object" &&
          (configContent as Record<string, unknown>).generation !== null
        ) {
          const g = (configContent as Record<string, unknown>)
            .generation as Record<string, unknown>;
          if ("maxRetries" in g) {
            const r = this.validateInt(g.maxRetries);
            if (r.isError()) {
              return ErrFromText(
                `Error at key generation.maxRetries => ${r.error.message}`
              );
            }
          }
          if ("retryDelay" in g) {
            const r = this.validateInt(g.retryDelay);
            if (r.isError()) {
              return ErrFromText(
                `Error at key generation.retryDelay => ${r.error.message}`
              );
            }
          }
          if ("temperature" in g) {
            if (
              typeof g.temperature !== "number" ||
              Number.isNaN(g.temperature)
            ) {
              return ErrFromText(
                "Error at key generation.temperature => must be a number."
              );
            }
            if (g.temperature < 0) {
              return ErrFromText(
                "Error at key generation.temperature => must be at least 0."
              );
            }
            if (g.temperature > 2) {
              return ErrFromText(
                "Error at key generation.temperature => must not exceed 2."
              );
            }
          }
          if ("maxPromptTokens" in g) {
            const r = this.validateInt(g.maxPromptTokens, 1);
            if (r.isError()) {
              return ErrFromText(
                `Error at key generation.maxPromptTokens => ${r.error.message}`
              );
            }
          }
        }
      }

      if ("commit" in configContent) {
        if (
          typeof (configContent as Record<string, unknown>).commit ===
            "object" &&
          (configContent as Record<string, unknown>).commit !== null
        ) {
          const c = (configContent as Record<string, unknown>).commit as Record<
            string,
            unknown
          >;
          if ("maxLength" in c) {
            const r = this.validateInt(c.maxLength, 1);
            if (r.isError()) {
              return ErrFromText(
                `Error at key commit.maxLength => ${r.error.message}`
              );
            }
          }
        }
      }

      if ("providers" in configContent) {
        if (
          typeof (configContent as Record<string, unknown>).providers ===
            "object" &&
          (configContent as Record<string, unknown>).providers !== null
        ) {
          const p = (configContent as Record<string, unknown>)
            .providers as Record<string, unknown>;
          if (
            "defaults" in p &&
            typeof p.defaults === "object" &&
            p.defaults !== null
          ) {
            const d = p.defaults as Record<string, unknown>;
            if ("timeoutMs" in d) {
              const r = this.validateInt(d.timeoutMs, 0);
              if (r.isError()) {
                return ErrFromText(
                  `Error at key providers.defaults.timeoutMs => ${r.error.message}`
                );
              }
            }
          }
          for (const [name, entry] of Object.entries(p)) {
            if (name === "defaults") continue;
            if (typeof entry !== "object" || entry === null) continue;
            const e = entry as Record<string, unknown>;
            if ("baseUrl" in e) {
              const r = this.validateUrl(e.baseUrl);
              if (r.isError()) {
                return ErrFromText(
                  `Error at key providers.${name}.baseUrl => ${r.error.message}`
                );
              }
            }
            if ("timeoutMs" in e) {
              const r = this.validateInt(e.timeoutMs, 0);
              if (r.isError()) {
                return ErrFromText(
                  `Error at key providers.${name}.timeoutMs => ${r.error.message}`
                );
              }
            }
          }
        }
      }
    }

    return Ok(configContent as Config);
  },
};

export default ConfigValidationService;
export type { ConfigSchema };
