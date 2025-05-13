import { Ok, type Result, Text2Err } from "./result.ts";

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
  baseValidation(value: string): Result<string> {
    if (!value) {
      return Text2Err("API key cannot be empty");
    }
    if (value.length < 32) {
      return Text2Err("API key is too short");
    }
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      return Text2Err("API key contains invalid characters");
    }
    return Ok(value);
  },
  validateOpenAIApiKey(key: string): Result<string> {
    if (!key) {
      return Text2Err(apiValidation.errorMessages.emptyKey);
    }
    if (!key.startsWith("sk-")) {
      return Text2Err(apiValidation.errorMessages.invalidOpenaiKey);
    }
    return Ok(key);
  },
  validateGeminiApiKey(key: string): Result<string> {
    if (!key) {
      return Text2Err(apiValidation.errorMessages.emptyKey);
    }
    if (!apiValidation.keyFormat.test(key)) {
      return Text2Err(apiValidation.errorMessages.invalidChars);
    }
    return Ok(key);
  },
  validateCodestralApiKey(key: string): Result<string> {
    if (!key) {
      return Text2Err(apiValidation.errorMessages.emptyKey);
    }
    if (!apiValidation.keyFormat.test(key)) {
      return Text2Err(apiValidation.errorMessages.invalidChars);
    }
    return Ok(key);
  },
};

export default KeyValidationService;
