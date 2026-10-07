## Question

Ship both commitlint engines with fail-open validation, per `docs/plans/v3.0-project-config-commitlint.md` and ADR 014.

## Scope

- Keys `commit.commitlint.{enabled (false), engine (builtin|project), maxRetries (3), rulesPath ("")}`.
- Builtin: upstream rule tables for all 11 formats (`src/services/commitlint/tables.ts`), prompt injection when enabled, mechanical auto-fix, LLM refine loop to `maxRetries`, then warn + use as-is. Skipped for `previous`.
- Project engine: discover `node_modules` commitlint CLI upward from repo root, stdin-spawn validate with 30s SIGKILL timeout, `--print-config` rules, failure warns + builtin fallback. Trust-gated (untrusted warns + builtin).

## Done when

Rule-table fixtures per format, auto-fix unit tests, stub-CLI integration (validate, timeout kill, fallback) pass.
