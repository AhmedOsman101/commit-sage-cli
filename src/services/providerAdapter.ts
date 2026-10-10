import type { generateText, wrapLanguageModel } from "ai";
import type { ApiType } from "@/lib/types/config.ts";

/**
 * Any SDK model `wrapLanguageModel` accepts, read off its own parameter
 * type so the seam can never drift from the SDK. Adapter factories return
 * the same values the old per-provider classes passed in directly.
 */
type AdapterModel = Parameters<typeof wrapLanguageModel>[0]["model"];

/**
 * The `providerOptions` shape `generateText` accepts, read off its own
 * options type so the seam can never drift from the SDK. Adapters return
 * this (or nothing); `run()` forwards it untouched.
 */
type SharedProviderOptions = NonNullable<
  Parameters<typeof generateText>[0]["providerOptions"]
>;

/**
 * Resolved inputs for a single generation run.
 *
 * `ModelService.run()` fills every field before the adapter sees it:
 * `apiKey` via `getProviderApiKey` (env `$`-prefix + local no-auth), the
 * rest via the per-value `preset > entry > defaults` chain. Adapters read
 * from here instead of touching `ConfigService` themselves, which is what
 * keeps the eleven provider files from drifting apart again.
 */
type ProviderRunContext = {
  /** Provider name from the `provider/model` split (e.g. `"openrouter"`). */
  provider: string;
  /** Model id after the first slash (multi-segment ids preserved). */
  modelId: string;
  /** Untouched canonical string passed to the AI SDK. */
  model: string;
  /** Resolved key, or `undefined` for no-auth runs. */
  apiKey: string | undefined;
  /** Resolved base URL, or `undefined` when the provider sets none. */
  baseUrl: string | undefined;
  /** Effective wire format after the adapter override below. */
  apiType: ApiType;
  /** Extra client options from `factoryOptions`, when the adapter defines any. */
  factoryOptions?: Record<string, unknown>;
};

/**
 * One provider as data instead of a `ModelService` subclass.
 *
 * Only `createModel` is required. The trio migrated in this slice
 * (minimax, moonshotai, openrouter) sends no reasoning provider options,
 * so they leave `providerOptions` unset and `run()` omits the key exactly
 * like the classes they replace did.
 */
type ProviderAdapter = {
  /** Registry key, matching the `providers.<name>` config entry. */
  name: string;
  /** Build the SDK model for this run from the resolved context. */
  createModel: (ctx: ProviderRunContext) => AdapterModel;
  /**
   * Map the explicit reasoning level to `generateText` provider options.
   * Return `undefined` (or leave unset) to send none — the `false`/`"off"`
   * and `true`/`"default"` cases never reach here because
   * `getReasoningLevel` already normalizes them to `undefined`.
   */
  providerOptions?: (
    reasoning: string | undefined
  ) => SharedProviderOptions | undefined;
  /**
   * Extra options for the client factory (e.g. OpenRouter's attribution
   * headers). `run()` exposes the result on `ctx.factoryOptions` for
   * `createModel` to merge.
   */
  factoryOptions?: (
    ctx: ProviderRunContext
  ) => Record<string, unknown> | undefined;
  /** Override the resolved `apiType` (e.g. the responses branch). */
  apiType?: (ctx: ProviderRunContext) => ApiType | undefined;
};

/**
 * Identity helper that preserves the literal's inferred type while
 * checking it against `ProviderAdapter`. A mismatch surfaces where the
 * literal is defined, not deep inside the shared runner.
 */
function defineProvider<T extends ProviderAdapter>(adapter: T): T {
  return adapter;
}

/**
 * Adapters by provider name. Provider modules self-register on load via
 * `registerAdapter`, so this file never imports them back — that
 * one-direction edge is what keeps the module graph cycle-free.
 * `providerRegistry` synthesizes its adapter-backed entries from here.
 */
const adapterRegistry: Record<string, ProviderAdapter> = {};

function registerAdapter(adapter: ProviderAdapter): void {
  adapterRegistry[adapter.name] = adapter;
}

export type {
  AdapterModel,
  ProviderAdapter,
  ProviderRunContext,
  SharedProviderOptions,
};
export { adapterRegistry, defineProvider, registerAdapter };
