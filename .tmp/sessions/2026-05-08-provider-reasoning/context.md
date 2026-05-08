# Task Context: Provider Reasoning Support

Session ID: 2026-05-08-provider-reasoning
Created: 2026-05-08T00:00:00Z
Status: in_progress

## Current Request
make provider.reasoning apply to more providers where supported. Also adjust the migration strategy if needed.

## Context Files (Standards to Follow)
- ~/.config/opencode/context/core/standards/code-quality.md
- ~/.config/opencode/context/core/standards/code-analysis.md
- ~/.config/opencode/context/development/principles/clean-code.md
- ~/.config/opencode/context/core/workflows/component-planning.md

## Reference Files (Source Material to Look At)
- ~/work/TS/commit-sage/src/services/modelService.ts
- ~/work/TS/commit-sage/src/services/configService.ts
- ~/work/TS/commit-sage/src/services/openaiService.ts
- ~/work/TS/commit-sage/src/services/anthropicService.ts
- ~/work/TS/commit-sage/src/services/geminiService.ts
- ~/work/TS/commit-sage/src/services/xaiService.ts
- ~/work/TS/commit-sage/src/services/zaiService.ts
- ~/work/TS/commit-sage/src/services/openrouterService.ts
- ~/work/TS/commit-sage/src/services/deepseekService.ts
- ~/work/TS/commit-sage/src/services/mistralService.ts
- ~/work/TS/commit-sage/src/services/moonshotService.ts
- ~/work/TS/commit-sage/src/services/minimaxService.ts
- ~/work/TS/commit-sage/src/services/configValidationService.ts
- ~/work/TS/commit-sage/src/lib/constants.ts
- ~/work/TS/commit-sage/src/lib/configServiceTypes.d.ts
- ~/work/TS/commit-sage/config.schema.json

## External Docs Fetched
- AI SDK OpenAI: supports `providerOptions.openai.reasoningEffort`, `reasoningSummary`, and `forceReasoning` for custom base URLs.
- AI SDK Anthropic: supports `providerOptions.anthropic.thinking` and optional `effort`.
- AI SDK Google: supports `providerOptions.google.thinkingConfig` with `thinkingLevel`.
- AI SDK xAI: supports `providerOptions.xai.reasoningEffort`.
- OpenAI-compatible guidance: use OpenAI provider options only where backend supports them.

## Components
- Shared reasoning option mapping in `ModelService`
- Provider-specific wiring for Anthropic, Gemini, xAI, and OpenAI-compatible backends
- Config migration updates for newly added config defaults
- Schema/config validation alignment if needed

## Constraints
- Keep `provider.reasoning` as a generic config surface: `off | low | medium | high`
- Keep `provider.model` as the single source of truth for model selection
- Minimize changes and reuse current provider service patterns
- Validate with `deno check src/main.ts` and `deno task format`

## Exit Criteria
- [ ] `provider.reasoning` affects more supported providers using correct SDK option names
- [ ] Existing configs migrate safely to include missing defaults where appropriate
- [ ] Validation and schema remain aligned with runtime behavior
- [ ] `deno check src/main.ts` passes
- [ ] `deno task format` passes
