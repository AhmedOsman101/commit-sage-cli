## Question

Wire `maxOutputTokens` through generation options with a truncation retry ladder, per `docs/plans/v2.3-prompt-intelligence.md`.

## Scope

- Resolve in `ModelService.getGenerationOptions` (model preset > provider > `generation.maxOutputTokens` > 4096); include in the returned options for all 11 `generateText` spreads.
- `finish_reason: length` (or equivalent) retries with doubled budget, ceiling 32768, max 3 bumps, layered on existing retry/backoff.

## Done when

Resolution-chain unit tests + ladder-stop tests pass; all providers compile.
