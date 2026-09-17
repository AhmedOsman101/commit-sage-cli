# commit-sage Documentation

## Directory Structure

```
docs/
├── README.md            <- this file
├── agents/              # Skill conventions: issue tracker, triage labels, domain
├── adr/                 # Architecture decision records (numbered NNN-title.md)
├── specs/               # Stable scoping specs per feature, dated YYYY-MM-DD-title.md
├── plans/               # Execution plans per feature, dated YYYY-MM-DD-title.md
├── demos/               # Demo assets (gifs, tapes)
└── future-work/         # Research outputs retained from migration analysis
```

Related files outside `docs/`:

- `AGENTS.md` (repo root) — agent guide for running tasks via `mask`.
- `README.md` / `README.es-ES.md` — user-facing docs (install, usage, flags, config).
- `installer/` — Quick Install (`unix.sh` → `curl | bash`), Windows NSIS, macOS DMG.
- GitHub Issues — authoritative tracker (`docs/agents/issue-tracker.md`).

## How work flows

1. **Grill** — interview decisions (recorded as ADR `docs/adr/NNN-*.md` or grilling log).
2. **Spec** — synthesize into `docs/specs/YYYY-MM-DD-<feature>-design.md`, publish to
   GitHub Issues with `ready-for-agent`.
3. **Plan + tickets** — break the spec into `docs/plans/YYYY-MM-DD-<feature>-plan.md`
   with phased ticket tables and blocking edges.

## Convention Rules

- **Specs**: stable "what and why". Implementation-free. Dated `YYYY-MM-DD-title.md` with `Status:` header.
- **Plans**: concrete "how and in what order". Dated `YYYY-MM-DD-title.md` with `Status:` header.
- **ADRs**: decision records, numbered `NNN-kebab-title.md` (e.g. `001-cli-migration.md`). Status `Accepted`/`Superseded`.
- **Agents**: local skill conventions (`issue-tracker.md`, `triage-labels.md`, `domain.md`). Mirror upstream skill vocabulary but map to this repo's labels.
- Completed/superseded documents keep `Status: Done` header; git history is the archive.
