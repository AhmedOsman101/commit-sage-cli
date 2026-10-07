## Question

Ship `customInstructions` (inline or `.md` path) plus on-demand custom-language translation, per `docs/plans/v2.4-customization.md` and ADRs 003, 005.

## Scope

- `commit.customInstructions`: `.md` suffix + exists reads file, else literal; rendered as `## Custom Instructions` for every format.
- `commitLanguage` resolution: native template, else `~/.config/commitSage/translations.json` cache hit, else interactive translate-or-decline prompt (non-TTY counts as decline: warn + exit 0). Blank handling per ADR 003.
- Manual cache invalidation (delete the entry) documented in README.

## Done when

Resolution-order unit tests, `.md`-vs-inline detection tests, non-TTY exit-0 integration test, schema check green.
