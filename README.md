# Commit Sage

Generate meaningful git commit messages with AI — or offline static analysis
— right from your terminal.

> **CLI-first since v1.8.0.** `commit-sage` is now a self-contained, cross-platform
> CLI (`generate`, `commit`, `config`) with flag overrides, an interactive staging
> flow, and `--offline` fallback.

## Overview

Commit Sage turns your `git diff` into a commit message. Two paths, one surface:

- **AI path** — diff + context → provider (OpenAI, Gemini, Ollama, … 11
  total) → structured message (`conventional` / `angular` / `emoji` / `semantic` /
  `freeform`).
- **Offline path** — `git diff-index --name-status` → deterministic conventional
  message (auto-commit-msg port, no API, no network). Ideal for CI or no-key setups.

Pick the surface that fits the moment: `generate` prints a message to stdout
(pipe-able, hook-callable), `commit` runs the full stage → preview → commit
→ push loop, `config` inspects or edits the JSON config.

## Requirements

- Git in `$PATH`.
- Internet for AI providers (skip with `--offline` or `ollama` locally).
- Deno 2.x only if compiling from source (`mask compile`).

## Installation

Three ways — all install the same `commit-sage` binary.

### Prebuilt binary (Releases)

Download the asset for your platform from [Releases](https://github.com/AhmedOsman101/commit-sage-cli/releases).

```shell
# example: Linux x64 — pick the asset that matches `uname -s` / `uname -m`
curl -L -o commit-sage https://github.com/AhmedOsman101/commit-sage-cli/releases/latest/download/commit-sage-linux-x64
chmod +x commit-sage
mv commit-sage ~/.local/bin/commit-sage   # ensure ~/.local/bin is on $PATH
commit-sage --version
```

Assets produced by `mask release` → `bin/`:

- `commit-sage-linux-x64`
- `commit-sage-linux-arm64`
- `commit-sage-macos-x64`
- `commit-sage-macos-arm64`
- `commit-sage-windows-x64.exe`
- `commit-sage-windows-arm64.exe`

macOS DMG and Windows NSIS installers are also published — see below.

### Quick Install (Linux & macOS)

```shell
curl -fsSL https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/main/installer/unix.sh | bash
```

This runs [`installer/unix.sh`](installer/unix.sh): detects `linux`/`macos` +
`x86_64`/`arm64`, fetches the latest `vX.Y.Z` from the GitHub API, installs
to `~/.local/bin/commit-sage` (override with `INSTALL_DIR`), optionally
appends `~/.local/bin` to your shell config, and verifies with `commit-sage --version`.

Customize:

```shell
INSTALL_DIR=~/bin VERSION=1.8.0 bash <(curl -fsSL https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/main/installer/unix.sh)
```

See [`installer/README.md`](installer/README.md) for manual curl + PATH setup.

### Windows

- **Installer (recommended):** download `commit-sage-setup.exe` from
  Releases and run the wizard. Installs to `C:\Program Files\commitSage`,
  adds to `PATH`, creates Start Menu + Desktop shortcuts. Built with
  [`installer/windows/commit-sage.nsi`](installer/windows/commit-sage.nsi); see
  `installer/windows/build-installer.ps1`.
- **Portable:** download `commit-sage-windows-x64.exe`, rename to `commit-sage.exe`,
  place anywhere on `PATH`.
- **macOS DMG:** `CommitSage-<version>-macos-{x64,arm64}.dmg` via
  `installer/macos/build-dmg.sh` (requires `create-dmg`).

### Compile from source

Requires [Deno](https://deno.land/) and [mask](https://github.com/jacobdeichert/mask).

```shell
git clone https://github.com/AhmedOsman101/commit-sage-cli.git commit-sage
cd commit-sage
mask compile              # → ~/.local/bin/commit-sage
mask release              # cross-compile all 6 targets → bin/
```

## Usage

`commit-sage` bare prints help (git/npm convention) — it never silently generates. Subcommands:

```
commit-sage [flags]
  generate        Generate a commit message from the staged diff, print to stdout
  commit          Interactive flow: stage files → generate → preview → commit → optional push
  config          Inspect or modify configuration (get/set/list/path/default/open/edit)
  help [sub]      Show help for a subcommand
  --help, -h      Show help
  --version, -V   Show version (1.8.0)
```

Exit codes:

- `0` success (including `--push` warn-and-skip when no remote).
- `1` CLI/IO/config error.
- `2` usage (unknown flag / missing arg).
- `130` abort (Esc in TUI, SIGINT).

### `commit-sage generate [flags]`

Pure text-in/text-out.

Interactive flow:

- If nothing staged → TUI multiselect over unstaged tracked + untracked (Cliffy
  Checkbox, searchable, select-all) → `git add`.
- Re-check staged; if still empty and `commit.onlyStagedChanges=true` → exit 1;
  else honor `general.diffStrategy`.
- Generate message (AI or `--offline`).
- Markdown preview via `@littletof/charmd` (subject as bold + body).

Prints the result. Exits without commit, useful for piping and integrating with other tools.

> [!Important]
> Needs a TTY for the picker/confirm. See [Non-TTY](#non-tty) below.

### `commit-sage commit [flags]`

Same interactive flow as `commit-sage generate` plus:

- Confirm (`commit.autoCommit` or `-y/--yes` skips).
- `git commit -m "<subject>" -m "<body>"` (`-e` if `--edit`).
- Optional `git push` (see `--push` below; `-u` on first push, warn-and-skip if no `origin`).

### `commit-sage config <subcommand>`

7 subcommands, no git repo required:

| Subcommand                    | What it does                                                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `get <section>.<key>`         | Print one merged value; warns `not set — using default fallback: …` if not user-set                                               |
| `set <section>.<key> <value>` | Coerce (boolean/number/string per `TYPE_MAP`) + `validateOrError` + persist to `CONFIG_PATH`                                      |
| `list` / `print`              | Dump merged config (defaults + overrides) as JSON                                                                                 |
| `path`                        | Print `CONFIG_PATH`                                                                                                               |
| `default`                     | Print `DEFAULT_CONFIG` as JSON                                                                                                    |
| `open`                        | Open `CONFIG_PATH` in OS handler (`open`/`xdg-open`/`cmd /c start`), fallback to `$EDITOR`                                        |
| `edit`                        | Open in `$EDITOR`/`$VISUAL`/fallback (`vi`/`notepad`), re-read, JSON-parse, `validateOrError` — invalid restores in-memory backup |

Keys are `<section>.<key>` with section being a valid config section.
Unknown section/key or bad type → exit 1 with clear message.

## Examples

All assume you're inside a git repo and `commit-sage` is on `$PATH`.

```shell
# 1 — basic generate: staged diff → AI message on stdout (pipe-able)
commit-sage generate

# 2 — offline (no API, no TTY needed): deterministic conventional message from status rows
commit-sage generate --offline

# 3 — interactive commit flow: pick files → preview → confirm → git commit
commit-sage commit

# 4 — commit + push current branch (warn-and-skip if no origin, exit 0)
commit-sage commit --push

# 5 — switch provider/model without opening a file (unified provider.{type,model} shape)
commit-sage config set provider.type openai && commit-sage config set provider.model gpt-5

# 6 — inspect merged config
commit-sage config print

# bonus — commit offline, and generate with extra AI context + custom max length
commit-sage commit --offline
commit-sage generate --context "fixes #123, retry on 5xx" --max-length 72
commit-sage generate --provider ollama --model gpt-oss-120b --format emoji --lang russian
commit-sage config get provider.model
commit-sage config path
```

<!-- TODO: Add actual demos
More in `docs/demos/` (gifs):  -->

## Flags Reference

### Shared `generate` / `commit` flags

One table — both subcommands accept the same 8 flags (commit adds 3 more below).

| Flag                | Description                                                                                                                                                    | Notes                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `--offline`         | Use static-analysis generator (no API). Always conventional-shape `<type>: <desc>` or bare `<desc>`; truncates at `--max-length` word boundary.                | Ignores `--format`; still respects `--max-length`; needs `git diff-index` status rows — untracked files won't appear until staged.        |
| `--context <text>`  | Inject `## External Context\n<text>` before the diff in the AI prompt.                                                                                         | **AI-only** — ignored with `--offline`.                                                                                                   |
| `--provider <name>` | Override `provider.type` for this run (`gemini`, `openai`, `anthropic`, `deepseek`, `mistral`, `xai`, `ollama`, `moonshotai`, `zai`, `minimax`, `openrouter`). | Per-run override of `provider.type`; maps to `DEFAULT_CONFIG.provider.type`.                                                              |
| `--model <name>`    | Override `provider.model` for this run.                                                                                                                        | Per-run override of `provider.model`; any string accepted — provider validates at call time. `commit` help lists `SUPPORTED_PROVIDERS`.   |
| `--format <name>`   | Commit template: `conventional`, `angular`, `karma`, `emoji`, `semantic`, `freeform`.                                                                          | **AI-only** — ignored with `--offline` (offline always conventional). Default `conventional` (see `commit.commitFormat`).                 |
| `--lang <name>`     | Commit language: `english`, `russian`, `chinese`, `japanese`.                                                                                                  | Per-run override of `commit.commitLanguage`.                                                                                              |
| `--max-length <n>`  | Override `commit.maxSubjectLength` for this message.                                                                                                           | Applies to **both** AI and `--offline` (offline truncation uses word boundary + `…`).                                                     |
| `--edit`            | Open before saving.                                                                                                                                            | `generate`: tempfile + `$EDITOR`/`$VISUAL` → print final to stdout. `commit`: passes `-e` to `git commit` → editor on the staged message. |

Commit-only flags:

| Flag              | Applies to | Description                                                                                                  | Notes                                                                                                                              |
| ----------------- | ---------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--push [branch]` | `commit`   | Push after a successful commit. Bare `--push` pushes the current branch; `--push <name>` pushes that branch. | Warn-and-skip (not fail) if no remote / no `origin`; auto `-u` (set upstream) on first push to a branch. Exit 0 even when skipped. |
| `--no-push`       | `commit`   | Don't push, even if `commit.autoPush=true` or `--push` was earlier.                                          | Overrides `--push` and `commit.autoPush`.                                                                                          |
| `-y, --yes`       | `commit`   | Skip confirm dialogs (commit + push confirm) regardless of `commit.autoCommit` / `commit.autoPush`.          | Also read as `commit.autoCommit`/`commit.autoPush` in config.                                                                      |

### `config` subcommands

| Subcommand                    | Description                                                                                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get <section>.<key>`         | Print one value; warns if key not user-set and falls back to `DEFAULT_CONFIG` display.                                                                                  |
| `set <section>.<key> <value>` | Coerce + validate + persist (no `--write` flag needed). Boolean: `true`/`false` (case-insensitive). Number: finite. String: raw.                                        |
| `list` / `print`              | Merged config as JSON (defaults + user overrides). Alias: `print`.                                                                                                      |
| `path`                        | Resolved `CONFIG_PATH`.                                                                                                                                                 |
| `default`                     | `DEFAULT_CONFIG` as JSON.                                                                                                                                               |
| `open`                        | OS handler → `$EDITOR` fallback.                                                                                                                                        |
| `edit`                        | `$EDITOR`/`$VISUAL`/fallback (`vi`/`notepad`) + in-memory backup restore on invalid JSON or `validateOrError` failure; prints `Config saved and validated.` on success. |

## Non-TTY

- `generate` → requires `$PROVIDER_API_KEY` (e.g. `OPENAI_API_KEY`,
  `GEMINI_API_KEY`; `ollama` needs none) when stdin is not a TTY. Otherwise
  it hard-fails with `No API key found in $... and stdin is not a TTY...`. All
  interactive prompts would hang — so we fail fast.
- `commit` → hard-fails without a TTY (staging picker + confirm are
  interactive). Use `--offline` with `--yes` still needs a TTY for the flow; for CI,
  prefer `generate --offline | git commit -F -`.
- `--offline` (both subcommands) → always non-interactive, no key, no TTY.

## Configuration

Config lives at `~/.config/commitSage/config.json` on
Linux/macOS, `%APPDATA%\commitSage\config.json` on Windows (see
`src/lib/constants.ts:CONFIG_PATH`), plus an in-process `DEFAULT_CONFIG`.

Inspect with `commit-sage config list` (merged) or `commit-sage config default` (defaults).

Resolve the path with `commit-sage config path`.

Set with `commit-sage config set <section>.<key> <value>` or edit with `commit-sage config edit` / `commit-sage config open`.

Every `set`/`edit` validates against `config.schema.json` (generated from
`src/lib/types/configSchema.ts` — run `mask schema build` / `mask schema check`
— don't hand-edit the schema).

### Unified `provider.{type,model}` (since CLI migration)

Old top-level `gemini`/`ollama`/`openai` provider sections for `type`/`model`
are gone — replaced by one `provider` section:

| Key                  | Type            | Default                   | Description                                                                                                           |
| -------------------- | --------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `provider.type`      | `string` (enum) | `"gemini"`                | `gemini`, `openai`, `anthropic`, `deepseek`, `mistral`, `xai`, `ollama`, `moonshotai`, `zai`, `minimax`, `openrouter` |
| `provider.model`     | `string`        | `"gemini-2.5-flash-lite"` | Opaque — validated by the selected provider at call time                                                              |
| `provider.timeoutMs` | `number`        | `60000`                   | Request timeout                                                                                                       |
| `provider.reasoning` | `string`        | `"off"`                   | `off`, `default`, `low`, `medium`, `high`, `xhigh`, `ultra`                                                           |

Per-provider transport stays under its own section (e.g. `ollama.baseUrl`,
`openrouter.baseUrl`, `openai.baseUrl` + `openai.apiKeyEnvVar` +
`openai.useChatCompletions`).

Don't confuse those with the unified
`provider.type`/`provider.model` overrides (`--provider`/`--model`).

### All sections at a glance

| Section      | Key                   | Type      | Default                          | Notes                                                                                                                      |
| ------------ | --------------------- | --------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `general`    | `maxRetries`          | `number`  | `3`                              | Retry on API call                                                                                                          |
| `general`    | `initialRetryDelayMs` | `number`  | `1000`                           | First retry backoff                                                                                                        |
| `general`    | `temperature`         | `number`  | `0.7`                            | Model temperature                                                                                                          |
| `general`    | `maxInputChars`       | `number`  | `100000`                         | Diff chars sent to AI                                                                                                      |
| `general`    | `diffStrategy`        | `string`  | `"auto"`                         | `staged` / `unstaged` / `auto`                                                                                             |
| `ollama`     | `baseUrl`             | `string`  | `"http://localhost:11434/api"`   | Self-hosted Ollama                                                                                                         |
| `openrouter` | `baseUrl`             | `string`  | `"https://openrouter.ai/api/v1"` | OpenRouter meta-provider                                                                                                   |
| `openai`     | `baseUrl`             | `string`  | `"https://api.openai.com/v1"`    | OpenAI-compatible base                                                                                                     |
| `openai`     | `apiKeyEnvVar`        | `string`  | `"OPENAI_API_KEY"`               | Env var that holds the key (other providers use `${TYPE}_API_KEY`)                                                         |
| `openai`     | `useChatCompletions`  | `boolean` | `true`                           | Chat completions vs responses API                                                                                          |
| `commit`     | `autoCommit`          | `boolean` | `false`                          | Skip `Commit changes?` confirm (or use `-y/--yes`)                                                                         |
| `commit`     | `autoPush`            | `boolean` | `false`                          | Skip `Push to <branch>?` confirm (or use `-y/--yes`)                                                                       |
| `commit`     | `commitFormat`        | `string`  | `"conventional"`                 | `conventional`, `angular`, `karma`, `emoji`, `semantic`, `freeform` (`freeform` AI-only)                                   |
| `commit`     | `onlyStagedChanges`   | `boolean` | `true`                           | When true and nothing staged after picker, `commit` exits 0 with `No staged changes`; else falls through to `diffStrategy` |
| `commit`     | `commitLanguage`      | `string`  | `"english"`                      | `english`, `russian`, `chinese`, `japanese` (`--lang` overrides)                                                           |
| `commit`     | `promptForRefs`       | `boolean` | `false`                          | Reserved (wired for future refs prompt)                                                                                    |
| `commit`     | `maxSubjectLength`    | `number`  | `80`                             | Subject truncation limit; `--max-length` per-run                                                                           |
| `commit`     | `bodyStyle`           | `string`  | `"subject-body"`                 | `subject-only`, `subject-body`, `subject-body-footer`                                                                      |

Environment variables remain an alternative for the key: set `GEMINI_API_KEY`,
`OPENAI_API_KEY`, etc. before running. Single-run:

```shell
OPENAI_API_KEY='sk-...' commit-sage generate --provider openai --model gpt-5
```

Ollama needs no key. Keys stored in the JSON file follow the same `provider.type` routing.

## Contributing

Contributions welcome — open an issue or PR.
Read [`CONTRIBUTING.md`](CONTRIBUTING.md) first.
Format before committing.
Follow Conventional Commits for messages.

## Third-Party Tools

<a href="https://bizbot.zvo.cn/index.html" target="_blank" rel="noopener">BizBot: AI automated promotion system</a>

## Acknowledgment

Inspired by the [CommitSage VS Code extension](https://marketplace.visualstudio.com/items?itemName=VizzleTF.geminicommit) by Ivan K. ([GitHub](https://github.com/VizzleTF/CommitSage)) (MIT). It motivated the Deno CLI port — thank you, Ivan.

## License

GPLv3 — see [`LICENSE`](LICENSE).

## Contact

[GitHub](https://github.com/AhmedOsman101) · [ahmad.ali.othman@outlook.com](mailto:ahmad.ali.othman@outlook.com)
