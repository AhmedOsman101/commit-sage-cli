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
      return [null, "API key cannot be empty"];
    }
    if (value.length < 32) {
      return [null, "API key is too short"];
    }
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      return [null, "API key contains invalid characters"];
    }
    return [value, null];
  },
  validateOpenAIApiKey(key: string): Option<string> {
    if (!key) {
      return [null, apiValidation.errorMessages.emptyKey];
    }
    if (!key.startsWith("sk-")) {
      return [null, apiValidation.errorMessages.invalidOpenaiKey];
    }
    return [key, null];
  },
  validateGeminiApiKey(key: string): Option<string> {
    if (!key) {
      return [null, apiValidation.errorMessages.emptyKey];
    }
    if (!apiValidation.keyFormat.test(key)) {
      return [null, apiValidation.errorMessages.invalidChars];
    }
    return [key, null];
  },
  validateCodestralApiKey(key: string): Option<string> {
    if (!key) {
      return [null, apiValidation.errorMessages.emptyKey];
    }
    if (!apiValidation.keyFormat.test(key)) {
      return [null, apiValidation.errorMessages.invalidChars];
    }
    return [key, null];
  },
};

export default KeyValidationService;
