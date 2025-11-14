import { ErrFromText, Ok, type Result } from "lib-result";

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
      return ErrFromText("API key cannot be empty");
    }
    if (value.length < 32) {
      return ErrFromText("API key is too short");
    }
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      return ErrFromText("API key contains invalid characters");
    }
    return Ok(value);
  },
  validateOpenAIApiKey(key: string): Result<string> {
    if (!key) {
      return ErrFromText(apiValidation.errorMessages.emptyKey);
    }
    if (!key.startsWith("sk-")) {
      return ErrFromText(apiValidation.errorMessages.invalidOpenaiKey);
    }
    return Ok(key);
  },
  validateGeminiApiKey(key: string): Result<string> {
    if (!key) {
      return ErrFromText(apiValidation.errorMessages.emptyKey);
    }
    if (!apiValidation.keyFormat.test(key)) {
      return ErrFromText(apiValidation.errorMessages.invalidChars);
    }
    return Ok(key);
  },
};

export default KeyValidationService;
