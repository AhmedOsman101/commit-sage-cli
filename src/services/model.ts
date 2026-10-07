/** biome-ignore-all lint/suspicious/noExplicitAny: Each child has different incompatible types for the same parameter */
/** biome-ignore-all lint/correctness/noUnusedFunctionParameters: This is a base class */
import { setTimeout } from "node:timers/promises";
import { DEFAULT_CONFIG } from "@/lib/constants.ts";
import { TruncatedResponseError } from "@/lib/errors.ts";
import { classifyAIError } from "@/lib/handleAiErrors.ts";
import { Log } from "@/lib/logger.ts";
import { splitProviderModel } from "@/lib/modelString.ts";
import type { CommitMessage } from "@/lib/types/commit.ts";
import type { ApiType } from "@/lib/types/config.ts";
import type { ApiError, ErrorWithResponse } from "@/lib/types/index.ts";
import ConfigService from "@/services/config.ts";

abstract class ModelService {
  protected static readonly maxRetryBackoff = 10_000;

  /**
   * Hardcoded output-budget bounds (plan Open Q #3: not configurable).
   * A commit message is ~40-60 tokens, so the base is a runaway guard,
   * not a length limit — generous because reasoning models bill their
   * thinking against the same budget.
   */
  protected static readonly defaultMaxOutputTokens = 4096;
  protected static readonly maxOutputTokensCeiling = 32_768;
  protected static readonly maxBudgetDoublings = 3;

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
   * Resolve the full `"provider/model"` string plus its split parts in one
   * load. `provider`/`modelId` feed the per-value fallback resolver
   * (`preset > provider > defaults`); `model` is the untouched canonical
   * string passed to the AI SDK.
   */
  protected static async resolveProviderAndModel(
    modelOverride?: string
  ): Promise<{ provider: string; modelId: string; model: string }> {
    const model = await ModelService.resolveModel(modelOverride);
    const split = splitProviderModel(model);
    if (split.isError()) return { provider: "openai", modelId: model, model };
    return {
      provider: split.ok.provider,
      modelId: split.ok.model,
      model,
    };
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

  protected static async getTemperature(
    providerName?: string,
    modelId?: string
  ): Promise<number | null> {
    if (providerName !== undefined) {
      const preset = await ConfigService.resolveProviderValue(
        providerName,
        modelId,
        "temperature"
      );
      // Explicit null means "do not send temperature" — it wins over the
      // global value and the compiled default instead of falling through.
      if (preset === null) return null;
      if (typeof preset === "number") return preset;
    }
    const result = await ConfigService.get("generation", "temperature");
    if (result.isError())
      return (DEFAULT_CONFIG.generation as unknown as Record<string, number>)
        .temperature;
    const value = result.ok as unknown;
    if (value === null) return null;
    return (
      (value as number) ??
      (DEFAULT_CONFIG.generation as unknown as Record<string, number>)
        .temperature
    );
  }

  /**
   * Resolve the per-attempt output budget.
   *
   * Base precedence: model preset > provider entry > provider defaults >
   * `generation.maxOutputTokens` > 4096. The provider chain reuses
   * `resolveProviderValue` (preset > entry > defaults); the global value is
   * consulted only when that chain is unset.
   *
   * Truncation is the one failure a retry can fix only by asking for more
   * room — replaying the same budget would cut off at exactly the same
   * place — so each retry doubles the budget, capped at 3 doublings and a
   * 32768 ceiling.
   */
  protected static async getMaxOutputTokens(
    providerName?: string,
    modelId?: string,
    attempt = 1
  ): Promise<number> {
    let base: number | undefined;
    if (providerName !== undefined) {
      const resolved = await ConfigService.resolveProviderValue(
        providerName,
        modelId,
        "maxOutputTokens"
      );
      if (
        typeof resolved === "number" &&
        Number.isFinite(resolved) &&
        resolved > 0
      )
        base = Math.floor(resolved);
    }
    if (base === undefined) {
      const result = await ConfigService.get("generation", "maxOutputTokens");
      if (result.isOk()) {
        const value = result.ok as unknown;
        if (typeof value === "number" && Number.isFinite(value) && value > 0)
          base = Math.floor(value);
      }
    }
    base ??= ModelService.defaultMaxOutputTokens;
    base = Math.min(base, ModelService.maxOutputTokensCeiling);
    const doublings = Math.min(
      Math.max(attempt - 1, 0),
      ModelService.maxBudgetDoublings
    );
    return Math.min(base * 2 ** doublings, ModelService.maxOutputTokensCeiling);
  }

  protected static async getGenerationOptions(
    providerName?: string,
    modelId?: string,
    attempt = 1
  ): Promise<{
    temperature?: number;
    maxOutputTokens: number;
    abortSignal: AbortSignal | undefined;
  }> {
    const temperature = await ModelService.getTemperature(
      providerName,
      modelId
    );
    const reasoning = await ModelService.getReasoningLevel(
      providerName,
      modelId
    );
    const maxOutputTokens = await ModelService.getMaxOutputTokens(
      providerName,
      modelId,
      attempt
    );
    let timeoutMs: number = (
      DEFAULT_CONFIG.providers as unknown as Record<
        string,
        Record<string, number>
      >
    ).defaults.timeoutMs;
    if (providerName !== undefined) {
      const resolved = await ConfigService.resolveProviderValue(
        providerName,
        modelId,
        "timeoutMs"
      );
      if (typeof resolved === "number") timeoutMs = resolved;
    } else {
      const timeoutResult = await ConfigService.get("providers", "defaults");
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
          const prov = (cfg.ok as unknown as Record<string, unknown>)
            .providers as Record<string, unknown> | undefined;
          const d = prov?.defaults as Record<string, unknown> | undefined;
          if (d && typeof d.timeoutMs === "number")
            timeoutMs = d.timeoutMs as number;
        }
      }
    }

