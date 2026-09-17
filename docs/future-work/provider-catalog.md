# Provider Catalog: Complete Inventory Across All Codebases

Goal: Single source of truth for all providers. CLI target: 14 providers (11 current + 3 from VS Code v3).
Priority: Free/local-first providers first (grilling decision).

## Current CLI Providers (11)

Defined in src/services/providers/*.ts, all extending ModelService base class.

| Provider | Class | Model Default | API Base | Auth | Free Tier | Notes |
|----------|-------|---------------|----------|------|-----------|-------|
| gemini | GeminiService | gemini-2.5-flash-lite | generativelanguage.googleapis.com | API Key | Yes | Vercel AI SDK google provider |
| openai | OpenAIService | gpt-5-nano | api.openai.com/v1 | API Key | No | Vercel AI SDK openai |
| anthropic | AnthropicService | claude-sonnet-4-5 | api.anthropic.com | API Key | No | Vercel AI SDK anthropic |
| deepseek | DeepSeekService | deepseek-chat | api.deepseek.com | API Key | Yes (cheap) | OpenAI-compatible |
| mistral | MistralService | mistral-small-latest | api.mistral.ai | API Key | Yes | |
| xai | XAIService | grok-3-mini | api.x.ai | API Key | Yes | OpenAI-compatible |
| ollama | OllamaService | llama3.2 | localhost:11434 | None | Yes (local) | Custom implementation |
| moonshotai | MoonshotService | kimi-k2.5 | api.moonshot.ai | API Key | Yes | Chinese provider |
| zai | ZAIService | glm-4.5-flash | api.z.ai | API Key | Yes | Chinese provider (GLM) |
| minimax | MinimaxService | MiniMax-M2.5 | api.minimax.chat | API Key | Yes | Chinese provider |
| openrouter | OpenRouterService | openai/gpt-4.1-mini | openrouter.ai/api/v1 | API Key | Yes (free models) | Meta-provider, needs PKCE |

Architecture: All extend ModelService base class -> use Vercel AI SDK generateText (except Ollama). Retry/backoff/reasoning in base.

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

### 1. Groq (High Priority — Free, Fast)
- API: api.groq.com/openai/v1 (OpenAI-compatible)
- Models: llama-3.1-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b, gemma2-9b-it
- Free tier: 14,400 req/day, 30 RPM
- Implementation: Can use Vercel AI SDK openai provider with custom baseUrl, or new GroqService extending ModelService
- Config:
```json
"groq": { "model": "llama-3.1-70b-versatile", "baseUrl": "https://api.groq.com/openai/v1" }
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

## Configuration Schema (Target)

```json
{
  "provider": {
    "type": "gemini|openai|anthropic|deepseek|mistral|xai|ollama|moonshotai|zai|minimax|openrouter|groq|codestral|openai-compatible",
    "model": "string"
  },
  "gemini": { "model": "gemini-2.5-flash-lite", "thinkingBudget": 0, "thinkingLevel": "low" },
  "openai": { "model": "gpt-5-nano", "baseUrl": "https://api.openai.com/v1", "reasoning": "off" },
  "anthropic": { "model": "claude-sonnet-4-5", "reasoning": "off" },
  "deepseek": { "model": "deepseek-chat", "baseUrl": "https://api.deepseek.com" },
  "mistral": { "model": "mistral-small-latest" },
  "xai": { "model": "grok-3-mini", "reasoning": "off" },
  "ollama": { "baseUrl": "http://localhost:11434", "model": "llama3.2" },
  "moonshotai": { "model": "kimi-k2.5" },
  "zai": { "model": "glm-4.5-flash" },
  "minimax": { "model": "MiniMax-M2.5" },
  "openrouter": { "model": "openai/gpt-4.1-mini" },
  "groq": { "model": "llama-3.1-70b-versatile", "baseUrl": "https://api.groq.com/openai/v1" },
  "codestral": { "model": "codestral-latest", "baseUrl": "https://codestral.mistral.ai/v1" },
  "openaiCompatible": {
    "spec": "lmstudio|vllm|llamacpp|ollama-openai|custom",
    "baseUrl": "http://localhost:1234/v1",
    "model": "auto",
    "apiKey": ""
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