# Provider Catalog: Complete Inventory Across All Codebases

Goal: Single source of truth for all providers. CLI target: 12 providers (11 original + the `groq` preset).
Priority: Free/local-first providers first (grilling decision).

## Current CLI Providers (12)

Defined in `src/services/providers/*.ts` as adapters, registered via `defineProvider` / `registerAdapter` in `providerRegistry.ts`. The per-provider "Model Default" is the migration fallback from `ConfigService.migrateConfig` (`modelMap`); the active model is the top-level `model` string.

| Provider | Adapter | Model Default | API Base | Auth | Free Tier | Notes |
|----------|---------|---------------|----------|------|-----------|-------|
| gemini | `geminiAdapter` | `gemini-4-hydrogen` | generativelanguage.googleapis.com | API Key | Yes | `thinkingLevel` for 3.x/4.x, `thinkingBudget` for 2.5 |
| openai | `openaiAdapter` | `gpt-5.6-luna` | api.openai.com/v1 | API Key | No | AI SDK `@ai-sdk/openai` |
| anthropic | `anthropicAdapter` | `claude-haiku-5-5` | api.anthropic.com | API Key | No | AI SDK `@ai-sdk/anthropic` |
| deepseek | `deepseekAdapter` | `deepseek-flash` | api.deepseek.com | API Key | Yes (cheap) | OpenAI-compatible |
| mistral | `mistralAdapter` | `mistral-small-latest` | api.mistral.ai | API Key | Yes | rolling "latest small" alias |
| xai | `xaiAdapter` | `grok-3-mini` | api.x.ai | API Key | Yes | OpenAI-compatible |
| ollama | `ollamaAdapter` | `llama3.2` | localhost:11434 | None | Yes (local) | custom transport |
| moonshotai | `moonshotaiAdapter` | `kimi-k2.5` | api.moonshot.ai | API Key | Yes | Chinese provider |
| zai | `zaiAdapter` | `glm-4.7-flash` | api.z.ai | API Key | Yes | Chinese provider (GLM) |
| minimax | `minimaxAdapter` | `MiniMax-M2.5` | api.minimax.chat | API Key | Yes | Chinese provider |
| openrouter | `openrouterAdapter` | `openrouter/free` | openrouter.ai/api/v1 | API Key | Yes (free models) | meta-provider; free-models router |
| groq | `groqAdapter` | `openai/gpt-oss-120b` | api.groq.com/openai/v1 | API Key | Yes | fast free-tier inference |

Architecture: each provider is an adapter registered through `defineProvider` / `registerAdapter`; the Vercel AI SDK handles transport for all except Ollama (custom). Reasoning options are supplied per adapter.

## VS Code v2.2.13 Providers (4)

