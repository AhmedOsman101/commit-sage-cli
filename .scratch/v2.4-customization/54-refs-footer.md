## Question

Ship the refs footer end to end, per `docs/plans/v2.4-customization.md` and ADRs 004, 011-notes (`promptForRefs` deprecation).

## Scope

- Keys `commit.refs.{enabled,source,value,placement,branchPattern}` (+ defaults); `commit.promptForRefs` stays a deprecated no-op.
- `src/services/refUtils.ts`: first-capture-group-wins extraction, invalid regex falls back to default pattern, no match omits silently.
- Flags `--ref` (repeatable, wins) and `--refs` (force one prompt); non-TTY without tokens warns and skips.
- Rendering `Refs: <a>, <b>` per placement, appended post-generation before preview and `--edit` handoff.

## Done when

Extraction unit tests, placement rendering tests, TTY prompt-once and non-TTY skip integration tests pass.
