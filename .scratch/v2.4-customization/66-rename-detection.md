## Question

Staged renames reach the AI as new-file creations because `getDiffBlocks` diffs each file with a single-path pathspec, which disables git rename detection. Reported against `feat/v2.4-customization` (Spanish README move flagged as a new file).

## Scope

- Staged loop (`src/services/git.ts:303-336`): read rename pairs from `git diff --cached --name-status`, diff renamed pairs with both paths (`git diff --cached -M -- old new`); unchanged files keep the current per-file path.
- Same treatment for the unstaged loop if it shares the flaw.
- One look at the blame analyzer's per-file diff path for the same blindness.
- Repro script first (no test harness in repo): fixture repo with staged `git mv`, assert `rename from/to` in `getDiffBlocks` output before/after.

## Done when

Repro shows `similarity index` + `rename from/to` for pure renames; `mask typecheck` + `mask lint` green.
