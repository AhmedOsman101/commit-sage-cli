# CLI Migration — Plan

> **Status:** Done — executed T1–T8 (2026-08-03 → 2026-08-25), map #22.  
> **Date:** 2026-08-03  
> **Spec:** [`docs/specs/2026-08-03-cli-migration.md`](../specs/2026-08-03-cli-migration.md)  
> **ADR:** [`docs/adr/001-cli-migration.md`](../adr/001-cli-migration.md)  
> **Map:** GitHub issue #22 `wayfinder:map` — parent of #23–#30.  
> **Original:** no standalone `plan.md` existed in `docs/cli-migration/`; this file was synthesized for T8 reorg to satisfy `docs/{specs,plans,adr}` conventions.

---

## Hierarchy

**PR = one ticket. Wayfinder map #22 + 8 child issues (T1–T8). Each ticket = one agent session. Top-level module boundaries tested via `Result` seams.**

## Ticket order

### Phase 0 — Foundation (T1–T3, sequential)

| # | Ticket | Scope | Gate |
|---|--------|-------|------|
| T1 #23 | **freeform format** (`src/templates/formats/freeform.ts`, schema `CommitFormat` enum) | AI-only unconstrained prompt; `--format freeform` | `mask typecheck` clean, `generate --format freeform` accepted |
| T2 #24 | **Decouple `src/lib/constants.ts` + config schema codegen** (`CONFIG_PATH` lazy, `DEFAULT_CONFIG` unified `provider.{type,model}`, `src/lib/types/configSchema.ts` → `config.schema.json` via `scripts/build-schema.ts`, `mask schema build/check`) | Unblocks off-repo `config` subcommand | `mask schema check` clean, `config list` outside git repo exits 0 |
| T3 #25 | **Cliffy skeleton** (`src/cli/root.ts:buildRootCommand`, `src/cli/generate|commit|config` stubs, `src/cli/flags.ts:resolveOptions/validateOptions`, `src/main.ts` exit codes 130/2/1) | Root `commit-sage` help on no-args, `--help/--version`, unknown flag → 2 | `commit-sage --help/--version` smokes |

### Phase 1 — Generate + Offline (T4–T5, after T3)

| # | Ticket | Scope | Gate |
|---|--------|-------|------|
| T4 #26 | **`generate` subcommand + `GenerateOptions` + `runEditor`** (`src/cli/generate.ts` 8 flags, `src/cli/handlers/editor.ts`, `src/cli/handlers/offline.ts` wiring) | `generate` prints to stdout; `--edit` tempfile via `$EDITOR` | `generate --help` shows 8 flags, `--context/--provider/--offline` overrides, non-TTY guard |
| T5 #27 | **`offlineGenerator.ts` + `runOffline`** (port `auto-commit-msg` contract verbatim: `parseDiffIndex`, `getConventionType`, `_collapse`, `_msgFromChanges`, `maxLength` truncation) | `generate --offline` deterministic without API | Verification cases from #27 pass; `generate --offline` outside TTY exits 0 |

### Phase 2 — Commit flow (T6, after T4+T5)

| # | Ticket | Scope | Gate |
|---|--------|-------|------|
| T6 #28 | **`commit` subcommand** (`src/cli/commit.ts` `CommitCommand`, `src/cli/prompts.ts:selectFilesToStage/confirmPrompt`, `src/services/git.ts:runStreaming`) — staging TUI (Cliffy Checkbox search+select-all), `AiService.generateMessage` / `runOffline`, `@littletof/charmd` preview, `commit.autoCommit/--yes`, `git commit [-e]`, `push` with `--push/--no-push/--yes`, `hasOriginRemote` + `-u` on first push | Interactive `commit` end-to-end | `commit --help` shows --push/--yes, fresh repo `--push` warn-and-skip exit 0 |

### Phase 3 — Config (T7, after T3; parallel with T6)

