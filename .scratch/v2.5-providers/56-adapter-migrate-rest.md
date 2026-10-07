## Question

Finish the literal migration for the remaining 8 providers, per `docs/plans/v2.5-providers.md` phase 2 and ADR 007.

## Scope

- Migrate minimal quad + rest to `defineProvider()` literals; move the 4 reasoning getters verbatim onto adapters.
- Fix the two baseUrl bypasses (`openai.ts:24`, `ollama.ts:23-33`) onto `resolveProviderValue(provider, modelId, "baseUrl")`.
- Delete dead `handleApiError` / `extractCommitMessage` stubs if present.

## Done when

All 11 providers resolve through the registry, prompt fixtures byte-identical, typecheck green.
