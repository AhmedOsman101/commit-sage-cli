# Commit Sage

Generate meaningful git commit messages with AI — or offline static analysis
— right from your terminal.

> **v2.0.0** — `commit-sage` is a full-fledged, cross-platform
> CLI (`generate`, `commit`, `config`) with flag overrides, an interactive staging
> flow, and `--offline` fallback. Breaking change from v1: bare `commit-sage` now
> prints help instead of silently generating. See [CHANGELOG](./CHANGELOG.md).

## Overview

Commit Sage turns your `git diff` into a commit message. Two paths, one surface:

- **AI path** — diff + context -> provider (OpenAI, Gemini, Ollama, … 11
  total) -> structured message (`conventional` / `angular` / `emoji` / `semantic` /
  `freeform`).
- **Offline path** — `git diff-index --name-status` -> deterministic conventional
  message (auto-commit-msg port, no API, no network). Ideal for CI or no-key setups.

Pick the surface that fits the moment: `generate` prints a message to stdout
(pipe-able, hook-callable), `commit` runs the full stage -> preview -> commit
-> push loop, `config` inspects or edits the JSON config.

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

Assets produced by `mask release` -> `bin/`:

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
mask compile              # -> ~/.local/bin/commit-sage
mask release              # cross-compile all 6 targets -> bin/
```

## Usage

`commit-sage` bare prints help (git/npm convention) — it never silently generates. Subcommands:

```
commit-sage [flags]
  generate        Generate a commit message from the staged diff, print to stdout
  commit          Interactive flow: stage files -> generate -> preview -> commit -> optional push
  config          Inspect or modify configuration (get/set/list/path/default/open/edit)
  help [sub]      Show help for a subcommand
  --help, -h      Show help
  --version, -V   Show version (2.0.0)
```

Exit codes:

- `0` success (including `--push` warn-and-skip when no remote).
- `1` CLI/IO/config error.
- `2` usage (unknown flag / missing arg).
- `130` abort (Esc in TUI, SIGINT).

### `commit-sage generate [flags]`

Pure text-in/text-out.

Interactive flow:

- If nothing staged -> TUI multiselect over unstaged tracked + untracked (Cliffy
  Checkbox, searchable, select-all) -> `git add`.
- Re-check staged; if still empty and `commit.onlyStagedChanges=true` -> exit 1;
  else honor `generation.diffStrategy`.
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
Unknown section/key or bad type -> exit 1 with clear message.

## Examples

All assume you're inside a git repo and `commit-sage` is on `$PATH`.

```shell
# 1 — basic generate: staged diff -> AI message on stdout (pipe-able)
commit-sage generate

# 2 — offline (no API, no TTY needed): deterministic conventional message from status rows
commit-sage generate --offline

# 3 — interactive commit flow: pick files -> preview -> confirm -> git commit
commit-sage commit

# 4 — commit + push current branch (warn-and-skip if no origin, exit 0)
commit-sage commit --push

# 5 — switch model without opening a file (single provider/model string)
commit-sage config set model openai/gpt-5

# 6 — inspect merged config
commit-sage config print

# bonus — commit offline, and generate with extra AI context + custom max length
commit-sage commit --offline
commit-sage generate --context "fixes #123, retry on 5xx" --max-length 72
commit-sage generate --model ollama/gpt-oss-120b --format emoji --lang russian
commit-sage config get model
commit-sage config path
```

<!-- TODO: Add actual demos
More in `docs/demos/` (gifs):  -->

## Flags Reference

### Shared `generate` / `commit` flags

One table — both subcommands accept the same 7 flags (commit adds 3 more below).

| Flag               | Description                                                                                                                                                                       | Notes                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `--offline`        | Use static-analysis generator (no API). Always conventional-shape `<type>: <desc>` or bare `<desc>`; truncates at `--max-length` word boundary.                                   | Ignores `--format`; still respects `--max-length`; needs `git diff-index` status rows — untracked files won't appear until staged.          |
| `--context <text>` | Inject `## External Context\n<text>` before the diff in the AI prompt.                                                                                                            | **AI-only** — ignored with `--offline`.                                                                                                     |
| `--model <name>`   | Model for this run in `provider/model` format (e.g. `openai/gpt-5-nano`). First slash splits provider from model id; multi-segment ids preserved (`9router/kc/stealth/ox-alpha`). | Per-run override of top-level `model`; any `provider/model` string accepted — provider validates at call time.                              |
| `--format <name>`  | Commit template: `conventional`, `angular`, `karma`, `emoji`, `semantic`, `freeform`.                                                                                             | **AI-only** — ignored with `--offline` (offline always conventional). Default `conventional` (see `commit.commitFormat`).                   |
| `--lang <name>`    | Commit language (BCP-47, stored as-given, e.g. `en`, `en-US`, `jp`).                                                                                                              | Per-run override of `commit.commitLanguage`; normalized internally.                                                                         |
| `--max-length <n>` | Override `commit.maxLength` for this message.                                                                                                                                     | Applies to **both** AI and `--offline` (offline truncation uses word boundary + `…`).                                                       |
| `--edit`           | Open before saving.                                                                                                                                                               | `generate`: tempfile + `$EDITOR`/`$VISUAL` -> print final to stdout. `commit`: passes `-e` to `git commit` -> editor on the staged message. |

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
| `open`                        | OS handler -> `$EDITOR` fallback.                                                                                                                                       |
| `edit`                        | `$EDITOR`/`$VISUAL`/fallback (`vi`/`notepad`) + in-memory backup restore on invalid JSON or `validateOrError` failure; prints `Config saved and validated.` on success. |

## Non-TTY

