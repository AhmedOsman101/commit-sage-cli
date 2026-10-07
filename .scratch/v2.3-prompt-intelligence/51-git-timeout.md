## Question

Bound every git subprocess with `git.timeoutMs`, per `docs/plans/v2.3-prompt-intelligence.md`.

## Scope

- New top-level `git` section, `timeoutMs` default 30000, plumbed into `CommandService.execute`.
- Blame and recent-commits timeouts degrade to empty with a warning; diff timeout is a hard error (exit 1).

## Done when

Timeout-degrade integration tests pass (blame warns, diff errors); schema check green.
