import {
  APICallError,
  DownloadError,
  EmptyResponseBodyError,
  InvalidArgumentError,
  InvalidMessageRoleError,
  InvalidPromptError,
  InvalidResponseDataError,
  InvalidToolInputError,
  JSONParseError,
  LoadAPIKeyError,
  LoadSettingError,
  MessageConversionError,
  NoContentGeneratedError,
  NoImageGeneratedError,
  NoObjectGeneratedError,
  NoOutputSpecifiedError,
  NoSpeechGeneratedError,
  NoSuchModelError,
  NoSuchProviderError,
  NoSuchToolError,
  RetryError,
  ToolCallRepairError,
  TooManyEmbeddingValuesForCallError,
  TypeValidationError,
  UnsupportedFunctionalityError,
} from "ai";
import type { AxiosError } from "axios";
import { ERROR_MESSAGES } from "./constants.ts";
import { ConfigurationError } from "./errors.ts";

export type NormalizedAIError = {
  message: string;
  shouldRetry: boolean;
};

export type UnifiedError = NormalizedAIError & { status?: number };

/**
 * Unified handler for all AI SDK errors.
 *
 * It returns a normalized, consistent error object that
 * higher-level services can use for retries, logging, etc.
 */
export function handleAIError(error: unknown): NormalizedAIError | null {
  // ---- API / NETWORK ISSUES --------------------------------------------
  if (APICallError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: (error.statusCode ?? 0) >= 500,
    };
  }

  if (DownloadError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: true,
    };
  }

  // ---- INVALID INPUT / INVALID RESPONSE -------------------------------
  if (InvalidArgumentError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  if (InvalidPromptError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  if (InvalidResponseDataError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: true,
    };
  }

  if (InvalidMessageRoleError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  if (InvalidToolInputError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  // ---- JSON / PARSING -------------------------------------------------
  if (JSONParseError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: true,
    };
  }

  // ---- MISSING INPUT / OUTPUT ----------------------------------------
  if (EmptyResponseBodyError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: true,
    };
  }

  if (NoOutputSpecifiedError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  if (NoContentGeneratedError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  if (NoSpeechGeneratedError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  if (NoImageGeneratedError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  if (NoObjectGeneratedError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  // ---- MODEL / PROVIDER / TOOL NOT FOUND ------------------------------
  if (NoSuchModelError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  if (NoSuchProviderError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  if (NoSuchToolError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  // ---- API KEY / SETTINGS ---------------------------------------------
  if (LoadAPIKeyError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  if (LoadSettingError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  // ---- MESSAGE / CONVERSION ERRORS ------------------------------------
  if (MessageConversionError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  if (TypeValidationError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  // ---- TOO MANY VALUES -------------------------------------------------
  if (TooManyEmbeddingValuesForCallError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  // ---- INTERNAL TOOL REPAIR / RETRY ERRORS ----------------------------
  if (ToolCallRepairError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: true,
    };
  }

  if (RetryError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: true,
    };
  }

  // ---- UNSUPPORTED FEATURES -------------------------------------------
  if (UnsupportedFunctionalityError.isInstance(error)) {
    return {
      message: error.message,
      shouldRetry: false,
    };
  }

  // ---- FALLBACK --------------------------------------------------------
  return null;
}

export function classifyAIError(error: unknown): UnifiedError {
  // 1. Handle ConfigurationError
  if (error instanceof ConfigurationError) {
    return {
      message: ERROR_MESSAGES.configError.replace("{0}", error.message),
      shouldRetry: true,
    };
  }

  // 2. Handle AI SDK errors in one place
  const normalizedAiError = handleAIError(error);
  if (normalizedAiError) {
    return {
      message: normalizedAiError.message,
      shouldRetry: normalizedAiError.shouldRetry,
    };
  }

  // 3. Handle Axios errors
  if (isAxiosError(error)) {
    const status = error.response?.status;
    // biome-ignore lint/suspicious/noExplicitAny: For error handling
    const apiMessage = (error.response?.data as any)?.error?.message;

    switch (status) {
      case 401:
        return {
          message: ERROR_MESSAGES.authenticationError,
          shouldRetry: true,
          status,
        };
      case 402:
        return {
          message: ERROR_MESSAGES.paymentRequired,
          shouldRetry: false,
          status,
        };
      case 429:
        return {
          message: ERROR_MESSAGES.rateLimitExceeded,
          shouldRetry: true,
          status,
        };
      case 422:
        return {
          message: apiMessage || ERROR_MESSAGES.invalidRequest,
          shouldRetry: false,
          status,
        };
      case 500:
        return {
          message: ERROR_MESSAGES.serverError,
          shouldRetry: true,
          status,
        };
      default:
        return {
          message: `${ERROR_MESSAGES.apiError.replace("{0}", String(status))}: ${apiMessage || "Unknown"}`,
          shouldRetry: (status ?? 0) >= 500,
          status,
        };
    }
  }

  // 4. Fallback: unknown error
  return {
    message: error instanceof Error ? error.message : "Unknown error occurred",
    shouldRetry: false,
  };
}

function isAxiosError(err: unknown): err is AxiosError {
  return Boolean((err as AxiosError)?.isAxiosError);
}
