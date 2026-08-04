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
  SUPPORTED_PROVIDERS,
  SUPPORTED_REASONING_LEVELS,
} from "@/lib/types/config.ts";

// The canonical URL of the generated schema. Used as the `$schema` `const` and
// (eventually) `$id`. Keep in lockstep with `Config["$schema"]` in
// `src/lib/types/config.ts` and the constant in `src/lib/constants.ts`.
const SCHEMA_URI =
  "https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/refs/heads/main/config.schema.json" as const;

const SCHEMA_DIALECT = "http://json-schema.org/draft-07/schema#" as const;

// ----- Section: general -----

const GENERAL_CONFIG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["maxRetries", "initialRetryDelayMs", "temperature"],
  properties: {
    maxRetries: {
      type: "integer",
      minimum: 0,
    },
    initialRetryDelayMs: {
      type: "integer",
      minimum: 0,
    },
    temperature: {
      type: "number",
      minimum: 0,
      maximum: 2,
      description: "Global generation temperature used by all providers",
    },
    maxInputChars: {
      type: "integer",
      minimum: 1,
      description: "Maximum diff size sent to the model before truncation",
    },
    diffStrategy: {
      type: "string",
      enum: [...DIFF_STRATEGIES],
      description:
        "Whether to analyze staged changes, unstaged changes, or automatically prefer staged changes when present",
    },
  },
} as const;

// ----- Section: ollama -----

const OLLAMA_CONFIG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    baseUrl: {
      type: "string",
      format: "uri",
    },
  },
} as const;

// ----- Section: openrouter -----

const OPENROUTER_CONFIG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    baseUrl: {
      type: "string",
      format: "uri",
      description:
        "OpenRouter API base URL (defaults to https://openrouter.ai/api/v1)",
    },
  },
} as const;

// ----- Section: openai -----

const OPENAI_CONFIG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    baseUrl: {
      type: "string",
      format: "uri",
      description:
        "OpenAI-compatible API base URL (defaults to https://api.openai.com/v1)",
    },
    apiKeyEnvVar: {
      type: "string",
      pattern: "^[A-Z_][A-Z0-9_]*$",
      description:
        "Environment variable name used to read the OpenAI-compatible API key",
    },
    useChatCompletions: {
      type: "boolean",
      description:
        "Use the Chat Completions API instead of the Responses API for OpenAI-compatible providers",
    },
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
    maxSubjectLength: {
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

// ----- Section: provider -----

const PROVIDER_CONFIG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["type", "model"],
  properties: {
    type: {
      type: "string",
      enum: [...SUPPORTED_PROVIDERS],
      description: "AI provider type",
    },
    model: {
      type: "string",
      description:
        "Model ID for the selected provider (e.g. 'gemini-2.5-flash-lite', 'gpt-5-nano', 'openai/gpt-4.1-mini')",
    },
    timeoutMs: {
      type: "integer",
      minimum: 0,
      description:
        "Request timeout in milliseconds for model generation. Set to 0 to disable the timeout.",
    },
    reasoning: {
      type: "string",
      enum: [...SUPPORTED_REASONING_LEVELS],
      description: "Reasoning effort level for providers that support it",
    },
  },
} as const;

// ----- Root (assembled last so section refs resolve) -----

const ROOT_SCHEMA = {
  $schema: SCHEMA_DIALECT,
  type: "object",
  additionalProperties: false,
  required: ["$schema", "commit", "provider"],
  properties: {
    $schema: {
      type: "string",
      const: SCHEMA_URI,
    },
    general: GENERAL_CONFIG_SCHEMA,
    ollama: OLLAMA_CONFIG_SCHEMA,
    openrouter: OPENROUTER_CONFIG_SCHEMA,
    openai: OPENAI_CONFIG_SCHEMA,
    commit: COMMIT_CONFIG_SCHEMA,
    provider: PROVIDER_CONFIG_SCHEMA,
  },
} as const;

export { ROOT_SCHEMA, SCHEMA_URI };
