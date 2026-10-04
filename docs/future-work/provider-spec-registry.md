# Phase B — Provider Spec Registry (Custom Providers)

> **Status:** Planned · **Depends on:** Phase A · **Ships:** v2.1.0
> **Roadmap:** [`v2-refactor-roadmap.md`](v2-refactor-roadmap.md) (decision D4)

## Problem

Config V2's registry is open on the config side but closed on the dispatch side:

- `providers.<any-name>` parses fine; `model: "9router/kc/stealth/ox-alpha"` splits into provider `9router`, model `kc/stealth/ox-alpha`.
- But `providerRegistry.ts` is a closed `Record<11-known, class>` — an unknown provider name throws at `getProviderService`.

So "add any OpenAI-compatible or Anthropic-compatible endpoint" stops one step short. Grilled decision **D4(c)**: known providers stay first-class citizens in the codebase; the user is free to use anything else by declaring it in config with `id`, `baseUrl`, `apiKey`, `apiType`, and a list of models each with its own schema.

Prior art the user named: **opencode** and **oh-my-pi** — both accept arbitrary provider entries in config and dispatch generically on protocol type.

## Design

### Config shape

New optional field on a provider entry: a `models` map. Each model carries its own schema (per-model overrides already exist as `ModelPreset` in V2 — this formalizes them).

```jsonc
// config.json (relevant excerpt)
{
  "model": "9router/kc/stealth/ox-alpha",
  "providers": {
    "defaults": { "timeoutMs": 60000, "reasoning": "off", "apiType": "openai-chat" },
    "9router": {
      "baseUrl": "https://api.9router.com/v1",
      "apiKey": "$NINE_ROUTER_KEY",
      "apiType": "openai-chat",
      "models": {
        "kc/stealth/ox-alpha": { "name": "Kimi K2", "reasoning": "high", "maxOutputTokens": 8192 },
        "cl/glm-5.3-flash":   { "name": "GLM 5.3 Flash", "reasoning": false, "temperature": 0.3 }
      }
    },
    "my-anthropic-proxy": {
      "baseUrl": "https://proxy.internal/anthropic",
      "apiKey": "$PROXY_KEY",
      "apiType": "anthropic"
    }
  }
}
```

Rules:

- A `providers.<name>` entry with `baseUrl` + `apiType` is sufficient to become a usable provider.
- `apiKey` follows the existing V2 rule: `"$ENV_VAR"` → env, otherwise literal.
- `models.<id>` entries are optional per-model overrides (`reasoning`, `contextWindow`, `maxInputTokens`, `maxOutputTokens`, `temperature`, `name`) — the same fields `ModelPreset` already carries.
- Known providers (the 11) keep their first-class adapters; their entries win over generic dispatch, unchanged.
- Model IDs may contain `/` (the `provider/model` split takes the first segment only — verify in `resolveProviderAndModel`).

### Dispatch

```typescript
// providerRegistry.ts (Phase A shape: name → ProviderAdapter)
function getAdapter(provider: string, config: Config): ProviderAdapter {
  const known = knownAdapters[provider];
  if (known) return known;

  const entry = config.providers[provider];
  if (!entry) throw new ConfigurationError(
    `Unknown provider "${provider}". Add a providers.${provider} entry with baseUrl and apiType.`
  );
  return genericAdapterFor(entry.apiType); // openai-chat | openai-responses | anthropic
}

// generic.ts (new, small)
const genericAdapters: Record<ApiType, ProviderAdapter> = {
  "openai-chat":      defineProvider({ createModel: (ctx) => createOpenAI({ apiKey: [REDACTED:auth_header], baseURL: ctx.baseUrl }).chat(ctx.modelId) }),
  "openai-responses": defineProvider({ createModel: (ctx) => createOpenAI({ apiKey: [REDACTED:auth_header], baseURL: ctx.baseUrl }).responses(ctx.modelId) }),
  "anthropic":        defineProvider({ createModel: (ctx) => createAnthropic({ apiKey: [REDACTED:auth_header], baseURL: ctx.baseUrl })(ctx.modelId) }),
};
```

Phase A's `run()` doesn't care whether the adapter came from the known map or the generic fallback — the seam holds. This is why B sits on A.

### Preset specs (nice-to-have, deferred)

Preset specs for common local servers with default base URLs and health endpoints (`lmstudio`, `vllm`, `llamacpp`, `ollama-openai`), plus optional auto-discovery probing of localhost ports — the v2.1 idea from [`feature-gap.md`](feature-gap.md). **Deferred**: a user can express all of it manually today via `providers.<name>`; the spec layer is sugar, not capability. Keep in this doc as a future slice, not in the phase checklist.

### Validation changes

- `configValidation.ts`: `models` values zod-checked against the `ModelPreset` shape; provider entries keep optional `models` (unknown provider entries with only `models` and no `baseUrl`/`apiType` are an error: "cannot dispatch").
- Unknown provider name + no `providers.<name>` entry → error naming the fix (not a silent fallthrough).
- `config.schema.json`: regenerate with `models` on provider entries.

### Migration note (map vs array)

Grilled D4 asked for "an array of models each with its own schema". Shipped V2 already uses a **map** (`models?: Record<string, ModelPreset>`). Keep the map: keys are model IDs, which the config already uses for lookup (`model: "provider/id"`), and a map avoids a redundant `id` field per entry. The plan text's "array" is satisfied by the map's keyset; document this in the schema description so the shape is intentional, not accidental.

## Steps

1. `generic.ts` — three adapter literals (trivial after Phase A).
2. Registry fallback in `providerRegistry.ts` + the no-entry error path.
3. Validation: `models` on provider entries + the "cannot dispatch" error.
4. `config.schema.json` regeneration.
5. README: "Using a custom provider" section (9router-style example verbatim from above).

## Verification

- `mask run generate --model 9router/<real-model>` with a `providers.9router` entry pointing at a real OpenAI-compatible endpoint (the workstation's own 9router works — note: occasionally overloaded, retry).
- Same with `apiType: "anthropic"` against an Anthropic-compatible proxy.
- Negative: `model: "unknown-thing/foo"` with no entry → clean error naming the fix.
- `config list` shows custom entries alongside the 11 known providers.
- Known-provider regression: `model: "openai/gpt-5-nano"` still dispatches to the first-class adapter, not the generic one.

## Risks

| Risk | Mitigation |
|------|-----------|
| Endpoint needs nonstandard headers/params | `providers.<name>` gains optional `headers` (pass-through into `createOpenAI`/`createAnthropic` options); escape hatch remains: promote to a first-class adapter file |
| Model IDs with `/` break the provider split | verify `resolveProviderAndModel` splits on the first `/` only before starting |
| Generic anthropic adapter + non-Anthropic quirks (version header) | `createAnthropic` sends its own default headers; `headers` escape hatch covers the rest |
| Users expect auto-discovery (spec layer) | explicitly deferred, documented as future slice above |
