# ADR 002: Config V2 — Unified `model`, `providers` Registry & Generation Renames

**Status:** Accepted  
**Date:** 2026-08-04  
**Deciders:** Ahmad Othman  
**Scope:** `src/lib/types/config.ts`, `src/lib/constants.ts`, `src/services/config.ts` + `configValidation.ts`, `src/services/providers/*`, `src/cli/config.ts` + `generate.ts`/`commit.ts`, `src/lib/utils.ts` (tokenizer)  
**Spec:** [`docs/specs/2026-08-04-config-v2.md`](../specs/2026-08-04-config-v2.md) — full problem/solution + user stories

> Grilled 2026-08-04 in batches (Q1–Q19). This ADR is the numbered archival copy of those decisions. Read it before touching any ticket in this release.

---

## Context

After the CLI migration (ADR-001, map #22, T1–T8 2026-08-03→2026-08-25) `commit-sage` is CLI-complete but its config still reflects the pre-router era:

- `provider.type` + `provider.model` as two keys that must stay in sync
- Per-provider transport scattered as unrelated top-level sections (`ollama`, `openai`, `openrouter`)
- `apiKeyEnvVar` only for OpenAI, boolean-only `reasoning`, `useChatCompletions` + `api` as two keys
- `commit.commitLanguage` strict long-form enum
- `general` and `commit.maxSubjectLength`/`initialRetryDelayMs`/`maxInputChars` ambiguous names
- No per-model presets; every model inherits the same global `timeoutMs`/`reasoning`
- Truncation is character-counted, not token-counted

Router-style CLIs (`opencode` `provider: { "9router": { … models: { "kc/stealth/ox-alpha": {limit, reasoning}}}}`, `pi` `providers: { "9router": { baseUrl, models: [{id}] }}`) both ship router-aware `provider/model` strings and per-model `limit`/`reasoning`. `commit-sage` needs the same shape to handle `9router/kc/stealth/ox-alpha` style ids where the model part itself contains slashes.

The release must be a hard rename (old keys migrated automatically) with an open `providers` registry so new routers don’t require code changes. The five edits from the user plus the `general→generation` rename are inseparable — they ship as one spec.

---

## Decisions

### 1. Top-level `model: "provider/model"` replaces `provider: {type, model}`

- Canonical storage is `model: "openai/gpt-5-nano"` (string, top-level, replaces the whole `provider` object).
- Split on **first** `/` only: `provider = s.slice(0, i)`, `model = s.slice(i+1)`. `kc/stealth/ox-alpha` → provider `9router`, model `kc/stealth/ox-alpha` (slashes preserved).
- Fail only if no `/`, empty provider part, or empty model part. Provider part validated against open union `KnownProvider | (string & {})` — known enum values get help text, custom strings (e.g. `9router`) are allowed if a `providers.<name>` entry exists.
- CLI `--model "provider/model"` replaces `--provider <name>` + `--model <name>` pair. Keep deprecated `--provider` that warns and concatenates for one run.
- No bare-provider fallback (always require `provider/model`).

### 2. `providers` registry with `providers.defaults`

```json
{
  "model": "openai/gpt-5-nano",
  "generation": { "maxRetries": 3, "retryDelay": 1000, "temperature": 0.7, "maxPromptTokens": 100000, "diffStrategy": "auto" },
  "providers": {
    "defaults": { "timeoutMs": 60000, "reasoning": "off", "apiType": "openai-chat", "contextWindow": 128000, "maxInputTokens": 100000, "maxOutputTokens": 4000 },
    "openai": {
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "$OPENAI_API_KEY",
      "apiType": "openai-chat",
      "models": { "gpt-5-nano": { "name": "GPT-5 Nano", "reasoning": false } }
    }
  },
  "commit": { "maxLength": 80, "commitLanguage": "en", "commitFormat": "conventional", "bodyStyle": "subject-body" }
}
```

- `providers` keys are `KnownProvider | (string & {})` via `"foo" | (string & {})` trick — open registry, no code change for `9router`/`llamacpp`/`vllm`.
- `providers.defaults` holds global AI defaults (`timeoutMs`, `reasoning`, `apiType`, `contextWindow`, `maxInputTokens`, `maxOutputTokens`).
- Each `providers.<name>` holds `baseUrl?`, `apiKey?`, `apiType?`, `timeoutMs?`, `reasoning?`, `contextWindow?`, `maxInputTokens?`, `maxOutputTokens?`, plus `models: Record<modelId, ModelPreset>`.
- Old `ollama`/`openai`/`openrouter` top-level sections deleted after migration.

### 3. `apiKey: "$ENV_VAR"` for every provider

- Field renamed `apiKeyEnvVar` → `apiKey`.
- If value starts with `$` → `Deno.env.get(value.slice(1))`; else literal from config.
- For local providers (`ollama`, `llamacpp`, `vllm`) the key is optional (`null`/`""`/absent = no auth).
- For non-local, missing env after `$` resolution is an error; fallback to `${NAME}_API_KEY` if `apiKey` absent.

### 4. `reasoning: boolean | ProviderReasoning`

- `false`/`"off"` = no reasoning, `true`/`"default"` = provider default, otherwise explicit level `"low"`/`"medium"`/`"high"`/`"xhigh"`/`"ultra"`.
- `ProviderReasoning` union kept, now unioned with boolean.

### 5. `apiType: "openai-chat" | "openai-responses" | "anthropic"`

- Merges old `useChatCompletions` + `api`. `openai-chat` = Chat Completions, `openai-responses` = Responses API, `anthropic` = single Anthropic type.
- Default per provider family.

### 6. Language BCP-47, store-as-given

- `commit.commitLanguage` accepts `en`/`english`/`en-US`/`ja`/`jp`/`japanese` etc. (A3, 9+ languages).
- Stored verbatim; `PromptService` normalizes internally. `ja` and `jp` both alias Japanese.

### 7. Renames: `general→generation`, `commit.maxSubjectLength→commit.maxLength`, `initialRetryDelayMs→retryDelay`, `maxInputChars→maxPromptTokens`

- Hard rename with automatic migration via refactored `migrateConfig` (not a new function).
- `generation: { maxRetries, retryDelay, temperature, maxPromptTokens, diffStrategy }` — `timeoutMs` **removed** from `generation` (lives only in `providers.defaults` per Q16 A2).
- `generation.maxPromptTokens` is token-counted via a small tokenizer (e.g. `js-tiktoken`/`gpt-tokenizer` — smallest that works with `deno compile`, spike before implementation).

### 8. Per-model preset shape

`ModelPreset: { name?: string, reasoning?: boolean|ProviderReasoning, contextWindow?: number, maxInputTokens?: number, maxOutputTokens?: number, temperature?: number }`

- `Record<modelId, ModelPreset>` as map (not array) — easier for `config edit` and `config list`.
- `name` = display name for future interactive picker.
- Preset fields are text-CLI-relevant only — `attachment`/`modalities`/`npm` from `opencode`/`pi` not ported.

### 9. Per-value fallback chain

For each of `reasoning`/`contextWindow`/`maxInputTokens`/`maxOutputTokens`/`temperature`/`timeoutMs`/`apiType`:

`providers.<name>.models.<id>[key] ?? providers.<name>[key] ?? providers.defaults[key] ?? DEFAULT_CONFIG.providers.defaults[key]`

Not all-or-nothing — per key (Q7).

### 10. `config get/set` depth limit

- `TYPE_MAP` covers `generation`/`commit`/`model`/`providers.<name>` shallow keys only.
- `providers.<name>.models` and deeper nesting intentionally out of scope for `get/set` dot-path — edit via `config edit` / `config open`. Documented as limitation (Q13 A3).

### 11. Migration

- Refactor existing `migrateConfig`: detect `general`, `provider.type`+`model`, `ollama`/`openai`/`openrouter` sections, `maxSubjectLength`, `initialRetryDelayMs`, `maxInputChars` → move to new keys, delete old, set `changed`. Collect warnings, write file once, then `Log.warning(warnings.join("\n"))` + `Log.info("Config migrated — review with: commit-sage config list")`.
- Fail only on empty model or invalid provider part; otherwise write and continue.
- Also handles `generation`/`providers` renames and `commitLanguage` aliases.

### 12. Mapping clean-up (Q14 A1)

| Section | Keys |
|---|---|
| `generation` | `maxRetries`, `retryDelay`, `temperature`, `maxPromptTokens`, `diffStrategy` |
| `providers.defaults` | `timeoutMs`, `reasoning`, `apiType`, `contextWindow`, `maxInputTokens`, `maxOutputTokens` |
| per-provider | `baseUrl`, `apiKey`, `apiType`, `timeoutMs`, `reasoning`, `contextWindow`, `maxInputTokens`, `maxOutputTokens` |
| per-model preset | `name`, `reasoning`, `contextWindow`, `maxInputTokens`, `maxOutputTokens`, `temperature` |

`maxInputTokens` (generation prompt budget) vs `providers.defaults.maxInputTokens` (model window) kept distinct and documented as `maxPromptTokens` vs `maxInputTokens`.

---

## Consequences

- **Breaking change** — old `config.json` with `provider.type`/`provider.model`/`general`/`ollama` top-level is migrated on first load; `config get provider.type` becomes `config get model`.
- **Open registry** — new routers work without code changes, at the cost of no enum exhaustiveness for `providers` keys.
- **Tokenizer dependency** — `maxPromptTokens` adds a small JS tokenizer to `deno.json`; `deno compile` size grows slightly but `maxInputChars` char slicing is no longer accurate for LLM windows.
- **Shallow `config get/set`** — deep presets must be edited as JSON; keeps `TYPE_MAP` simple at the cost of a documented limitation.
- **Docs reorg already done (T8)** — specs are `docs/specs/YYYY-MM-DD-*.md`, ADRs are `docs/adr/NNN-*.md`, plans are `docs/plans/YYYY-MM-DD-*.md` per T8 conventions.

