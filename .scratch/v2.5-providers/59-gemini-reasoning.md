## Question

Ship Gemini thinking controls plus per-provider reasoning validation, per `docs/plans/v2.5-providers.md` phase 6 and ADR 009.

## Scope

- New keys `providers.gemini.thinkingBudget` (0 off, -1 model decides, 2.5 only, Pro floor 128) and `thinkingLevel` (`minimal|low|medium|high`, 3.x only, default `low`); 2.0/Gemma omit silently.
- Known providers validate `reasoning` against their honest subset at load: out-of-range warns + remaps to nearest valid; `true` omits temperature without forcing a level.
- Unknown gateways passthrough any inherited level verbatim (incl. `none|xhigh|max|ultra`).

## Done when

Validation-matrix unit tests, family-gating tests, `-1` budget acceptance, schema check green.
