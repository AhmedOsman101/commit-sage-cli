# Phase A — Provider Adapter Refactor

> **Status:** Planned · **Depends on:** nothing · **Ships:** v2.0.x
> **Roadmap:** [`v2-refactor-roadmap.md`](v2-refactor-roadmap.md) (decisions D5, D6, Q6b-a)

## Problem

`fallow dupes` (measured pre-V2): **362 lines (6.6%) duplicated across 12 files.** The two clone groups that survived Config V2:

- **33 lines × 3** (`minimax.ts`, `moonshot.ts`, `openrouter.ts`) — debug-log-heavy template
- **20 lines × 4** (`anthropic.ts`, `gemini.ts`, `openai.ts`, `xai.ts`) — minimal template
- Plus the identical `wrapLanguageModel` + `extractReasoningMiddleware({ tagName: "think" })` shell in **all 11** provider files

Every provider is the same recipe with one or two varying ingredients:

```
resolveProviderAndModel → getProviderApiKey → [baseUrl read]
→ getApiType → getGenerationOptions → getXxxProviderOptions
→ createXxxClient → wrap(think-middleware) → generateText
→ catch → handleGenerationError(retry with same closure)
```

Variation points:

| Variation | Providers affected |
|-----------|-------------------|
| Client factory (`createOpenAI` / `createAnthropic` / `createGoogleGenerativeAI` / …) | all |
| `baseUrl` source | `openai`, `ollama`, `openrouter` read it per-provider; the rest rely on SDK defaults |
| `apiType` branch (`openai.chat(model)` vs `openai(model)`) | openai (via `getApiType`) |
| Reasoning → `providerOptions` shape | 4 getters (`openai`, `anthropic`, `google`, `xai`); the other 7 pass none |
| Client constructor extras | `openrouter` (custom headers), `zai` (`forceReasoning: true`) |

`model.ts` is template-method-shaped but the template isn't shared — each subclass re-implements the shell. `handleApiError` and `extractCommitMessage` on the base are dead stubs.

Also (roadmap decision Q6b-a): `baseUrl` reads bypass the V2 per-value fallback chain. `openai.ts` calls `ConfigService.get("openai", "baseUrl")`; `ollama.ts` double-casts `DEFAULT_CONFIG.providers.ollama.baseUrl`. Both should go through `ConfigService.resolveProviderValue(provider, modelId, "baseUrl")` the way `reasoning` / `timeoutMs` / `apiType` already do. Providers without a config entry get `undefined` and keep their SDK default — behavior-neutral.

## Design

### The seam

One interface, one runner. The adapter is **data, not inheritance** (decision D5c). Per-provider files stay, but shrink to ~5-line literals so "where is provider X configured" stays greppable.

```typescript
// src/services/providerAdapter.ts (new)
import type { LanguageModel } from "ai";

export type AdapterContext = {
  apiKey: string;          // already resolved ("$ENV" dereferenced)
  baseUrl?: string;        // resolved via per-value chain, may be undefined
  modelId: string;         // model part of "provider/model"
  reasoning: ReasoningConfig;
  timeoutMs: number;
  retries: { maxRetries: number; retryDelay: number };
};

export type ProviderAdapter = {
  /** Build the AI SDK language model. The one true variation point. */
  createModel(ctx: AdapterContext): LanguageModel;

  /** Map reasoning level onto this SDK's providerOptions. Omit if unsupported. */
  providerOptions?(reasoning: ReasoningConfig): Record<string, unknown>;

  /** Client constructor extras (headers, forceReasoning, …). */
  factoryOptions?(ctx: AdapterContext): Record<string, unknown>;

  /** apiType branch override; default read from providers.<name>.apiType. */
  apiType?(ctx: AdapterContext): "openai-chat" | "openai-responses";
};

export function defineProvider(adapter: ProviderAdapter): ProviderAdapter {
  return adapter; // identity helper: gives literals a named home + type checking
}
```

```typescript
// src/services/providers/openai.ts — becomes
import { createOpenAI } from "@ai-sdk/openai";
import { defineProvider } from "@/services/providerAdapter.ts";

export default defineProvider({
  createModel(ctx) {
    const client = createOpenAI({ apiKey: ctx.apiKey, baseURL: ctx.baseUrl, ...ctx });
    return ctx.apiType === "openai-responses" ? client.responses(ctx.modelId) : client.chat(ctx.modelId);
  },
  providerOptions: getOpenAIProviderOptions, // moved from the old class
});
```

