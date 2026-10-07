## Question

Delete `onlyStagedChanges` and fold it into `diffStrategy`, per `docs/plans/v3.0-project-config-commitlint.md` and ADR 011.

## Scope

- `resolveDiffMode()`: drop the `onlyStagedChanges` branch; `auto` means staged-iff-staged-exists.
- `commit.ts` gate keys off resolved mode, not a config re-read.
- Migration pass: `auto` + `onlyStagedChanges: false` rewrites to `unstaged`; all else drops the key. Batched warning, v1-to-v2 style; second run silent.
- Remove the key from types, defaults, Zod, schema tuples, `TYPE_MAP`; `config set commit.onlyStagedChanges` maps to `diffStrategy` with a deprecation warning.

## Done when

Full 6-combo migration matrix + idempotence tests pass, schema check green.
