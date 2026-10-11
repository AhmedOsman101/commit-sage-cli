# 0009 — Reasoning levels validate per provider, passthrough for unknown

Known providers accept only the reasoning values their API honors (`off|default|low|minimal|medium|high` intersected per provider; e.g. xAI only `low|high`), with out-of-range values warning and remapping to the nearest valid one instead of reaching the API and failing with a 400. Unknown (user-named gateway) providers accept the full inherited set (`none|xhigh|max|ultra` included) as verbatim passthrough, because gateways like omniroute advertise effort tiers (`none|low|medium|high|xhigh|max`) the closed providers do not. `providers.gemini.thinkingBudget` (number, 0 off, -1 model decides, Pro floor 128) and `thinkingLevel` (`minimal|low|medium|high`, 3.x only) are first-class keys with the extension's family gating. Chosen because the old ten-value global enum over-promised: values reached APIs that reject them.

## Amendment 2026-10-11 (maintainer decision)

No runtime warn-and-remap: per-provider subsets live in the JSON Schema
(editor-time validation) while at runtime any in-enum value passes through
silently — the user owns provider rejections, details go to the log file.
Remaps survive only where input would certainly error the provider (xAI
`medium` → `high`, omitting thinking knobs for families that reject them).
