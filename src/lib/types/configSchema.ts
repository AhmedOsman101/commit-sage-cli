// AUTO-GENERATED — single source of truth for the JSON Schema exported at
// `config.schema.json`. Every field, enum, bound, regex, and description lives
// here. Do not edit `config.schema.json` directly; run `mask schema` after
// modifying this file.
//
// Tuples (`as const`) are the source of truth for enum members. The generator
// script spreads them into mutable arrays at JSON-serialization time so the
// JSON Schema can express them.

import { COMMIT_FORMATS, SUPPORTED_LANGUAGES } from "@/lib/types/commit.ts";
import {
  BODY_STYLES,
  DIFF_STRATEGIES,
  SUPPORTED_API_TYPES,
  SUPPORTED_REASONING_LEVELS,
} from "@/lib/types/config.ts";

// The canonical URL of the generated schema. Used as the `$schema` `const` and
// (eventually) `$id`. Keep in lockstep with `Config["$schema"]` in
// `src/lib/types/config.ts` and the constant in `src/lib/constants.ts`.
const SCHEMA_URI =
  "https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/refs/heads/main/config.schema.json" as const;

const SCHEMA_DIALECT = "http://json-schema.org/draft-07/schema#" as const;

// ----- Section: generation -----

const GENERATION_CONFIG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["maxRetries", "retryDelay", "temperature"],
  properties: {
    maxRetries: {
      type: "integer",
      minimum: 0,
    },
    retryDelay: {
      type: "integer",
      minimum: 0,
    },
    temperature: {
      type: "number",
      minimum: 0,
      maximum: 2,
      description: "Global generation temperature used by all providers",
    },
    maxPromptTokens: {
      type: "integer",
      minimum: 1,
      description:
        "Maximum diff size sent to the model before truncation (token-counted)",
    },
    diffStrategy: {
      type: "string",
      enum: [...DIFF_STRATEGIES],
      description:
        "Whether to analyze staged changes, unstaged changes, or automatically prefer staged changes when present",
    },
  },
} as const;

// ----- Section: providers -----

const PROVIDER_DEFAULTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    timeoutMs: {
      type: "integer",
      minimum: 0,
      description:
        "Request timeout in milliseconds for model generation. Set to 0 to disable the timeout.",
    },
    reasoning: {
      oneOf: [
        { type: "boolean" },
        { type: "string", enum: [...SUPPORTED_REASONING_LEVELS] },
      ],
      description:
        "Reasoning effort level for providers that support it, or boolean tri-state",
    },
    apiType: {
      type: "string",
      enum: [...SUPPORTED_API_TYPES],
      description: "Provider API type",
    },
    contextWindow: {
      type: "integer",
      minimum: 1,
    },
    maxInputTokens: {
      type: "integer",
      minimum: 1,
    },
    maxOutputTokens: {
      type: "integer",
      minimum: 1,
    },
  },
} as const;

const MODEL_PRESET_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    reasoning: {
      oneOf: [
        { type: "boolean" },
        { type: "string", enum: [...SUPPORTED_REASONING_LEVELS] },
      ],
    },
    contextWindow: { type: "integer", minimum: 1 },
    maxInputTokens: { type: "integer", minimum: 1 },
    maxOutputTokens: { type: "integer", minimum: 1 },
    temperature: { type: "number", minimum: 0, maximum: 2 },
  },
} as const;

const PROVIDER_ENTRY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    baseUrl: {
      type: "string",
      format: "uri",
    },
    apiKey: {
      type: "string",
      description: 'API key literal or "$ENV_VAR" reference',
    },
    apiType: {
      type: "string",
      enum: [...SUPPORTED_API_TYPES],
    },
    timeoutMs: {
      type: "integer",
      minimum: 0,
    },
    reasoning: {
      oneOf: [
        { type: "boolean" },
        { type: "string", enum: [...SUPPORTED_REASONING_LEVELS] },
      ],
    },
    contextWindow: { type: "integer", minimum: 1 },
    maxInputTokens: { type: "integer", minimum: 1 },
    maxOutputTokens: { type: "integer", minimum: 1 },
    models: {
      type: "object",
      additionalProperties: { ...MODEL_PRESET_SCHEMA },
      description:
        "Per-model preset overrides, keyed by model id (may contain slashes)",
    },
  },
} as const;

const PROVIDERS_CONFIG_SCHEMA = {
  type: "object",
  additionalProperties: { ...PROVIDER_ENTRY_SCHEMA },
  properties: {
    defaults: { ...PROVIDER_DEFAULTS_SCHEMA },
  },
} as const;

// ----- Section: commit -----

const COMMIT_CONFIG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["commitFormat", "onlyStagedChanges", "commitLanguage"],
  properties: {
    autoCommit: {
      type: "boolean",
    },
    autoPush: {
      type: "boolean",
    },
    commitFormat: {
      type: "string",
      enum: [...COMMIT_FORMATS],
      description: "Commit message style. Applicable in AI mode only.",
    },
    onlyStagedChanges: {
      type: "boolean",
    },
    commitLanguage: {
      type: "string",
      enum: [...SUPPORTED_LANGUAGES],
    },
    promptForRefs: {
      type: "boolean",
    },
    maxLength: {
      type: "integer",
      minimum: 1,
      description:
        "Maximum allowed length for the first line of the commit message",
    },
    bodyStyle: {
      type: "string",
      enum: [...BODY_STYLES],
      description:
        "Controls whether the generated commit message includes only a subject, a subject and body, or a subject, body, and optional footer",
    },
  },
} as const;

// ----- Section: model -----

const MODEL_SCHEMA = {
  type: "string",
  pattern: "^.+/.+$",
  description:
    'Canonical model string "provider/model" (first slash splits provider from model id)',
} as const;

// ----- Root (assembled last so section refs resolve) -----

const ROOT_SCHEMA = {
  $schema: SCHEMA_DIALECT,
  type: "object",
  additionalProperties: false,
  required: ["$schema", "commit", "model"],
  properties: {
    $schema: {
      type: "string",
      const: SCHEMA_URI,
    },
    model: MODEL_SCHEMA,
    generation: GENERATION_CONFIG_SCHEMA,
    providers: PROVIDERS_CONFIG_SCHEMA,
    commit: COMMIT_CONFIG_SCHEMA,
  },
} as const;

export { ROOT_SCHEMA, SCHEMA_URI };