- `generate` -> requires `$PROVIDER_API_KEY` (e.g. `OPENAI_API_KEY`,
  `GEMINI_API_KEY`; `ollama` needs none) when stdin is not a TTY. Otherwise
  it hard-fails with `No API key found in $... and stdin is not a TTY...`. All
  interactive prompts would hang — so we fail fast.
- `commit` -> hard-fails without a TTY (staging picker + confirm are
  interactive). Use `--offline` with `--yes` still needs a TTY for the flow; for CI,
  prefer `generate --offline | git commit -F -`.
- `--offline` (both subcommands) -> always non-interactive, no key, no TTY.

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

### Top-level `model` + `providers` registry (Config V2)

One canonical string selects the provider and model. Split on the first `/` —
left is the provider, right is the model id (further slashes preserved):

| Key     | Type                   | Default               | Description                                                                                           |
| ------- | ---------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| `model` | `string` (`a/b` shape) | `"openai/gpt-5-nano"` | `"9router/kc/stealth/ox-alpha"` -> provider `9router`, model `kc/stealth/ox-alpha`. Fails without `/` |

Per-provider transport lives in the `providers` registry. `providers.defaults`
holds shared AI defaults; `providers.<name>` overrides per provider
(open registry — custom routers need no code change):

| Key                            | Type             | Default             | Description                                                                                                  |
| ------------------------------ | ---------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `providers.defaults.timeoutMs` | `number`         | `60000`             | Request timeout                                                                                              |
| `providers.defaults.reasoning` | `string/boolean` | `"off"`             | `off`, `default`, `low`, `medium`, `high`, `xhigh`, `ultra` (tri-state with boolean)                         |
| `providers.defaults.apiType`   | `string`         | `"openai-chat"`     | `openai-chat`, `openai-responses`, `anthropic`                                                               |
| `providers.<name>.baseUrl`     | `string`         | per-provider        | e.g. `http://localhost:11434/api` for `ollama`                                                               |
| `providers.<name>.apiKey`      | `string`         | `"$<NAME>_API_KEY"` | `$`-prefix reads env, else literal from the file; optional for local providers (`ollama`)                    |
| `providers.<name>.apiType`     | `string`         | inherits            | Per-provider override                                                                                        |
| `providers.<name>.models`      | map              | —                   | Per-model presets (`name`, `reasoning`, `contextWindow`, `maxInputTokens`, `maxOutputTokens`, `temperature`) |

`providers.<name>.models` presets resolve per value
(`model preset > provider > defaults`) and are managed via `config edit` —
`config get/set` stays shallow by design.

Don't confuse the stored `model` string with the per-run
`--model` flag (see [Flags Reference](#flags-reference)).

### All sections at a glance

| Section      | Key                  | Type      | Default             | Notes                                                                                                                      |
| ------------ | -------------------- | --------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `generation` | `maxRetries`         | `number`  | `3`                 | Retry on API call                                                                                                          |
| `generation` | `retryDelay`         | `number`  | `1000`              | Retry backoff                                                                                                              |
| `generation` | `temperature`        | `number`  | `0.7`               | Model temperature (global default; per-model presets may override)                                                         |
| `generation` | `maxPromptTokens`    | `number`  | `100000`            | Diff tokens sent to AI (token-counted truncation)                                                                          |
| `generation` | `diffStrategy`       | `string`  | `"auto"`            | `staged` / `unstaged` / `auto`                                                                                             |
| `providers`  | `defaults.timeoutMs` | `number`  | `60000`             | Shared request timeout                                                                                                     |
| `providers`  | `defaults.reasoning` | `string`  | `"off"`             | Shared reasoning default                                                                                                   |
| `providers`  | `defaults.apiType`   | `string`  | `"openai-chat"`     | Shared API type                                                                                                            |
| `providers`  | `<name>.baseUrl`     | `string`  | per-provider        | e.g. `ollama` -> `"http://localhost:11434/api"`; `openrouter` -> `"https://openrouter.ai/api/v1"`                          |
| `providers`  | `<name>.apiKey`      | `string`  | `"$<NAME>_API_KEY"` | `$`-prefix reads env, else literal; optional for local providers                                                           |
| `providers`  | `<name>.apiType`     | `string`  | inherits            | `openai-chat`, `openai-responses`, `anthropic`                                                                             |
| `commit`     | `autoCommit`         | `boolean` | `false`             | Skip `Commit changes?` confirm (or use `-y/--yes`)                                                                         |
| `commit`     | `autoPush`           | `boolean` | `false`             | Skip `Push to <branch>?` confirm (or use `-y/--yes`)                                                                       |
| `commit`     | `commitFormat`       | `string`  | `"conventional"`    | `conventional`, `angular`, `karma`, `emoji`, `semantic`, `freeform` (`freeform` AI-only)                                   |
| `commit`     | `onlyStagedChanges`  | `boolean` | `true`              | When true and nothing staged after picker, `commit` exits 0 with `No staged changes`; else falls through to `diffStrategy` |
| `commit`     | `commitLanguage`     | `string`  | `"english"`         | BCP-47, stored as-given (`en`, `en-US`, `jp` …); `--lang` overrides                                                        |
| `commit`     | `promptForRefs`      | `boolean` | `false`             | Reserved (wired for future refs prompt)                                                                                    |
| `commit`     | `maxLength`          | `number`  | `80`                | Subject truncation limit; `--max-length` per-run                                                                           |
| `commit`     | `bodyStyle`          | `string`  | `"subject-body"`    | `subject-only`, `subject-body`, `subject-body-footer`                                                                      |

Environment variables remain an alternative for the key: set `GEMINI_API_KEY`,
`OPENAI_API_KEY`, etc. before running. Single-run:

```shell
OPENAI_API_KEY='sk-...' commit-sage generate --model openai/gpt-5
```

Ollama needs no key. Keys stored in the JSON file follow the same `provider/model` routing.

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
