# Domain: commit-sage

> **Source:** distilled from `docs/specs/2026-08-03-cli-migration.md` + `docs/adr/001-cli-migration.md` + `src/lib/types/config.ts` / `src/lib/constants.ts`.

## Ubiquitous language

| Term | Meaning |
|------|---------|
| **generate** | Subcommand `commit-sage generate [flags]` — pure text-in (staged diff + flags) → text-out (commit message on stdout). Hook-callable. Interactive only for staging picker; otherwise non-interactive. |
| **commit** | Subcommand `commit-sage commit [flags]` — interactive flow: stage picker (`Checkbox` search+select-all) → message generation (AI or `--offline`) → `@littletof/charmd` markdown preview → confirm → `git commit` → optional `git push`. |
| **config** | Subcommand `commit-sage config <get\|set\|list\|print\|path\|default\|open\|edit>` — inspect/persist config at `~/.config/commitSage/config.json` (`%APPDATA%` on Windows). `set` coerces via `TYPE_MAP` + validates before persisting; `edit` keeps an in-memory backup + `validateOrError` restore. |
| **offline generator** | `src/services/offlineGenerator.ts` — deterministic port of `auto-commit-msg`. Input is `git diff-index --name-status` status rows (`FileChange[]`), not `GitService.getDiff` content. Output is conventional-shape `<type>: <description>` truncated to `maxLength` at word boundary. Flag: `--offline`. |
| **provider** | `provider.{type,model,timeoutMs,reasoning}` at `src/lib/types/config.ts`. `type` selects the AI factory; `model` is opaque string passed to that provider. Flags `--provider`/`--model` override per-run. Legacy per-provider top-level `gemini`/`openai`/`ollama` sections are gone for `type`/`model`; they remain only for `baseUrl`/`apiKeyEnvVar` transport knobs. |
| **commitFormat** | `commit.commitFormat ∈ {conventional, angular, karma, emoji, semantic, freeform}`. `freeform` is AI-only; `--offline` always emits conventional shape regardless of this. |
| **commitLanguage / lang** | `commit.commitLanguage ∈ {english, russian, chinese, japanese}`. Flag `--lang` overrides per-run. |
| **diffStrategy / onlyStagedChanges** | `general.diffStrategy ∈ {auto,staged,unstaged}` + `commit.onlyStagedChanges` boolean gate the diff sent to AI/offline. |
| **Root/help/version** | `src/cli/root.ts:buildRootCommand` — `commit-sage` bare prints help (git/npm convention), `help [sub]` explicit, `--version`/`-V` prints `VERSION` from `deno.json`/`version.txt`, unknown flags throw → exit 2, aborts → 130. |

## Invariants to preserve

- `config` never requires a git repo; `generate`/`commit` do (`GitService.isGitRepo` / `initialize`).
- `--offline` short-circuits AI; only `--max-length` matters (and `--edit` for the staged flow). `--context`/`--provider`/`--format` are ignored offline.
- Exit codes: 0 success, 1 fatal/IO/config, 2 usage, 130 abort/Escape. `--push` warn-and-skip on no remote is **not** a failure (still 0).
- Non-TTY: `generate` works only when `$API_KEY` present; `commit` hard-fails (interactive TUI would hang); `--offline` always works.

## Where to look

- CLI surface: `src/cli/root.ts`, `generate.ts`, `commit.ts`, `config.ts`, `handlers/offline.ts`, `handlers/editor.ts`
- Config shape: `src/lib/types/config.ts`, `src/lib/constants.ts:DEFAULT_CONFIG` + `CONFIG_PATH`, `config.schema.json`
- Offline heuristics: `docs/adr/001-cli-migration.md` § Offline generator contract (copy the constant lists wholesale)
- Formats: `src/templates/formats/*.ts`
