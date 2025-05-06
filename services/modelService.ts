/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */
/** biome-ignore-all lint/correctness/noUnusedVariables: <explanation> */
/** biome-ignore-all lint/correctness/noUnusedFunctionParameters: <explanation> */
import type { ApiError, CommitMessage, ErrorWithResponse } from "../index.d.ts";
import { logWarning } from "../utils/Logger.ts";
import ConfigService from "./configService.ts";

export abstract class ModelService {
  protected static readonly maxRetryBackoff = 10_000;

  protected static cleanCommitMessage(message: string): string {
    return message.trim();
  }

  protected static calculateRetryDelay(attempt: number): number {
    return Math.min(1000 * 2 ** (attempt - 1), ModelService.maxRetryBackoff);
  }

  protected static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handles API errors and returns structured error information.
   * Subclasses must provide their own implementation.
   * Default implementation returns an empty result.
   */
  protected static handleApiError(error: ErrorWithResponse): ApiError {
    // Empty implementation as per requirement
    return { errorMessage: "", shouldRetry: false };
  }

  /**
   * Generates a commit message based on a prompt and attempt number.
   * Subclasses must provide their own implementation.
   * Default implementation returns an empty commit message.
   */
  protected static generateCommitMessage(
    prompt: string,
    attempt: number
  ): Promise<CommitMessage> {
    // Empty implementation as per requirement
    return Promise.resolve({ message: "", model: "" });
  }

  /**
   * Extracts a commit message from a response.
   * Subclasses must provide their own implementation.
   * Default implementation returns an empty string.
   */
  protected static extractCommitMessage(response: any): string {
    // Empty implementation as per requirement
    return "";
  }

  protected static async handleGenerationError(
    error: ErrorWithResponse,
    prompt: string,
    attempt: number
  ): Promise<CommitMessage> {
    void logWarning(`Generation attempt ${attempt} failed:`, error);
    const { errorMessage, shouldRetry } = ModelService.handleApiError(error);

    const [maxRetries, maxRetriesError] = await ConfigService.get(
      "general",
      "maxRetries"
    );
    if (maxRetriesError !== null) throw new Error(maxRetriesError);

    if (shouldRetry && attempt < maxRetries) {
      const delayMs = ModelService.calculateRetryDelay(attempt);
      // void logInfo(`Retrying in ${delayMs / 1000} seconds...`);
      await ModelService.delay(delayMs);

      return ModelService.generateCommitMessage(prompt, attempt + 1);
    }

    throw new Error(`Failed to generate commit message: ${errorMessage}`);
  }
}
