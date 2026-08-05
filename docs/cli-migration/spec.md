# CLI Migration Spec

> **Status:** ready-for-agent — produced by `/to-spec` from the planning `/grilling` session.
> **Grilling decisions:** see [`./decisions.md`](./decisions.md). Read both before starting work.
> **Tracker map:** see GitHub issue "CLI migration — wayfinder map".

## Problem Statement

`commit-sage` was originally a thin wrapper that did exactly one thing: generate a commit message and print it. The shell script (`~/scripts/git-commit`) wrapped it with all the surrounding UX — file picker, type prompt, confirmations, markdown preview, push. That meant:

1. `commit-sage` was unusable on its own. Every consumer had to reinvent the staging / confirmation / push loop.
2. No way to override config without editing the file (no `--provider`, `--model`, `--format` flags).
3. No flag parsing at all — `Deno.args` is never read. `--help`, `--version`, unknown flags all silently trigger generation.
4. No non-AI fallback — no offline static-analysis option for users without API access.
5. No way to inspect / modify config from the CLI.

This made the tool Windows-hostile (shell-script wrapper assumed gum/bash), CI-hostile (interactive `Secret.prompt` would hang), and discoverable only by reading the source.

## Solution

Turn `commit-sage` into a self-contained, cross-platform CLI with explicit subcommands and a flag-driven override layer. The interactive staging flow moves from the bash wrapper into the CLI itself (Cliffy `prompt` Checkbox). An offline static generator (ported from `auto-commit-msg`) ships as a `--offline` flag for both `generate` and `commit`. Config becomes inspectable + editable via `commit-sage config {get,set,list,path,open,edit}`. The bash wrapper becomes a thin personal-shortcut layer (or is dropped entirely — out of scope).

The `generate` subcommand is the foundation: pure text-in (diff + flags) → text-out (message). Every other subcommand is layered on top.

## User Stories

### Discovery & help
1. As a first-time user, I want to run `commit-sage` with no args and see usage, so I know what the tool does.
2. As a user, I want `commit-sage --help` and `commit-sage help <subcommand>` to print usage, so I can learn commands without reading docs.
3. As a user, I want `commit-sage --version` to print the version, so I can verify my install.
4. As a user, I want unknown flags to fail loudly with a clear error, so I notice typos.
5. As a script author, I want exit codes 0/1/2/130, so I can branch on outcome in CI/automation.

### `generate`
6. As a dev, I want `commit-sage generate` to print a commit message to stdout, so I can pipe it into `git commit -F -`.
7. As a dev, I want `commit-sage generate --provider openai --model gpt-5`, so I can override config without editing files.
8. As a dev, I want `commit-sage generate --format emoji`, so I can produce emoji-style messages.
9. As a dev, I want `commit-sage generate --max-length 50`, so I can match a project's subject length convention.
10. As a dev, I want `commit-sage generate --context "fixes #123, retry on 5xx"`, so the AI sees additional intent.
11. As a user without API access, I want `commit-sage generate --offline`, so I get a commit message without any API call.
12. As a user without API access in CI, I want `--offline` to produce conventional-style messages from the staged diff alone, so I never need a key.
13. As a user, I want `commit-sage generate --edit` to open `$EDITOR` with the message pre-filled, so I can tweak before using.
14. As a script, I want `generate` to work non-interactively (no TTY prompts), so I can call it from CI or a hook.

### `commit`
15. As a dev, I want `commit-sage commit` to run the full interactive flow: stage → generate → preview → confirm → commit.
16. As a dev, I want the staging picker to show unstaged tracked + untracked files with multi-select + search + select-all, so I can pick files fast (parity with gum in bash wrapper).
17. As a dev, I want the message preview rendered with markdown styling, so I can review it (parity with `mdcat`).
18. As a dev, I want a confirm dialog before commit, so I can abort without losing the message.
19. As a dev, I want `commit-sage commit --push` to push to the current branch after a successful commit.
20. As a dev, I want `commit-sage commit --push feature/foo` to push to a specific branch.
21. As a dev, I want `commit-sage commit --push` to warn-and-skip (not fail) when no remote is configured, so I can use it on local-only repos.
22. As a dev, I want the first push to a branch to auto-set upstream (`git push -u`), so I don't have to think about it.
23. As a dev, I want `commit-sage commit --edit` to open the editor on the staged message (passes `-e` to `git commit`).
24. As a dev, I want `commit` to hard-fail (not hang) when not in a TTY, so CI scripts don't lock up.

