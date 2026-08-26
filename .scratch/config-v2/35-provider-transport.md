## Question

Implement provider transport details that T1’s skeleton depends on: `apiKey: "$ENV_VAR"` ( `$`-prefix → `Deno.env.get`, else literal; optional `null`/`""`/absent for `ollama`/`llamacpp`/`vllm` locals, fallback to `${NAME}_API_KEY` if absent), `apiType: "openai-chat" | "openai-responses" | "anthropic"` (merges `useChatCompletions` + `api`), `reasoning: boolean | ProviderReasoning` tri-state (`false`/`off`=none, `true`/`default`=provider default, else explicit level), plus `providers.<name>.models: Record<modelId, ModelPreset>` and per-value fallback `model preset > provider > defaults` for `reasoning`/`contextWindow`/`maxInputTokens`/`maxOutputTokens`/`temperature`/`timeoutMs`/`apiType`.

**Vertical slice complete when:**
- `resolveApiKey(raw, providerName)` works: `"$OPENAI_API_KEY"` → env, `"sk-…"` → literal, `""`/`null`/absent + local provider → no auth, missing env → error
- `apiType` wiring: `providers.openai.apiType="openai-responses"` calls Responses API, `anthropic` calls Anthropic-compatible, default `openai-chat`
- `reasoning` tri-state: `false`/`off` disables, `true`/`default` uses provider default, `"high"` passes explicit level to `getOpenAIProviderOptions`/`getAnthropicProviderOptions`/`getGoogleProviderOptions`
- `providers.openai.models["gpt-5-nano"]:{name, reasoning, contextWindow, maxInputTokens, maxOutputTokens, temperature}` map works; preset `reasoning:false` wins but missing `maxInputTokens` falls back to `providers.openai.maxInputTokens` → `providers.defaults.maxInputTokens`
- Migration for old `openai.apiKeyEnvVar` → `providers.openai.apiKey: "$OPENAI_API_KEY"` + `openai.useChatCompletions` → `apiType` works, with batched warning
- `config edit` for presets is the path (shallow `get/set` not required here)

**Depends on:** T1 (and T2 for token limits if needed). Blocks T4.
