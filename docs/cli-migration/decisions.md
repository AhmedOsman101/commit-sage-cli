# CLI Migration — Grilling Decisions

Captured during the planning `/grilling` session that produced this migration map. Read this before working any ticket in the migration.

## Destination

Turn `commit-sage` from a one-shot "print a commit message" tool into a full CLI with explicit subcommands (`generate`, `commit`, `config`), flag-driven config overrides, an interactive staging flow, and an offline static-analysis generator. Hook install is **out of scope** for v1; `generate` is designed text-in/text-out so a future hook ticket can call it.

## Constraints / preferences

- Deno + TypeScript stack stays.
- Project structure (`src/services`, `src/lib`, `src/templates/formats/`) stays.
- TUI / CLI parsing: **Cliffy** (`Command` for subcommands, `prompt` for staging multiselect). Already a transitive dep via `@cliffy/prompt/secret`.
- Markdown preview in terminal: **`@littletof/charmd`** (JSR). Minimal markdown→ANSI renderer tailored to terminal output. No bundled `marked` + `marked-terminal` dep bloat. Known gap: lists rendering is open in upstream TODO — patch locally if commit-body bullets render wrong.
- Config file stays **JSON** at `~/.config/commitSage/config.json` (or `%APPDATA%\commitSage\config.json` on Windows). TOML rejected — current JSON + `config.schema.json` is good.
- All providers already in registry stay; new providers not in scope.
- No tests in this migration (user call). Smoke coverage optional, recommended for the `--offline` pure-function path.
- Follow Conventional Commits for repo's own commits.

## Subcommands (final)

| Command | Purpose |
|---|---|
| `commit-sage` (no args) | Print help (git/npm convention). No silent AI generation. |
| `commit-sage help [sub]` | Print help. |
| `commit-sage generate [flags]` | Generate + print commit message to stdout. Pure text-out, hook-callable. |
| `commit-sage commit [flags]` | Interactive flow: stage files → generate → preview → confirm → commit → optional push. |
| `commit-sage config get <section>.<key>` | Print a single config value. |
| `commit-sage config set <section>.<key> <value>` | Persist a config value (writes to disk, no `--write` flag needed). |
| `commit-sage config list` | Dump full resolved config as JSON. |
| `commit-sage config path` | Print resolved config file path. |
| `commit-sage config open` | Open config file in OS-default handler. |
| `commit-sage config edit` | Open config in `$EDITOR`/`$VISUAL`/OS-fallback, re-validate on save. |

## Flags

| Flag | Applies to | Notes |
|---|---|---|
| `--offline` | `generate`, `commit` | Static-analysis generator (auto-commit-msg port). Always produces conventional-shape output (type + description). Only `--max-length` constraint applies; other format-flavor flags ignored. |
| `--context <text>` | `generate`, `commit` | AI only. Injects `## External Context\n<text>` into the prompt. |
| `--provider <name>` | `generate`, `commit` | Override `provider.type` for this run. |
| `--model <name>` | `generate`, `commit` | Override `provider.model` for this run. |
| `--format <name>` | `generate`, `commit` | One of: `conventional`, `angular`, `karma`, `emoji`, `semantic`, `freeform`. `freeform` is AI-only. |
| `--max-length <n>` | `generate`, `commit` | Override `commit.maxSubjectLength`. Applies to `--offline` too. |
| `--edit` | `generate`, `commit` | `generate`: tempfile + `$EDITOR`/`$VISUAL`, print final to stdout. `commit`: passes `-e` to `git commit`. |

## Formats (kept)

- `conventional`, `angular`, `karma`, `emoji`, `semantic` — all kept as-is (not byte-identical; each has its own type list per explore). No load/perf concern.
- `freeform` — new. Plain "Generate a commit message based on the following information" prompt. No type/scope/body constraints. AI-only. `--max-length` still applies.

## Offline generator contract