### `config`
25. As a user, I want `commit-sage config list` to print my merged config, so I can see what's in effect.
26. As a user, I want `commit-sage config get provider.model`, so I can inspect one value.
27. As a user, I want `commit-sage config set provider.type openai`, so I can change providers without opening a file.
28. As a user, I want `config set` to validate the new value before saving, so I don't end up with a broken config.
29. As a user, I want `commit-sage config path` to print the config file location, so I can `cat` it.
30. As a user, I want `commit-sage config open` to open the config in my OS default handler, so I can browse it.
31. As a user, I want `commit-sage config edit` to open it in `$EDITOR`/`$VISUAL`, save, and re-validate on save, so I can edit freely.

### Hooks (out of scope v1, design for it)
32. As a hook author, I want `generate` to be pure text-in/text-out, so I can call it from a `prepare-commit-msg` hook (follow-up ticket).

## Implementation Decisions

### Cliffy as the CLI/TUI library
- Cliffy `Command` for subcommand tree + help generation.
- Cliffy `prompt` `Checkbox` for staging (search + select-all).
- Already a transitive dep (`@cliffy/prompt/secret` is imported by `configService.ts`). No new runtime dep.

### Module structure (refactor)
- New `src/cli/` directory holds the Cliffy command tree: `root.ts`, `generate.ts`, `commit.ts`, `config.ts`.
- `src/main.ts` becomes a 5-line entry that delegates to the CLI root.
- `src/services/` unchanged in shape. New service: `src/services/offlineGenerator.ts` (the auto-commit-msg port).
- `src/templates/formats/freeform.ts` added. Other 5 formats unchanged.

### Breaking `constants.ts` module-load coupling
- `REPO_PATH = GitService.initialize()` at module top-level runs `git rev-parse` and exits 1 outside a repo.
- Move repo-path derivation behind a function `getRepoPathOrThrow()` called only by git-aware paths (`generate`, `commit`, existing `GitService`).
- `config` subcommand must NOT require a git repo — it imports `constants.ts` for path constants only, not `REPO_PATH`.
- Solution: split `constants.ts` — `constants.ts` keeps pure constants (paths, error messages, defaults), `repoContext.ts` (or similar) holds the lazy repo-path function.

### Dead config keys become live
- `commit.autoCommit`, `commit.autoPush`, `commit.promptForRefs` already exist in `DEFAULT_CONFIG` / `config.schema.json` / types — never read at runtime.
- `commit` subcommand reads them directly. No new config keys needed for v1.
- `autoCommit` defaults to `false`. When `true`, `commit` skips the confirm dialog (parity with `-y` in bash wrapper).

### Flag parsing strategy
- All flags parsed by Cliffy at the `Command` level.
- Flags act as **per-run overrides** of config values. Resolution order: CLI flag > env var (where applicable) > config file > default.
- `--offline` short-circuits the AI path entirely; provider/model/format flags are ignored except `--max-length`.
- `--context` AI-only. Injects `## External Context\n<value>` into the prompt before the diff section.
- `--edit` behavior differs by subcommand (see `decisions.md`).

### Offline generator
- New `src/services/offlineGenerator.ts`.
- Heuristics ported verbatim from `~/work/forks/auto-commit-msg` — **exact behavior contract lives in [`decisions.md`](./decisions.md) §"Offline generator contract"**. Read that before implementing; match it on the verification cases.
- Pure function: `generateOfflineMessage(changes: FileChange[], options: { maxLength: number }): string`. No git, no IO, no env.
- `FileChange` (`{ x, y, from, to }`) copied from the port guide, co-located in the service or `src/lib/types.ts`.
- Diff source: a new git method that runs `git diff-index --name-status …` and parses lines → `FileChange[]` (via `CommandService`). **Not** `GitService.getDiff("staged")` — that returns per-file content for the AI prompt, not status rows. Reuse `GitService` for repo-root resolution, staged→unstaged fallback, and `NoChangesDetectedError`.
- Output: conventional-shape `<type>: <description>` or bare `<description>` when type unknown. Subject truncated to `--max-length` (default 80).

