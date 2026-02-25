/** biome-ignore-all lint/suspicious/noExplicitAny: Each child has different incompatible types for the same parameter */
/** biome-ignore-all lint/correctness/noUnusedFunctionParameters: This is a base class */
import { setTimeout } from "node:timers/promises";
import { classifyAIError } from "@/lib/handleAiErrors.ts";
import type {
  ApiError,
  CommitMessage,
  ErrorWithResponse,
} from "@/lib/index.d.ts";
import ConfigService from "./configService.ts";

export abstract class ModelService {
  protected static readonly maxRetryBackoff = 10_000;

  protected static cleanCommitMessage(message: string): string {
    return message.trim();
  }

  protected static calculateRetryDelay(attempt: number): number {
    return Math.min(1000 * 2 ** (attempt - 1), ModelService.maxRetryBackoff);
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

  protected static async getMaxRetries() {
    return await ConfigService.get("general", "maxRetries").then(result =>
      result.unwrap()
    );
  }

  protected static async handleGenerationError(
    error: unknown,
    prompt: string,
    attempt: number,
    retryFn: (prompt: string, attempt: number) => Promise<CommitMessage>
  ): Promise<CommitMessage> {
    const classified = classifyAIError(error);

    const maxRetries = await ModelService.getMaxRetries();

    if (classified.shouldRetry && attempt < maxRetries) {
      const delay = ModelService.calculateRetryDelay(attempt);
      await setTimeout(delay);
      return retryFn(prompt, attempt + 1);
    }

    throw new Error(`Failed to generate commit message: ${classified.message}`);
  }
}
