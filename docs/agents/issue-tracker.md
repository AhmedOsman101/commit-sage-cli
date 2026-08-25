# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues (`AhmedOsman101/commit-sage-cli`). Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name]}]'` with `--label` / `--state` filters.
- **Comment**: `gh issue comment <number> --body "..."`
- **Labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

`gh` infers the repo from `git remote -v` when run inside the clone.

## Local body staging (optional but recommended)

For long bodies, stage first under `.scratch/<feature>/NN-slug.md` then:

```sh
gh issue create --title "..." --body-file .scratch/<feature>/NN-slug.md --label "..."
```

The staged file is the offline fallback and source for later edits (`gh issue edit <n> --body-file ...`).

## Relationships

Prefer native `gh` flags where available:

- **Sub-issue**: `gh issue create --parent <parent-number>` (or `gh issue edit <n> --parent <m>`).
- **Blocked-by**: `gh issue create --blocked-by 200,201`.
- **Blocking**: `gh issue create --blocking 300`.

Fallbacks (older `gh`): sub-issues via `gh api` on the sub-issues endpoint; dependencies via `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<id>` or a `Blocked by: #<n>` line in the body.

## Wayfinding operations (map #22 pattern)

Used by `/wayfinder`. A **map** issue labelled `wayfinder:map` holds Notes / Decisions-so-far / Fog. Child tickets carry `wayfinder:<type>`.

- **Map**: `gh issue create --label wayfinder:map --body-file ...`
- **Child ticket**: `gh issue create --parent <map-number> --label wayfinder:<type> --body-file ...` where `<type>` is `research`/`prototype`/`grilling`/`task`. Once claimed, the ticket is assigned to the driver (`--add-assignee @me`).
- **Blocking**: prefer `--blocked-by` / `--blocking` at creation. A ticket is unblocked when every blocker is closed.
- **Frontier**: list the map's open children, drop any with an open blocker or assignee; first in map order wins.
- **Resolve**: `gh issue comment <n> --body "<answer>"` → `gh issue close <n>` → append a context pointer to the map's Decisions-so-far.

## Current vocabulary

- `wayfinder:map` — map issue (#22)
- `wayfinder:task` — migration slice tickets (#23–#30)
- `wayfinder:research` / `wayfinder:prototype` / `wayfinder:grilling` — reserved per ticket type
- `ready-for-agent` — ticket is fully specified, AFK-runnable (see `triage-labels.md`)

See also: `docs/adr/001-cli-migration.md`, `docs/specs/2026-08-03-cli-migration.md`.
