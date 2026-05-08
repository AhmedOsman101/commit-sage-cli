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
  protected static readonly reasoningLevels = [
    "low",
    "medium",
    "high",
  ] as const;

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
  public static generateCommitMessage(
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

  protected static async getTemperature() {
    return await ConfigService.get("general", "temperature").then(result =>
      result.unwrap()
    );
  }

  protected static async getGenerationOptions() {
    const temperature = await ModelService.getTemperature();
    const timeoutMs = await ConfigService.get("provider", "timeoutMs").then(
      result => result.unwrap()
    );

    return {
      temperature,
      abortSignal: timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined,
    };
  }

  protected static async getReasoningLevel() {
    const reasoning = await ConfigService.get("provider", "reasoning").then(r =>
      r.unwrap()
    );

    if (reasoning === "off") return;
    return reasoning;
  }

  protected static async getOpenAIProviderOptions(options?: {
    forceReasoning?: boolean;
  }) {
    const reasoning = await ModelService.getReasoningLevel();

    if (!reasoning) return;

    return {
      openai: {
        reasoningEffort: reasoning,
        ...(options?.forceReasoning ? { forceReasoning: true } : {}),
      },
    };
  }

  protected static async getAnthropicProviderOptions() {
    const reasoning = await ModelService.getReasoningLevel();

    if (!reasoning) return;

    return {
      anthropic: {
        thinking: {
          type: "adaptive" as const,
        },
        effort: reasoning,
      },
    };
  }

  protected static async getGoogleProviderOptions() {
    const reasoning = await ModelService.getReasoningLevel();

    if (!reasoning) return;

    return {
      google: {
        thinkingConfig: {
          thinkingLevel: reasoning,
        },
      },
    };
  }

  protected static async getXaiProviderOptions() {
    const reasoning = await ModelService.getReasoningLevel();

    if (!reasoning) return;

    return {
      xai: {
        reasoningEffort: reasoning === "medium" ? "high" : reasoning,
      },
    };
  }

  protected static async handleGenerationError(
    error: unknown,
    prompt: string,
    attempt: number,
    retryFn: (Prompt: string, Attempt: number) => Promise<CommitMessage>
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