| # | Ticket | Scope | Gate |
|---|--------|-------|------|
| T7 #29 | **`config` 7 subcommands** (`src/cli/config.ts` `ConfigCommand`, `TYPE_MAP` coerce, `isUserSet` warning+fallback, `validateOrError` restore) — `get/set/list/print/path/default/open/edit` | `config get/set` persists + validates, `edit` re-validates on save with backup restore | `config --help` shows 7 subcommands, `config path` prints `CONFIG_PATH`, all 7 smokes without git repo |

### Phase 4 — Docs + installer (T8 #30, after T4+T6+T7 — this ticket)

| # | Ticket | Scope | Gate |
|---|--------|-------|------|
| T8 #30 | **README CLI-first + installer + docs reorg + Spanish sync** — `docs/{specs,plans,adr,agents}` reorg (`decisions.md` → `001-cli-migration.md`, `spec.md` → `2026-08-03-cli-migration.md`), `docs/README.md` overview, `docs/agents/*`, `README.md` restructure (subcommand tree, 6+ examples, shared flags table + config table, non-TTY callout, unified `provider.{type,model}` config), drop stale Limitations placeholder + stale per-provider docs + `deno task`, harden `installer/unix.sh`/`windows/commit-sage.nsi`/`macos/build-dmg.sh`, sync `README.es-ES.md` 1:1 | Checklist below |

## T8 verification (from handoff)

- [ ] `grep -rn "deno task" --include="*.md"` zero hits
- [ ] `grep -rn Not\ Yet\ Implemented --include="*.md"` zero — only historical docs mentioning the old heading (now archived)
- [ ] README subcommand tree + `provider.{type,model}` (not old `gemini`/`ollama` top-level), Install mentions prebuilt + `curl | bash` + `mask compile`, 6 examples, 2 flags tables, non-TTY callout
- [ ] Spanish mirrors English (`grep -c "commit-sage generate"` equal)
- [ ] `installer/unix.sh` `commit-sage --version` exits 0 (`bash -n` + smoke), NSIS `OutFile`/`File` match `mask release` `bin/`, `VIProductVersion` bumped from `1.0.0.0` if `version.txt` newer
- [ ] `ls docs/specs docs/plans docs/adr docs/agents` exits 0; dated `YYYY-MM-DD-*` + numbered `NNN-*`; `cli-migration/` gone; `demos`/`future-work` preserved; `docs/README.md` exists
- [ ] Specs/plans have `Status:` + date headers
- [ ] `mask lint` + `mask typecheck` clean
- [ ] Smokes: `commit-sage --help` (generate/commit/config), `commit --help` (--push/--yes), `config --help` (7 subcommands), `config path` prints path

## Tracking

- **Wayfinder labels:** `wayfinder:map` (parent), `wayfinder:task` (children), `ready-for-agent` (gated). Frontier = first unblocked child in map order.
- **Conventional Commits** for repo's own commits (`feat:`, `fix:`, `docs:`, `chore:`). `release-please` derives CHANGELOG — no hand `Unreleased` entry (user call, T8).
- **Skills:** `codegraph_explore` before edits, `verification-before-completion` before claiming done, `systematic-debugging` only on checklist fail.

## Done when

- [x] T1 #23 `418bba8` — freeform
- [x] T2 #24 `0443631`/`5bc7302`/`27a183d` — decoupling + schema codegen
- [x] T3 #25 `c3b54a4` — Cliffy skeleton + exit codes
- [x] T4 #26 `0758fa1` — generate
- [x] T5 #27 `23a9d3d` — offlineGenerator + runOffline
- [x] T6 #28 `5cbc823` (`b500c6a` streaming) — commit + staging TUI + --push/--no-push/--yes (closed `5a09399`)
- [x] T7 #29 `ef0e760` (`a0ff926` alias) — config 7 subcommands
- [ ] T8 #30 — this doc (last ticket; **needs human `commit + close` sign-off**, no auto-commit per Hard Rule)

## Per-ticket body template (wayfinder)

```markdown
# Ticket N: <title>

**Map:** #22 | **Type:** task | **Session:** 1

## Question

<one concrete thing this ticket resolves>

## Steps

1. ...
2. ...

## Verification

- `mask typecheck` clean
- `mask lint` clean
- Manual smokes for user-visible surface

## Blocks

- T<N+1>

## Blocked by

- T<N-1>
```
