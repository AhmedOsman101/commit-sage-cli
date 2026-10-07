## Question

Add recent-commit style examples plus the `previous` format, per `docs/plans/v2.3-prompt-intelligence.md`.

## Scope

- New `GitService.getRecentCommitMessages(count, scope)`; `mine` filters via `--author`; 20-char noise filter.
- New `PromptService` examples block; `previous` joins the `commitFormat` union (conventional template + examples); empty history warns + falls back to conventional.
- Keys `commit.recentCommitsEnabled` (false), `Count` (5, cap 20), `Scope` (`all|mine`).

## Done when

Unit + tmp-repo integration tests per plan pass; schema check green.
