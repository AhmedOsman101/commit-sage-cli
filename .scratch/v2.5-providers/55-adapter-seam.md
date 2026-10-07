## Question

Introduce the adapter seam and migrate the first provider family, per `docs/plans/v2.5-providers.md` phase 1 and ADR 007.

## Scope

- New `src/services/providerAdapter.ts`: `ProviderAdapter`, `defineProvider()` helper, `adapterRegistry`, shared `ModelService.run()` (resolve apiKey/baseUrl/apiType/reasoning/timeoutMs, single wrap + generateText, one retry callback). Public `ModelService` surface unchanged.
- Migrate the debug-template trio (minimax/moonshot/openrouter) to literals behind the registry.
- `mask typecheck` per step; byte-identical prompts before/after via fixture diffs.

## Done when

Trio resolves through the registry, prompt fixtures unchanged, typecheck green.
