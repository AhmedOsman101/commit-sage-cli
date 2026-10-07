## Question

Ship the project-config loader plus the trust gate, per `docs/plans/v3.0-project-config-commitlint.md` and ADRs 010, 012.

## Scope

- New `src/services/projectConfig.ts`: `findProjectConfig()` (CWD-to-git-root walk for `.commitsage/config.json`), lenient parse (partial object, `//` comments + trailing commas stripped, unknown keys through, mismatches dropped + warn, `__proto__` guards). Missing file skips silently.
- New `src/services/projectTrust.ts`: per-OS fingerprint read (never written), SHA-256 over `machine-id | os | remote-or-"<no-remote>"`, approvals in `$XDG_CACHE_HOME/commitSage/trusted`. TTY approval prompt listing sensitive keys; non-TTY ignores sensitive + warns, never reads the fingerprint.
- Merge order flags > project > global > defaults in `load()` before `resolveProviderValue` sees it. Sensitive list mirrors the extension.

## Done when

Discovery, lenient-parser, hash-determinism, and non-TTY degrade tests pass; deleting the cache revokes (tested).