The four reasoning getters (`openai`, `anthropic`, `google`, `xai`) move verbatim onto their adapters as `providerOptions()`. The other seven providers simply omit the field — the shared shell skips it, which is exactly today's behavior.

### The shared shell (`ModelService.run`)

```typescript
// model.ts, replaces generateCommitMessage in all 11 subclasses
async run(provider: string, modelId: string, prompt: string): Promise<CommitMessage> {
  const apiKey = await ConfigService.getProviderApiKey(provider);   // unchanged
  const baseUrl  = await ConfigService.resolveProviderValue(provider, modelId, "baseUrl");  // Q6b-a
  const apiType  = await ConfigService.resolveProviderValue(provider, modelId, "apiType");
  const reasoning = await ConfigService.resolveReasoning(provider, modelId);
  const timeoutMs = await ConfigService.resolveProviderValue(provider, modelId, "timeoutMs");

  const adapter = adapterRegistry.get(provider);                    // Phase A: known map
  const model = adapter.createModel({ apiKey, baseUrl, modelId, reasoning, timeoutMs, retries });

  const wrapped = wrapLanguageModel({
    model,
    middleware: extractReasoningMiddleware({ tagName: "think" }),   // once, here
  });

  try {
    const result = await generateText({
      model: wrapped,
      prompt,
      temperature,
      maxOutputTokens,
      maxRetries,
      abortSignal,
      providerOptions: adapter.providerOptions?.(reasoning),
    });
    return extractCommitMessage(result.text, model);                // hoisted from subclasses
  } catch (error) {
    await handleGenerationError(error, { maxRetries, retryDelay, retry: () => this.run(provider, modelId, prompt) });
  }
}
```

`getGenerationOptions`, `getApiType`, `getProviderApiKey`, `handleGenerationError` keep their current signatures — they're already shared; only their call sites collapse.

### What gets deleted

| Symbol | Reason |
|--------|--------|
| `handleApiError`, `extractCommitMessage` (base-class stubs) | dead |
| 11 × private `generateCommitMessage` bodies | replaced by `ModelService.run` |
| 11 × local `wrapLanguageModel` shell | hoisted |
| `openai.ts` `ConfigService.get("openai", "baseUrl")` | per-value chain |
| `ollama.ts` `DEFAULT_CONFIG.providers.ollama.baseUrl` double-cast | per-value chain |
| per-provider `retryGenerate` closures | passed as one callback |

## Migration steps (order matters)

1. Add `providerAdapter.ts` (types + `defineProvider`) — additive, no behavior.
2. Convert one provider as a probe: **`openrouter.ts`** (it exercises baseUrl + headers + the debug-log template). Run `mask run generate --model openrouter/...` against a real endpoint; diff output byte-for-byte.
3. Convert the remaining 3 debug-template providers (`minimax`, `moonshot`) — they're near-clones of the probe.
4. Convert the 4 minimal-template providers (`anthropic`, `gemini`, `openai`, `xai`), moving their reasoning getters onto adapters.
5. Convert the rest (`deepseek`, `mistral`, `zai`, `ollama`) — each is a small variation on a converted neighbor.
6. Hoist the shell into `ModelService.run`; delete the dead base stubs.
7. Fold `baseUrl` reads into `ConfigService.resolveProviderValue` (last — it's the only step with any behavioral surface).

One commit per converted provider keeps diffs reviewable and bisectable; steps 1–5 are pure moves.

## Verification (decision D6 — smoke, no tests)

- `mask typecheck` after every step.
- `mask run` (one `generate`) per **family**, not per provider:
  - openai-chat (openai), openai-responses (openai with `apiType: "openai-responses"`), anthropic (anthropic), google (gemini), ollama (local, no key).
- Byte-diff the generated message pre/post refactor for at least one family — the refactor must be invisible in output.
- `fallow dupes` re-run at the end: target < 50 lines total across `src/services/`.

## Risks

| Risk | Mitigation |
|------|-----------|
| Retry/timeout semantics shift subtly during hoisting | `maxRetries`/`retryDelay` pass through unchanged; smoke per family catches it |
| `zai`'s `forceReasoning` / `openrouter`'s headers are constructor-level, not model-level | covered by `factoryOptions(ctx)` |
| SDK type friction (`LanguageModel` vs vendor types) | `createModel` return type is structural; cast inside the adapter only if the SDK demands it |
