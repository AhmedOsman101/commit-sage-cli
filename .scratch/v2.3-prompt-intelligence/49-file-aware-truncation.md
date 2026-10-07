## Question

Replace the head-slice truncation with file-aware truncation under one shared budget, per `docs/plans/v2.3-prompt-intelligence.md`.

## Scope

- New `truncateDiffByFile` beside `truncateToTokens`; per-file blocks from the `getDiff` join points; noisy-first tiers, fair-share budget, line-boundary cuts with `...(truncated)` marker.
- Blame per-file line cap before tokenization; truncate + warn naming affected paths.
- `generation.maxPromptTokens` covers the whole prompt; reduction order examples, then blame, then diff, one `Log.warn` per reduction.

## Done when

Golden fixture diffs preserve every file header; budget-math unit tests pass.