### Markdown preview in terminal
- `@littletof/charmd` (JSR). Minimal markdown→ANSI renderer, no full `marked` + `marked-terminal` dep tree.
- Used in `commit` flow only (preview step). `generate` prints raw to stdout.
- Known upstream gap (lists — open TODO in charmd repo). Patch locally if commit-body bullets render wrong.

### Format templates
- All 5 existing format files kept (Q18). Add `freeform.ts`.
- `freeform` AI-only: prompt = `"You generate exactly one git commit message.\nRules:\n- One message, no fences, no labels.\n- First line ≤ ${maxLength} chars.\n- ${maxLength=80 default}.\n${contextSection}\nGit diff to analyze:\n${diff}\n${blameContext}\nFinal instruction: return only the commit message."`
- All other formats unchanged.

### Backward compatibility
- No changes to existing config schema fields. `bodyStyle` / `commitFormat` / `maxSubjectLength` continue to be read by `PromptService.generatePrompt`.
- New `freeform` enum value added to `CommitFormat` type + schema.
- Default `commitFormat` stays `conventional`.

### Error UX
- Errors go to stderr. Use existing `logError` for fatal exits; new `logWarn` for warnings (e.g. no remote on `--push`).
- Format: `"[ERROR] <message>"` (matches current convention; bash wrapper grep-s `\[ERROR\]`).
- Warnings: `"[WARN] <message>"`.

### Exit codes
- 0: success.
- 1: fatal CLI/IO/config error.
- 2: usage error (unknown flag, missing required arg).
- 130: user abort (escaped TUI).

### Build / installer
- No change to `mask compile` / `mask release` — `deno compile -A -o <path> src/main.ts` still works.
- `installer/unix.sh:155` runs `commit-sage --version` — must work after parser lands (T3 or T11 fix).
- `.github/workflows/release.yml` unchanged.

### README / docs
- README documents new subcommands + flags table.
- Document non-TTY behavior + `--offline` use case.
- Drop the "Not Yet Implemented" section (stale).
- Update the `mask run compile` mention to `mask compile`.

## Testing Decisions

Per the user's call (Q29): **no tests in this migration**. Risks called out:

- The `--offline` generator is the cheapest meaningful test target (pure function). Optional smoke coverage recommended; not required.
- Existing test infra doesn't exist (`deno.json` has no `test` task; CI only runs biome). Building test infra is a separate effort.

Future sessions may add tests; the offline generator's pure-function shape leaves the door open.

## Out of Scope (v1)

1. **`commit-sage hook install`/`uninstall`** — deferred. `generate` is designed text-in/text-out so this is a follow-up ticket, not a re-architecture.
2. **Per-repo config (`.commit-sagerc`)** — global only. Per-repo can layer on later.
3. **Custom user-defined format templates** — explicit non-goal for v1. `freeform` covers the "no constraints" case.
4. **TOML config** — JSON stays.
5. **New AI providers** — registry already covers 11. Add via existing path; not a migration concern.
6. **Shell wrapper (`~/scripts/git-commit`) rewrite/deprecation** — out of scope; user migrates it themselves after this lands.
7. **GitHub Actions release workflow changes** — no schema/behavior change there.
8. **Test infrastructure build-out** — separate effort.

## Further Notes

- The migration can ship in pieces. T1–T3 (parser + help + generate restructure) unlock T4–T7 (commit UX). T6 (offline generator) is independent and can be done anytime after T3.
- All tickets cut every layer they touch (per `to-tickets` principle): schema → service → CLI → docs in one vertical slice.
- The `decisions.md` file is the source of truth for anything ambiguous. If a ticket needs a finer decision, open a `wayfinder:grilling` child ticket rather than guess.
- Cliffy's `Command` class generates `--help` matching the mask help format the user pasted — no need to hand-write help text.