| Provider | Notes |
|----------|-------|
| openai | Axios direct, gpt-3.5-turbo default |
| codestral | Mistral code model — codestral-latest default. Missing in CLI |
| gemini | Axios direct, gemini-1.5-flash default |
| ollama | Axios direct, mistral default (different from CLI's llama3.2) |

## VS Code v3.3.2 Providers (8+)

| Provider | Class | Auth | Notes |
|----------|-------|------|-------|
| gemini | GeminiService | API Key | Thinking budget/level config |
| openai | OpenAIService | API Key | Reasoning effort |
| anthropic/claude | AnthropicService | API Key | Thinking config |
| deepseek | DeepSeekService | API Key | OpenAI-compatible |
| xai | XAIService | API Key | OpenAI-compatible |
| ollama | OllamaService | None | Local |
| openrouter | OpenRouterService | PKCE OAuth | vscode:// URI handler, token refresh |
| groq | GroqService | API Key | Missing in CLI — fast, free tier |
| codestral | CodestralService | API Key | Missing in CLI — Mistral code model |
| openai-compatible | OpenAICompatibleService | API Key / None | Missing in CLI — #1 Priority |

## Missing Providers to Add to CLI

### 1. Groq (Added — Free, Fast)
> Status: **added** as `groqAdapter` (see the provider table above). Default model: `openai/gpt-oss-120b`.
- API: api.groq.com/openai/v1 (OpenAI-compatible)
- Models: `openai/gpt-oss-120b` (default), `qwen/qwen3-8b-27b` (lighter, same free tier)
- Free tier: 14,400 req/day, 30 RPM
- Config (Config V2 shape):
```json
"groq": { "baseUrl": "https://api.groq.com/openai/v1", "apiKey": "$GROQ_API_KEY" }
```

### 2. Codestral (Medium Priority — Code Specialist)
- API: codestral.mistral.ai/v1 (OpenAI-compatible)
- Model: codestral-latest (22B, code-optimized)
- Free tier: Limited (Mistral account)
- Implementation: OpenAI-compatible, minimal custom code
- Config:
```json
"codestral": { "model": "codestral-latest", "baseUrl": "https://codestral.mistral.ai/v1" }
```

### 3. OpenAI-Compatible / Custom (HIGHEST PRIORITY — Local LLMs)
Not a single provider — a spec registry for any OpenAI-compatible endpoint.

| Spec ID | Name | Default Base URL | Default Model | Auth | Health Check |
|---------|------|------------------|---------------|------|--------------|
| lmstudio | LM Studio | http://localhost:1234/v1 | auto | None | /models |
| vllm | vLLM | http://localhost:8000/v1 | auto | API Key | /models |
| llamacpp | llama.cpp server | http://localhost:8080/v1 | auto | None | /health |
| ollama-openai | Ollama (OpenAI compat) | http://localhost:11434/v1 | auto | None | /models |
| custom | Custom endpoint | User-defined | User-defined | API Key | User-defined |

Architecture: Single OpenAICompatibleService implementing Provider protocol. Reads provider.openaiCompatible.spec + provider.openaiCompatible.baseUrl + provider.openaiCompatible.model.

```json
"openaiCompatible": {
  "spec": "lmstudio",
  "baseUrl": "http://localhost:1234/v1",
  "model": "qwen2.5-coder-7b",
  "apiKey": "optional"
}
```

Auto-discovery: On startup, probe known local endpoints (localhost:1234, :8000, :11434/v1, :8080) -> suggest spec.

## Provider Capability Matrix

| Capability | gemini | openai | anthropic | deepseek | mistral | xai | ollama | moonshot | zai | minimax | openrouter | groq | codestral | openai-compat |
|------------|--------|--------|-----------|----------|---------|-----|--------|----------|-----|---------|------------|------|-----------|---------------|
| Free tier | Yes | No | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Limited | Yes (local) |
| Local | No | No | No | No | No | No | Yes | No | No | No | No | No | No | Yes |
| Reasoning/Thinking | Yes | Yes | Yes | No | No | Yes | No | No | No | No | Partial | No | No | Partial |
| Streaming | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Tool calling | Yes | Yes | Yes | Yes | Yes | Yes | No | No | No | No | Yes | Yes | Yes | Yes |
| Vision | Yes | Yes | Yes | No | No | No | No | No | No | No | Yes | No | No | Partial |
| PKCE OAuth | No | No | No | No | No | No | No | No | No | No | Yes | No | No | No |

## Configuration Shape (Config V2)

The shipped config uses a top-level `model` string plus a `providers` registry — there is no `provider.type` object (legacy configs are migrated by `ConfigService.migrateConfig`). `providers.defaults` holds shared AI defaults; `providers.<name>` overrides transport per provider. The per-provider "Model Default" values in the table above are migration fallbacks only; the active model is always the top-level `model` string.

```json
{
  "model": "openai/gpt-5.6-luna",
  "providers": {
    "defaults": { "timeoutMs": 60000, "reasoning": "off", "apiType": "openai-chat" },
    "openai": { "baseUrl": "https://api.openai.com/v1", "apiKey": "$OPENAI_API_KEY", "apiType": "openai-chat" },
    "ollama": { "baseUrl": "http://localhost:11434/api" },
    "openrouter": { "baseUrl": "https://openrouter.ai/api/v1" },
    "groq": { "baseUrl": "https://api.groq.com/openai/v1", "apiKey": "$GROQ_API_KEY" }
  }
}
```

## Implementation Notes

### Vercel AI SDK Providers (gemini, openai, anthropic, deepseek, mistral, xai, groq, codestral, openrouter, openai-compatible)
All use generateText from ai package. Only difference: provider factory + options.

```typescript
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

// In providerRegistry.ts
const providerFactories = {
  gemini: (config) => createGoogleGenerativeAI({ apiKey: config.apiKey, baseUrl: config.baseUrl }),
  openai: (config) => createOpenAI({ apiKey: config.apiKey, baseUrl: config.baseUrl }),
  anthropic: (config) => createAnthropic({ apiKey: config.apiKey, baseUrl: config.baseUrl }),
  // deepseek, mistral, xai, groq, codestral, openrouter, openai-compatible all use createOpenAI with different baseUrl
};
```

### Custom Implementations (ollama, moonshotai, zai, minimax)
Extend ModelService directly. Keep as-is unless migrating to Vercel AI SDK (moonshotai/zai/minimax may not have SDK providers).

### OpenRouter PKCE (Deferred)
- CLI cannot use vscode:// URI handler
- Device Code Flow (RFC 8628): User visits https://openrouter.ai/device, enters code
- Alternative: Localhost callback server (spawn http://localhost:PORT/callback, open browser)
- Fallback: Manual token entry (current pattern)

## Testing Strategy per Provider

| Provider | Test Approach |
|----------|---------------|
| Vercel AI SDK providers | Mock generateText response; test prompt construction, option mapping |
| Ollama | Integration test against local Ollama (optional, marked integration) |
| OpenAI-compatible | Mock server (MSW or Deno HttpServer); test spec registry, health check |
| OpenRouter | Mock device code flow; test token refresh logic |

## Provider Addition Checklist

For each new provider:
- [ ] Add to ProviderType union in src/lib/types/config.ts
- [ ] Add default model to modelMap in ConfigService.migrateConfig
- [ ] Add config section to DEFAULT_CONFIG in src/lib/constants.ts
- [ ] Add validation in ConfigValidationService
- [ ] Implement provider class (extend ModelService or implement Provider protocol)
- [ ] Register in providerRegistry.ts
- [ ] Add to SUPPORTED_PROVIDERS in src/cli/commit.ts for --provider flag help
- [ ] Update README provider table
- [ ] Add to config.schema.json

See roadmap.md for phasing. See architecture-comparison.md for protocol design.