## Question

Port 4 formats (`emojiKarma`, `google`, `atom`, `detailed`) across all 6 native languages, per `docs/plans/v2.4-customization.md`.

## Scope

- New files `src/templates/formats/{emojiKarma,google,atom,detailed}.ts`, each a `Record<CommitLanguage, string>` over english/russian/chinese/japanese/german/french (ported from the extension, attributed).
- Extend `COMMIT_FORMATS` (`src/lib/types/commit.ts`), `SUPPORTED_LANGUAGES` (+german/french), register in `src/templates/index.ts`.
- `getTemplate` fallback unchanged: unknown language warns + English.
- `mask schema build` (enum propagates via `configSchema.ts`).

## Done when

Template-presence tests (6 keys each), golden english samples per format, `mask schema check` green.
