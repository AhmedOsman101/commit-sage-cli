import type { Option } from "../index.d.ts";

const apiValidation = {
  keyFormat: /^[A-Za-z0-9_-]+$/,
  openaiTestEndpoint: "https://api.openai.com/v1/models",
  errorMessages: {
    emptyKey: "API key cannot be empty",
    invalidChars: "API key contains invalid characters",
    invalidFormat: "Invalid API key format",
    invalidKey: "Invalid API key",
    rateLimit: "Rate limit exceeded",
    invalidEndpoint: "Invalid endpoint URL",
    validationFailed: (status: number) => `API validation failed: ${status}`,
    customValidationFailed: (status: number) =>
      `Custom API validation failed: ${status}`,
    invalidOpenaiKey:
      'Invalid OpenAI API key format. Key should start with "sk-"',
  },
} as const;

const KeyValidationService = {
  baseValidation(value: string): Option<string> {
    if (!value) {
      return ["API key cannot be empty", null];
    }
    if (value.length < 32) {
      return ["API key is too short", null];
    }
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      return ["API key contains invalid characters", null];
    }
    return [null, value];
  },
  validateOpenAIApiKey(key: string): Option<string> {
    if (!key) {
      return [apiValidation.errorMessages.emptyKey, null];
    }
    if (!key.startsWith("sk-")) {
      return [apiValidation.errorMessages.invalidOpenaiKey, null];
    }
    return [null, key];
  },
  validateGeminiApiKey(key: string): Option<string> {
    if (!key) {
      return [apiValidation.errorMessages.emptyKey, null];
    }
    if (!apiValidation.keyFormat.test(key)) {
      return [apiValidation.errorMessages.invalidChars, null];
    }
    return [null, key];
  },
  validateCodestralApiKey(key: string): Option<string> {
    if (!key) {
      return [apiValidation.errorMessages.emptyKey, null];
    }
    if (!apiValidation.keyFormat.test(key)) {
      return [apiValidation.errorMessages.invalidChars, null];
    }
    return [null, key];
  },
};

export default KeyValidationService;
