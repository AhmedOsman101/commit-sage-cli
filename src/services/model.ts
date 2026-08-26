/** biome-ignore-all lint/suspicious/noExplicitAny: Each child has different incompatible types for the same parameter */
/** biome-ignore-all lint/correctness/noUnusedFunctionParameters: This is a base class */
import { setTimeout } from "node:timers/promises";
import { DEFAULT_CONFIG } from "@/lib/constants.ts";
import { classifyAIError } from "@/lib/handleAiErrors.ts";
import type { CommitMessage } from "@/lib/types/commit.ts";
import type { ApiError, ErrorWithResponse } from "@/lib/types/index.ts";
import ConfigService from "@/services/config.ts";

abstract class ModelService {
  protected static readonly maxRetryBackoff = 10_000;

  protected static cleanCommitMessage(message: string): string {
    return message.trim();
  }

  protected static calculateRetryDelay(attempt: number): number {
    return Math.min(1000 * 2 ** (attempt - 1), ModelService.maxRetryBackoff);
  }

  /**
   * Resolves the model to use for this run.
   *
   * Resolution order (explicit, no shared state):
   *   1. `modelOverride` — CLI `--model` flag, if present
   *   2. `model` from the user's config file (provider/model string)
   *   3. `DEFAULT_CONFIG.model`
   */
  protected static async resolveModel(modelOverride?: string): Promise<string> {
    if (modelOverride !== undefined) return modelOverride;
    const result = await ConfigService.get("model");
    if (result.isError()) return DEFAULT_CONFIG.model as string;
    const val = result.ok as unknown as string | undefined;
    return val ?? (DEFAULT_CONFIG.model as string);
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
   *
   * `modelOverride` (optional) is the CLI `--model` flag value. It is
   * resolved against config + default by `resolveModel`.
   */
  public static generateCommitMessage(
    prompt: string,
    attempt: number,
    modelOverride?: string
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

  protected static async getMaxRetries(): Promise<number> {
    const result = await ConfigService.get("generation", "maxRetries");
    if (result.isError())
      return (DEFAULT_CONFIG.generation as unknown as Record<string, number>)
        .maxRetries;
    return (
      (result.ok as unknown as number) ??
      (DEFAULT_CONFIG.generation as unknown as Record<string, number>)
        .maxRetries
    );
  }

  protected static async getTemperature(): Promise<number> {
    const result = await ConfigService.get("generation", "temperature");
    if (result.isError())
      return (DEFAULT_CONFIG.generation as unknown as Record<string, number>)
        .temperature;
    return (
      (result.ok as unknown as number) ??
      (DEFAULT_CONFIG.generation as unknown as Record<string, number>)
        .temperature
    );
  }

  protected static async getGenerationOptions(): Promise<{
    temperature: number;
    abortSignal: AbortSignal | undefined;
  }> {
    const temperature = await ModelService.getTemperature();
    const timeoutResult = await ConfigService.get("providers", "defaults");
    let timeoutMs: number = (
      DEFAULT_CONFIG.providers as unknown as Record<
        string,
        Record<string, number>
      >
    ).defaults.timeoutMs;
    if (timeoutResult.isOk()) {
      const defaults = timeoutResult.ok as unknown as
        | Record<string, number>
        | undefined;
      if (defaults && typeof defaults.timeoutMs === "number")
        timeoutMs = defaults.timeoutMs;
    } else {
      // fallback via direct load for robustness
      const cfg = await ConfigService.load();
      if (cfg.isOk()) {
        const prov = (cfg.ok as unknown as Record<string, unknown>).providers as
          | Record<string, unknown>
          | undefined;
        const d = prov?.defaults as Record<string, unknown> | undefined;
        if (d && typeof d.timeoutMs === "number")
          timeoutMs = d.timeoutMs as number;
      }
    }

    return {
      temperature: temperature as number,
      abortSignal: timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined,
    };
  }

  protected static async getReasoningLevel(): Promise<
    string | boolean | undefined
  > {
    const result = await ConfigService.get("providers", "defaults");
    let reasoning: unknown = (
      DEFAULT_CONFIG.providers as unknown as Record<
        string,
        Record<string, unknown>
      >
    ).defaults.reasoning;
    if (result.isOk()) {
      const defaults = result.ok as unknown as
        | Record<string, unknown>
        | undefined;
      if (defaults && "reasoning" in defaults) reasoning = defaults.reasoning;
    } else {
      const cfg = await ConfigService.load();
      if (cfg.isOk()) {
        const prov = (cfg.ok as unknown as Record<string, unknown>).providers as
          | Record<string, unknown>
          | undefined;
        const d = prov?.defaults as Record<string, unknown> | undefined;
        if (d && "reasoning" in d) reasoning = d.reasoning;
      }
    }

    if (reasoning === false || reasoning === "off") return;
    return reasoning as string | boolean;
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

    if (classified.shouldRetry && attempt < (maxRetries as number)) {
      const delay = ModelService.calculateRetryDelay(attempt);
      await setTimeout(delay);
      return retryFn(prompt, attempt + 1);
    }

    throw new Error(`Failed to generate commit message: ${classified.message}`);
  }
}

export { ModelService };