Ported from `auto-commit-msg`'s deterministic generator (no AI). The implementation must match this contract byte-for-byte on the verification cases in issue #27.

Source of truth (read these, don't guess):
- `~/work/forks/auto-commit-msg/src/prepareCommitMsg.ts` — `generateMsg`, `_msgFromChanges`, `_collapse`, `_formatMsg`
- `src/generate/{action,message,count,convCommit,convCommitConstants,parseExisting}.ts`, `src/git/parseOutput.ts`, `src/lib/{constants,paths}.ts`
- Distilled port guide: `~/work/forks/auto-commit-msg/docs/opencode/cli-port-guide.md`

Contract:
- **Input**: raw `git diff-index --name-status` lines parsed to `FileChange[]` — **not** `GitService.getDiff` (that returns per-file content for the AI prompt; the offline generator only needs the status rows).
- **Git command**: `git -c core.quotePath=false diff-index --name-status --find-renames --find-copies --no-color [--cached] HEAD`. Try `--cached` (staged) first; if empty, drop it (unstaged tracked). No rows at all → `Err(NoChangesDetectedError)`. Untracked files never appear — document "stage first".
- **Parse** (`parseDiffIndex`): `x = line[0]`, `y = " "`, tab-split `[_, from, to]`; throw if line < 4 chars or `from` missing. Rename rows are `R<score>\t<from>\t<to>` (old → new).
- **Actions → verbs** (`ACTION` enum): `M→update`, `A→create`, `D→delete`, `R→rename`, `C→copy`.
- **Type classification** (`getConventionType`, order matters):
  1. `R`/`D` → `chore` (path ignored).
  2. Path-based `getType()` order: CI (`CI_DIRS`/`CI_NAMES`) → `ci`; package manifest (`PACKAGE_NAMES` list, **excludes** `package.json`) → `build(deps)`; build file (`BUILD_NAMES`/`BUILD_EXTENSIONS`, **includes** `package.json`) → `build`; license/config (`LICENSE_NAMES`, `CONFIG_NAMES`/`CONFIG_EXTENSIONS`/`.vscode`, `.eslintrc*`/`.prettier*`/`tslint`/`webpack` name matches) → `chore`; docs (`docs/` dir prefix, `.rst`, `DOC_NAMES`) → `docs`; tests (dir segments `test|tests|spec|unit|unit_tests|__mocks__`, `.coveragerc`, `test_*`/`spec_*`/`*.test.*`/`*.spec.*`) → `test`; else unknown.
  3. `A` with unknown → `feat`.
  - Copy the constant lists wholesale from `src/generate/convCommitConstants.ts` — don't hand-pick.
- **Collapse** for >1 file (`_collapse`): all same → that type; any `build(deps)` present → `build(deps)`; else no prefix. (`package.json` → `build` + `package-lock.json` → `build(deps)` collapses to `build(deps)`.)
- **Description** (`_msgFromChanges`, `AGGREGATE_MIN = 5`):
  - 1 change → `verb <friendlyFile>`. `friendlyFile` = bare basename, but full path for names starting `readme`/`index`/`__init__`; single-quote values containing spaces. Rename uses the move/rename phrase: `move X to Y` (same name) / `rename X to Y` (same dir) / `move and rename X to Y`.
  - 2–4 all-same action → `verb a, b and c` (humanList joining, no Oxford comma). Mixed actions → count format. Rename rows here use the **bare** verb (`rename a and b`), not the phrase.
  - ≥5 → count format per action, ` and `-joined: `create 3 files and delete 2 files`.
- **Format** (`_formatMsg`): `type ? \`${type}: ${desc}\` : desc` — unknown type → bare description.
- **Adapter addition (NOT in auto-commit-msg)**: truncate subject to `--max-length` (default 80 = `maxSubjectLength`) at the last word boundary before the limit, append `…`. Source has no truncation.
- **Not ported**: old-message merge (`parseExisting.ts` `splitMsg`/`_joinOldAndNew`). `generate --offline` always emits a fresh message. Revisit only if `commit --offline` ever needs to preserve a template/prefix.

## `commit` flow (UX contract)

1. If no staged changes: TUI multiselect (Cliffy Checkbox with search + select-all) over unstaged tracked + untracked files. `git add` selected.
2. If `commit.onlyStagedChanges=true` (default) AND still no staged changes after picker → error "no staged changes", exit 1.
3. Resolve diff mode (`commit.onlyStagedChanges` + `general.diffStrategy`).
4. Generate message (AI or `--offline`).
5. Markdown preview (subject + body, ANSI-rendered).
6. Confirm dialog "Commit changes?".
7. `git commit -m "<subject>" -m "<body>"` (or `-e` if `--edit`).
8. If `--push` (or `--push <branch>`): warn-and-skip if no remote configured, otherwise `git push origin <branch>` (auto `-u` on first push to a branch).
9. Exit 0 on success.

## Config command semantics

- `set` persists to disk by default. No `--write` flag (matches git/npm/cargo convention).
- `set <section>.<key> <value>` — value parsed based on key type per `config.schema.json` (boolean / number / enum string).
- `list` prints the **merged** config (defaults + user overrides) as JSON.
- `path` / `open` / `edit` operate on the resolved config path (Linux/macOS: `~/.config/commitSage/config.json`, Windows: `%APPDATA%\commitSage\config.json`).
- Validation runs on every `set` and after every `edit` save. Invalid → reject + exit 1 (current behavior).

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success (incl. `--push` skip-no-remote with warning) |
| 1 | CLI / IO / config error |
| 130 | User abort (escaped TUI, matches SIGINT convention) |
| 2 | Usage error (unknown flag, missing required arg) |

## Non-TTY / CI behavior

- `generate`: works non-interactively. **Hard fail if no API key AND non-TTY** (interactive `Secret.prompt` would hang — user explicitly approved hard-fail for "who generates commits in CI").
- `commit`: **hard fail if non-TTY** (interactive staging + confirm required).
- `--offline` always works non-interactively (no API needed).

## Format template file layout (Q18)

Keep all 5 existing format files (`angular.ts`, `conventional.ts`, `emoji.ts`, `karma.ts`, `semantic.ts`). Add `freeform.ts`. Each file exports `CommitTemplate` (per existing `src/templates/index.ts` contract).

## Refactor targets flagged during exploration

These come from the `explore` agent's findings; future sessions should know:

1. **`constants.ts` module-load side effect** — `REPO_PATH = GitService.initialize()` runs at import time, exits 1 outside a git repo. **Must be broken** so `config` subcommand works anywhere. Move repo-path derivation behind a function called only by git-aware paths.
2. **Dead config keys become live**: `autoCommit`, `autoPush`, `promptForRefs` — defined, never read. `commit` subcommand wires them up; no schema churn.
3. **No tests exist anywhere.** User accepted this risk. Optional: add minimal smoke coverage for the offline generator (pure function, easy target).
4. **`logError` is typed `never`** (always exits 1). Don't try to recover after a `logError` call.
5. **`ConfigService.get` is unsound** (returns `Ok(undefined)` on missing key). Don't introduce new callers that rely on its non-nullability.
6. **`commit --push` with no remote** = warn-and-skip, exit 0 (not failure).
7. **`commit --edit`** = `git commit -e`. `generate --edit`** = tempfile + `$EDITOR`/`$VISUAL` (Deno env var fallback), print final to stdout.
8. **Installer (`installer/unix.sh:155`) currently runs `commit-sage --version`** expecting a version flag — must be wired up by `T3` (parser) or `T11` (installer fix).
9. **Format collapse nuance**: angular/karma/semantic are NOT byte-identical to conventional; each has its own type list (8/7/7 vs conventional's 11). "Keep them all" is a real decision, not a no-op.
10. **Stale README**: documents old per-provider config sections + `deno task run compile` (no such task). Must be updated as part of `T11`.