    // Reasoning models reject temperature: omit it when explicitly nulled
    // or when an explicit reasoning level is configured, instead of sending
    // a value the model will warn about or refuse.
    const omitTemperature =
      temperature === null ||
      temperature === undefined ||
      reasoning !== undefined;
    if (omitTemperature) {
      Log.debug(
        "[modelService.getGenerationOptions] omitting temperature " +
          `(${temperature === null ? "explicitly disabled" : `reasoning level "${reasoning}" set`})`
      );
    }

    return {
      ...(omitTemperature ? {} : { temperature: temperature as number }),
      maxOutputTokens,
      abortSignal: timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined,
    };
  }

  /**
   * Tri-state reasoning resolver (Config V2).
   *
   * Resolution is per-value `preset > provider > defaults`. `false`/`"off"`
   * (disabled) and `true`/`"default"` (provider default — no explicit level)
   * both yield `undefined` (no provider options); otherwise the explicit
   * level string (`"low"`/`"medium"`/…) is returned for the provider-options
   * helpers. Called without args it keeps the legacy `providers.defaults`
   * behavior.
   */
  protected static async getReasoningLevel(
    providerName?: string,
    modelId?: string
  ): Promise<string | undefined> {
    let reasoning: unknown;
    if (providerName !== undefined) {
      reasoning = await ConfigService.resolveProviderValue(
        providerName,
        modelId,
        "reasoning"
      );
      if (reasoning === undefined || reasoning === null) {
        reasoning = (
          DEFAULT_CONFIG.providers as unknown as Record<
            string,
            Record<string, unknown>
          >
        ).defaults.reasoning;
      }
    } else {
      const result = await ConfigService.get("providers", "defaults");
      reasoning = (
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
          const prov = (cfg.ok as unknown as Record<string, unknown>)
            .providers as Record<string, unknown> | undefined;
          const d = prov?.defaults as Record<string, unknown> | undefined;
          if (d && "reasoning" in d) reasoning = d.reasoning;
        }
      }
    }

    if (
      reasoning === false ||
      reasoning === "off" ||
      reasoning === true ||
      reasoning === "default"
    )
      return;
    if (typeof reasoning !== "string") return;
    return reasoning;
  }

  /**
   * Resolve `apiType` per-value `preset > provider > defaults`
   * (model presets carry no `apiType`, so they fall through to the provider).
   * Unknown/missing values fall back to `"openai-chat"`.
   */
  protected static async getApiType(
    providerName?: string,
    modelId?: string
  ): Promise<ApiType> {
    const fallback: ApiType = (
      DEFAULT_CONFIG.providers as unknown as Record<
        string,
        Record<string, unknown>
      >
    ).defaults.apiType as ApiType;
    if (providerName === undefined) return fallback ?? "openai-chat";
    const resolved = await ConfigService.resolveProviderValue(
      providerName,
      modelId,
      "apiType"
    );
    if (
      resolved === "openai-chat" ||
      resolved === "openai-responses" ||
      resolved === "anthropic"
    )
      return resolved;
    return fallback ?? "openai-chat";
  }

  protected static async getOpenAIProviderOptions(options?: {
    forceReasoning?: boolean;
    provider?: string;
    modelId?: string;
  }) {
    const reasoning = await ModelService.getReasoningLevel(
      options?.provider,
      options?.modelId
    );

    if (!reasoning) return;

    return {
      openai: {
        reasoningEffort: reasoning,
        ...(options?.forceReasoning ? { forceReasoning: true } : {}),
      },
    };
  }

  protected static async getAnthropicProviderOptions(
    provider?: string,
    modelId?: string
  ) {
    const reasoning = await ModelService.getReasoningLevel(provider, modelId);

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

  protected static async getGoogleProviderOptions(
    provider?: string,
    modelId?: string
  ) {
    const reasoning = await ModelService.getReasoningLevel(provider, modelId);

    if (!reasoning) return;

    return {
      google: {
        thinkingConfig: {
          thinkingLevel: reasoning,
        },
      },
    };
  }

  protected static async getXaiProviderOptions(
    provider?: string,
    modelId?: string
  ) {
    const reasoning = await ModelService.getReasoningLevel(provider, modelId);

    if (!reasoning) return;

    return {
      xai: {
        reasoningEffort: reasoning === "medium" ? "high" : reasoning,
      },
    };
  }

  /**
   * True when the model stopped because the output budget ran out. The AI
   * SDK normalizes every provider to `"length"`; the `"max_tokens"`
   * spellings cover raw provider payloads that leak through unwrapped.
   */
  protected static isTruncationFinishReason(reason: unknown): boolean {
    if (typeof reason !== "string") return false;
    const normalized = reason.toLowerCase().replace(/[-_]/g, "");
    return normalized === "length" || normalized === "maxtokens";
  }

  /**
   * Turn a length-truncated response into a retryable failure. The throw
   * funnels into `handleGenerationError`, whose retry re-enters
   * `generateCommitMessage` with `attempt + 1` — and therefore a doubled
   * budget via `getMaxOutputTokens`.
   */
  protected static throwIfTruncated(
    finishReason: unknown,
    providerLabel: string,
    model: string
  ): void {
    if (ModelService.isTruncationFinishReason(finishReason)) {
      Log.debug(
        `[modelService] truncated response detected (finishReason=${finishReason}), retrying with doubled budget`
      );
      throw new TruncatedResponseError(
        providerLabel,
        `${model} exhausted its output budget`
      );
    }
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
