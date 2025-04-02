import type { ApiError, CommitMessage, ErrorWithResponse } from "../index.d.ts";
import { logInfo, logWarning } from "../utils/Logger.ts";
import ConfigService from "./configService.ts";

export abstract class ModelService {
  protected static readonly maxRetryBackoff = 10000;

  protected static cleanCommitMessage(message: string): string {
    return message.trim();
  }

  protected static calculateRetryDelay(attempt: number): number {
    return Math.min(1000 * 2 ** (attempt - 1), this.maxRetryBackoff);
  }

  protected static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected static handleApiError(error: ErrorWithResponse): ApiError {
    throw new Error("Subclasses must implement handlApiError"); // Default
  }

  protected static generateCommitMessage(
    prompt: string,
    attempt: number
  ): Promise<CommitMessage> {
    throw new Error("Subclasses must implement generateCommitMessage"); // Default
  }

  protected static extractCommitMessage<T>(response: T): string {
    throw new Error("Subclasses must implement extractCommitMessage"); // Default
  }
  protected static async handleGenerationError(
    error: ErrorWithResponse,
    prompt: string,
    attempt: number
  ): Promise<CommitMessage> {
    void logWarning(`Generation attempt ${attempt} failed:`, error);
    const { errorMessage, shouldRetry } = this.handleApiError(error);

    if (shouldRetry && attempt < ConfigService.get("general", "maxRetries")) {
      const delayMs = this.calculateRetryDelay(attempt);
      void logInfo(`Retrying in ${delayMs / 1000} seconds...`);
      await this.delay(delayMs);

      return this.generateCommitMessage(prompt, attempt + 1);
    }

    throw new Error(`Failed to generate commit message: ${errorMessage}`);
  }
}
