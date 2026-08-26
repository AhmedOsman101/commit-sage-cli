## Question

Implement the core config shape refactor that everything else depends on: replace `provider: {type, model}` with top-level `model: "provider/model"` (split first `/`, fail if no `/` or empty model), collect `ollama`/`openai`/`openrouter` top-level sections under `providers: { defaults, <name>: {baseUrl, apiKey, apiType, models}}`, rename `general→generation` + `commit.maxSubjectLength→commit.maxLength`, and refactor the existing `ConfigService.migrateConfig` to move old keys → new keys, delete old, batch warnings, fail only on empty model / invalid provider.

**Vertical slice complete when:**
- `src/lib/types/config.ts` has open union `KnownProvider | (string & {})`, `GenerationConfig`, `ProvidersConfig` + `ModelPreset` stub, `ApiType` enum
- `src/lib/constants.ts` `DEFAULT_CONFIG` shows `model` + `generation` + `providers.defaults` + `providers.<name>` + `commit.maxLength`
- `ConfigValidationService` Zod schema accepts `model: /^.+\/.+$/` and `providers` open keys, rejects bare `provider.type`
- Old `{"general":{"maxRetries":3},"provider":{"type":"openai","model":"gpt-5-nano"},"ollama":{"baseUrl":"http://localhost:11434/v1"}}` migrates on `config list` to new shape with `model: "openai/gpt-5-nano"` + `generation` + `providers.ollama` and prints batch warning `Migrated general→generation`, `Migrated provider.type+model→model`, etc., then deletes old keys
- `splitProviderModel("9router/kc/stealth/ox-alpha")` → `{provider:"9router", model:"kc/stealth/ox-alpha"}`; `split("openai")` → Err
- No `general` or `provider.type` remains after migration; `config get model` prints `provider/model`
- `mask typecheck` + `mask lint` clean; `generation` still has stubs for `maxPromptTokens`/`retryDelay` (filled in T2)

**Depends on:** nothing — first ticket. Blocks T2/T3/T4.
