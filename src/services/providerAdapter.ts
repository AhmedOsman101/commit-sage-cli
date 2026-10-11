import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { generateText, wrapLanguageModel } from "ai";
import { ConfigurationError } from "@/lib/errors.ts";
import type {
  ApiType,
  ProviderEntry,
  ProvidersConfig,
} from "@/lib/types/config.ts";
import ConfigService from "@/services/config.ts";

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
 * `apiKey` via `getEffectiveApiKey` (`useApiKey`, env `$`-prefix, local
 * no-auth), the rest via the per-value `preset > entry > defaults` chain. Adapters read
 * from here instead of touching `ConfigService` themselves, which is what
 * keeps the twelve provider files from drifting apart again.
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
   * `getReasoningLevel` already normalizes them to `undefined`. The context
   * is there for mappings that depend on resolved values (e.g. OpenAI's
   * `forceReasoning`, which applies only off the official base URL). May be
   * async: the Gemini hook resolves its first-class thinking keys through
   * the shared per-value chain.
   */
  providerOptions?: (
    reasoning: string | undefined,
    ctx: ProviderRunContext
  ) =>
    | SharedProviderOptions
    | undefined
    | Promise<SharedProviderOptions | undefined>;
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

const OFFICIAL_OPENAI_BASE_URL = "https://api.openai.com/v1";

/**
 * Reasoning options for OpenAI-wire clients (the `openai` and `groq`
 * literals plus generic chat/responses adapters): the explicit level,
 * forcing reasoning mode off the official base URL where model ids aren't
 * on the SDK allowlist.
 */
function openAIProviderOptions(
  reasoning: string | undefined,
  ctx: ProviderRunContext
): SharedProviderOptions | undefined {
  if (!reasoning) return;
  return {
    openai: {
      reasoningEffort: reasoning,
      ...(ctx.baseUrl !== OFFICIAL_OPENAI_BASE_URL
        ? { forceReasoning: true }
        : {}),
    },
  };
}

/**
 * Reasoning options for Anthropic-wire clients (the `anthropic` literal
 * plus the generic `anthropic` adapter).
 */
function anthropicProviderOptions(
  reasoning: string | undefined
): SharedProviderOptions | undefined {
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

/**
 * Fetch wrapper for no-auth runs: the OpenAI/Anthropic SDKs fall back to
 * their own env keys when `apiKey` is unset, which would silently re-add
 * auth that `useApiKey: false` (or a keyless local host) explicitly
 * declined. Deleting the header keeps the promise absolute. Used by the
 * generic adapters only — known literals keep their SDK env behavior.
 * Typed as the global fetch (the SDKs never touch `preconnect`).
 */
const noAuthFetch = ((
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
): Promise<Response> => {
  if (input instanceof Request) {
    const headers = new Headers(input.headers);
    headers.delete("authorization");
    return fetch(new Request(input, { headers }));
  }
  const headers = new Headers(init?.headers);
  headers.delete("authorization");
  return fetch(input, { ...init, headers });
}) as typeof fetch;

/**
 * Placeholder key for no-auth runs. The SDKs refuse an unset key
 * (throwing before any request), so the generic adapters send this dummy
 * while `noAuthFetch` strips the resulting header — it never leaves the
 * process. Only used when `ctx.apiKey` is `undefined`, which `run()`
 * produces exactly for `useApiKey: false` and keyless local hosts.
 */
const NO_AUTH_API_KEY = "unused-no-auth";

/**
 * Build an adapter for a provider name with no built-in literal from its
 * config entry. The wire format follows `apiType`; entry `headers` ride in
 * the client factory via closure. Never self-registered: one instance per
 * gateway (headers differ), resolved fresh by `getAdapter`.
 */
function genericAdapterFor(
  apiType: ApiType,
  options: { name: string; headers?: Record<string, string> }
): ProviderAdapter {
  const { name, headers } = options;
  const extra = headers ? { headers } : {};
  if (apiType === "anthropic") {
    return defineProvider({
      name,
      createModel: (ctx: ProviderRunContext) =>
        createAnthropic({
          apiKey: ctx.apiKey ?? NO_AUTH_API_KEY,
          baseURL: ctx.baseUrl,
          ...extra,
          ...(ctx.apiKey === undefined ? { fetch: noAuthFetch } : {}),
        })(ctx.modelId),
      providerOptions: anthropicProviderOptions,
    });
  }
  return defineProvider({
    name,
    createModel: (ctx: ProviderRunContext) => {
      const client = createOpenAI({
        apiKey: ctx.apiKey ?? NO_AUTH_API_KEY,
        baseURL: ctx.baseUrl,
        ...extra,
        ...(ctx.apiKey === undefined ? { fetch: noAuthFetch } : {}),
      });
      return apiType === "openai-responses"
        ? client(ctx.modelId)
        : client.chat(ctx.modelId);
    },
    providerOptions: openAIProviderOptions,
  });
}

/**
 * Resolve a provider name to its adapter. Known literals win; an unknown
 * name with `providers.<name>.baseUrl` dispatches a generic adapter for
 * its `apiType` (default `openai-chat`); without `baseUrl` it's a
 * `ConfigurationError` naming the missing key. Pass a preloaded providers
 * map to skip the config load.
 */
async function getAdapter(
  providerName: string,
  providers?: ProvidersConfig
): Promise<ProviderAdapter> {
  const known = adapterRegistry[providerName];
  if (known) return known;
  let entries = providers;
  let loadError: Error | undefined;
  if (!entries) {
    const loaded = await ConfigService.load();
    if (loaded.isOk()) {
      entries = (loaded.ok as unknown as Record<string, unknown>)
        .providers as ProvidersConfig;
    } else {
      loadError = loaded.error as Error;
    }
  }
  const entry = (
    entries as Record<string, ProviderEntry | undefined> | undefined
  )?.[providerName];
  const baseUrl =
    typeof entry?.baseUrl === "string" && entry.baseUrl
      ? entry.baseUrl
      : undefined;
  if (!baseUrl) {
    throw new ConfigurationError(
      `Unknown provider "${providerName}": set providers.${providerName}.baseUrl to dispatch it as a generic OpenAI-compatible gateway` +
        (loadError ? ` (config load failed: ${loadError.message})` : "")
    );
  }
  const apiType =
    entry?.apiType === "openai-responses" || entry?.apiType === "anthropic"
      ? entry.apiType
      : "openai-chat";
  return genericAdapterFor(apiType, {
    name: providerName,
    headers: entry?.headers,
  });
}

export type {
  AdapterModel,
  ProviderAdapter,
  ProviderRunContext,
  SharedProviderOptions,
};
export {
  adapterRegistry,
  anthropicProviderOptions,
  defineProvider,
  genericAdapterFor,
  getAdapter,
  openAIProviderOptions,
  registerAdapter,
};
