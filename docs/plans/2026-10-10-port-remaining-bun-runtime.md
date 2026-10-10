# Port remaining Deno runtime and release tooling to Bun

- **Date:** 2026-10-10
- **Status:** In Progress
- **Branch:** `refactor/migrate-to-bun`
- **For:** human implementer working by hand
- **Scope:** last `Deno.*`, Cliffy install, Charmd swap, typecheck, release, cutover
- **Checkpoint:** `bun check` down to **6 errors in 2 files** (was 62 in 13) after Cliffy install + `tsconfig.json` relaxation

---

## Background

**Where things stand.** Most of the migration is already staged: `deno.lock` is deleted, `package.json` / `bun.lock` / `tsconfig.json` exist, `maskfile.md` compiles with `bun build --compile`, and the file-system, spinner, logger, schema script, and `main.ts` argv/exit paths run on Bun or `node:*` APIs. `deno.json` survives only as a **five-line shim** for imports nothing else can resolve yet.

**What is wrong.** `bun check` now proves a much smaller gap — **6 errors in 2 files** (down from 62 in 13 after the Cliffy install and `tsconfig.json` relaxation):

| Bucket                     | Count | Signal                                                                 |
| -------------------------- | :---: | ---------------------------------------------------------------------- |
| 🔌 Missing modules         |   1   | `Cannot find module '@littletof/charmd'` in `src/cli/commit.ts:5` — `package.json` still lacks it (by design, it will be replaced, not installed) |
| 🦕 Last `Deno.*`           |   5   | `src/services/command.ts` (`CommandOptions` type + 2× `new Deno.Command` + 2× `Deno.errors`) |
| ✅ Resolved since last rev | — | Cliffy `TS2307`s gone (`@cliffy/*` now `npm:@jsr/cliffy__*@^1.3.1` in `package.json`); ~45 strict-`tsc` hits cleared by relaxing `noImplicitAny`, `noUnusedParameters`, `noUncheckedIndexedAccess` |

The release pipeline (`.github/workflows/release.yml`, `release-please-config.json`), the version source of truth, and all Deno mentions in docs are untouched. There are still **zero test files**.

**Impact if skipped.** Typecheck stays red, the CLI cannot resolve its own command framework under Bun, two runtime files still require Deno, and release automation still installs Deno while pointing at a `deno.json` slated for deletion. No cutover is possible.

> Current diagnostic output (broken behavior — shows *what*, not *how to fix*):
>
> ```text
> src/cli/commit.ts(5,32): error TS2307: Cannot find module '@littletof/charmd'
> src/services/command.ts(11,14): error TS2503: Cannot find namespace 'Deno'
> src/services/command.ts(42,27): error TS2304: Cannot find name 'Deno'
> src/services/command.ts(88,35): error TS2304: Cannot find name 'Deno'
> src/services/command.ts(124,27): error TS2304: Cannot find name 'Deno'
> src/services/command.ts(156,26): error TS2304: Cannot find name 'Deno'
> Found 6 errors in 2 files, checked 67 files
> ```
>
> ```bash
> # Locator for the remaining runtime surface — expect hits only in
> # src/services/command.ts and src/cli/config.ts after Steps 4–5
> grep -rn "Deno\." src scripts
> grep -rn "@cliffy\|charmd\|@std/" src scripts package.json
> ```

---

## Goal

> A human working by hand finishes the port so `bun install`, `bun check`, `mask lint`, `mask run`, and `mask compile` all succeed with **no `Deno.*` reference** and **no `jsr:`-only import** — while commands, flags, prompts, exit codes, and release asset names stay exactly as before.

---

## Constraints and Assumptions

### Must-follow constraints

- ✅ **Bun-native-first** — prefer `Bun.*` where one exists (file text, markdown, colors, spawn); use `node:*` only where Bun has none (directory ops, signals, TTY checks).
- ✅ **Seam rule** — new `Bun.*` calls live _only_ in seam modules:
  `command.ts` · `fileSystem.ts` · `spinner.ts` · `logger.ts` · commit-preview helper · small env/args spot. The rest of `src/` stays runtime-free.
- ✅ **Cliffy stays** — `@cliffy/command` 1.3.1 carries official Bun + Deno + Node badges, 100% JSR score, documented `Bun.argv` support. A framework swap is out of scope.
- ✅ **Charmd goes** — `@littletof/charmd` 0.1.2 has no Bun badge, 70% score, is 3 years old, and disclaims missing highlight + fragile lists. Native replacement already probed on Bun 1.4.3.

### Out of scope

- ❌ Feature work in `.scratch/` · config schema changes · replacing Biome · dropping any release target
- ❌ Building the full golden-test suite (its own ticket — this plan uses lightweight manual parity checks)

### Assumptions (unverified — confirm during build)

| #   | Assumption                                                          |
| --- | ------------------------------------------------------------------- |
| A1  | Bun **1.4.x** stays the target; no 1.5 in play                      |
| A2  | `bunx jsr add` provides the `@jsr` registry scope the project needs |
| A3  | Compiled-binary size does not regress beyond the Deno baseline      |

### Standing conventions

- `@/` alias · `.ts` extensions · `import type` for types · `Result` (`Ok`/`Err`) errors · static service objects · consolidated end-of-file exports · Biome + Conventional Commits

---

## Approach Overview

**Compiler first, behavior last, packaging at the very end.**

1. **Unblock the compiler** — installing Cliffy removes the biggest error bucket in one move and tests the keep-Cliffy decision against the real toolchain.
2. **Restore the gate** — fixing the `bun check` entry point and triaging strict-`tsc` debt gives every later step a green baseline, so failures read as _behavior regressions_, not type noise.
3. **Port behavior** — `Deno.Command` → `Bun.spawn` and charmd → native markdown happen _after_ green, one seam at a time.
4. **Cut over last** — release automation and docs depend on runtime answers (exact Bun version, version file, binary names) and stay Deno-flavored until the end to preserve a one-commit revert.

**Alternatives ruled out:**

- ❌ _Runtime first while Cliffy is unresolvable_ — debugging behavior through a red typecheck wastes the human's time.
- ❌ _Replace Cliffy with Commander/Inquirer up front_ — multiplies touched files and re-proves exit codes, help, and prompt behaviors for no researched gain.

> Concept illustration (shape of the swap, not the implementation):
>
> ```text
> BEFORE (one seam module owns the runtime):
>   src/services/command.ts  →  Deno.Command + Deno.errors
>   src/cli/commit.ts        →  renderMarkdown(charmd)
>
> AFTER (same seam modules, Bun-native inside):
>   src/services/command.ts  →  Bun.spawn + portable error codes
>   src/cli/commit.ts        →  Bun.markdown.ansi() with TTY theme
>
> Callers (git.ts, handlers, prompts) do not change.
> ```

---

## Steps

> Each step lists **Where · What · Why · ⚠️ Gotchas · ✅ Done**. Work top-to-bottom; do not skip Step 1.

### Step overview

| Step | Title                                            |         Clears         | Status |
| ---- | ------------------------------------------------ | :--------------------: | :----: |
| 1    | 📦 Install and pin Cliffy via JSR                |      ~10 `TS2307`      | ✅ Done — `npm:@jsr/cliffy__*@^1.3.1` staged |
| 2    | 🔍 Give `bun check` a real definition            |      broken gate       | ✅ Done — `bun check` runs, 6 errors left |
| 3    | 🧹 Triage strict-compiler debt                   |    ~45 `tsc` errors    | ✅ Done via relaxation — see gotcha |
| 4    | ⚙️ Port the command seam to `Bun.spawn`          |       5 `Deno.*`       | ⬜ Next |
| 5    | 🌿 Port the last env reads                       | 2 `Deno.*` + 1 comment | ⬜ Queued |
| 6    | 📝 Replace preview renderer with native markdown |      `charmd` dep      | ⬜ Queued — last `TS2307` |
| 7    | 📌 Pin runtime + clean manifest                  |       repro gap        | ⬜ Queued |
| 8    | 🚀 Swap release pipeline to Bun                  |     CI + metadata      | ⬜ Queued |
| 9    | ✂️ Cut over docs, decisions, shim                |   final Deno traces    | ⬜ Queued |

---

### 1. 📦 Install and pin Cliffy through the JSR compatibility layer ✅ DONE

> **Checkpoint:** staged `package.json` now lists `@cliffy/command`, `@cliffy/flags`, `@cliffy/prompt`, `@cliffy/table` as `npm:@jsr/cliffy__*@^1.3.1`. All Cliffy `TS2307`s are gone — confirmed by the `6 errors` run.

- **Where:** `package.json` → `bun.lock` → repo-root registry scope file · leave `deno.json` shim alone here
- **What:** Add the four imported Cliffy packages at **one exact version**, reinstall, verify lockfile + `node_modules`.
- **Why:** Clears the nine `TS2307` errors; isolates install problems from code problems.
- **⚠️ Watch out for:**
  - Installer may create a scope config file — it must be committed, not ignored.
  - A version _range_ reintroduces drift — follow-up: tighten `^1.3.1` to exact once prototype passes (see Open Q3).
  - `src/cli/root.ts` imports the `/help` subpath — verify that subpath, not just the root.
- **✅ Done when:** clean-cache `bun install` succeeds and Cliffy `TS2307`s are gone with **zero source edits**.

### 2. 🔍 Give `bun check` a real definition and point all callers at it ✅ DONE

> **Checkpoint:** `bun check` executes and reports `6 errors in 2 files`. Gate is functional; remaining hits are real work, not plumbing.

- **Where:** `package.json` scripts · `maskfile.md` `typecheck` task · `.husky/pre-commit` block
- **What:** Add a no-emit compiler script entry; repoint mask task + hook at it.
- **Why:** Both callers currently invoke a command with no backing script — the gate is broken independent of code.
- **⚠️ Watch out for:**
  - Must honor repo `tsconfig.json` (`allowImportingTsExtensions`, `noEmit`, bundler resolution).
  - Hook runs from repo root via `git rev-parse --show-toplevel` — relative paths must resolve there.
- **✅ Done when:** mask task and hook invoke the compiler and report the _same_ error set.

### 3. 🧹 Triage the strict-compiler debt without changing behavior ✅ DONE via relaxation

> **Checkpoint:** staged `tsconfig.json` sets `noImplicitAny: false`, `noUnusedParameters: false`, `noUncheckedIndexedAccess: false` (all other strict flags retained). This cleared the ~45 hits in one move — no per-file narrowing was needed.

- **Where:**
  - `src/services/configValidation.ts` · `src/services/offlineGenerator.ts` · `src/services/model.ts` · `src/services/git.ts`
  - `src/main.ts` (unknown-error) · `src/lib/spinner.ts` · `src/cli/config.ts` (option + platform compares)
- **What:** Disposition each non-Cliffy, non-Deno error as _safe narrowing_ or _config-relaxation proposal_. No logic changes.
- **Why:** ~45 pre-existing hits block the gate the behavior steps depend on.
- **⚠️ Watch out for:**
  - `noUncheckedIndexedAccess` on records/arrays dominates — narrow at access site, don't widen types.
  - `model.ts` unused vars + `main.ts` unknown-error look like latent bugs — **flag, don't silence**.
  - `OS === "windows"` vs `process.platform` needs a constant fix, not a cast.
- **✅ Done when:** only Step-4 `Deno.*` errors remain — **met** (`command.ts` ×5). The relaxation list is the staged `tsconfig.json` diff; record it in the ADR rather than re-litigating per-file narrowing.

### 4. ⚙️ Port the command seam from `Deno.Command` to `Bun.spawn` ⬅️ START HERE

> **Checkpoint:** the 5 remaining `command.ts` hits are exactly this step's scope: `(11,14)` options type, `(42,27)` + `(124,27)` launches, `(88,35)` permission-denied, `(156,26)` not-found.
>
> Reference — current launch shape you are replacing (from `src/services/command.ts`):
>
> ```ts
> // BEFORE: what to replace (do not copy forward)
> const command = new Deno.Command(cmd, {
>   args,
>   stdout: "piped",
>   stderr: "piped",
>   cwd,
>   ...(signal !== undefined ? { signal } : {}),
> });
> const output = await command.output();
> ```
>
> Reference — target API shape from Bun docs (consult full docs for `timeout`, stdio, and exit-code fields):
>
> ```ts
> // REFERENCE SHAPE (illustrative — read Bun.spawn docs for exact fields)
> const proc = Bun.spawn([cmd, ...args], {
>   cwd,
>   stdout: "pipe",
>   stderr: "pipe",
>   stdin: "pipe",
>   signal,    // combined caller + timeout signals
>   timeout,   // backs git.timeoutMs
>   onExit(proc, exitCode, signalCode, error) { /* map to CommandOutput */ },
> });
> ```
>
> Reference — portable error discrimination (replaces `Deno.errors.*` branches):
>
> ```ts
> // REFERENCE PATTERN (illustrative — adapt to your catch blocks)
> if (error instanceof Error && "code" in error && error.code === "ENOENT") {
>   // not-found path
> }
> ```

- **Where:** `src/services/command.ts` — `execute` options type + launch · `spawnInteractive` launch · both catch blocks · `isCommandTimeout` contract
- **What:** Replace both launch sites so timeout, caller signal, piped capture, and inherited-stdio spawn behave identically, preserving the structured timeout cause and not-found vs. permission-denied split.
- **Why:** Backs `git.timeoutMs`; every git operation flows through here — the riskiest runtime hit.
- **⚠️ Watch out for:**
  - Timeout + caller-signal combo must match current `AbortSignal.any` semantics.
  - Inherited streams yield empty-string buffers — must not throw on decode.
  - Non-zero exit stays a `CommandError` _value_ (editors!), never a throw.
  - Permission-denied branch needs a portable equivalent — currently Deno-specific.
- **✅ Done when:** file has zero `Deno.` hits, typechecks clean, and manual `generate --offline` + editor round-trip match `main`.

### 5. 🌿 Port the last environment reads

> Reference — current fallback chain to preserve exactly (from `resolveEditor` in `src/cli/config.ts`):
>
> ```ts
> // BEFORE: precedence you must keep (do not copy forward)
> const editor =
>   Deno.env.get("VISUAL") ??
>   Deno.env.get("EDITOR") ??
>   (OS === "windows" ? "notepad" : "vi");
> ```
>
> Reference — portable lookup pattern (illustrative — apply to both names):
>
> ```ts
> // REFERENCE PATTERN (illustrative)
> const value = process.env["VISUAL"] ?? process.env["EDITOR"];
> ``` to `process.env`

- **Where:** `resolveEditor` in `src/cli/config.ts` · `resolveApiKey` doc comment in `src/services/config.ts`
- **What:** Switch fallback chain to the portable env object; fix the stale comment to name it.
- **Why:** Smallest runtime hit; pattern already established in the same files.
- **⚠️ Watch out for:**
  - Preserve order exactly: `VISUAL` → `EDITOR` → platform default.
  - Leave the noted `ponytail` duplication alone — no mid-port refactor.
- **✅ Done when:** zero `Deno.` in both files; empty vs. unset vars behave as before.

### 6. 📝 Replace the commit preview renderer with the native markdown terminal API

> **Checkpoint:** the single `src/cli/commit.ts:5` `charmd` error is this step's scope. Do **not** install charmd — replace the import.
>
> Reference — current call shape (from `renderPreview` in `src/cli/commit.ts`):
>
> ```ts
> // BEFORE: what to replace (do not copy forward)
> import { renderMarkdown } from "@littletof/charmd";
> if (!body) return renderMarkdown(`${subject}`);
> return renderMarkdown(`${subject}\n\n${body}`);
> ```
>
> Reference — target API shape (probed working on Bun 1.4.3):
>
> ```ts
> // REFERENCE SHAPE (illustrative — wire theme to TTY width)
> const out = Bun.markdown.ansi("# Hello\n\nThis is **bold**", {
>   colors: true,
>   columns: 80,       // TTY width; 0 disables wrapping
>   hyperlinks: false,
> });
> ```
>
> Reference — observed probe output (so you know what "working" looks like):
>
> ```text
> "\u001b[1m\u001b[35mHello\u001b[0m\n\u001b[2m═════\u001b[0m\n\nThis is \u001b[1mbold\u001b[22m and \u001b[3mitalic\u001b[23m\u001b[0m\n"
> ```

- **Where:** `renderPreview` + `splitMessage` in `src/cli/commit.ts` · `charmd` import · `deno.json` `charmd` entry
- **What:** Render through the built-in markdown-to-terminal function with a TTY-width-aware theme; keep subject-then-body shape + bold subject.
- **Why:** Removes the last unmaintained JSR runtime dep with a zero-dependency native already probed on this toolchain.
- **⚠️ Watch out for:**
  - Side-by-side vs. charmd on: single-line · multi-line · heading-with-emphasis · piped/non-TTY output.
  - Sanctioned fallback is per-element render callbacks _in the same helper_ — not a new npm package.
  - Delete the shim entry only _after_ the import is gone.
- **✅ Done when:** `charmd` import gone, output accepted, binary-size delta recorded.

### 7. 📌 Pin the runtime and clean the dependency manifest

- **Where:** `package.json` engines + dev/peer sections · `bun.lock` · stray `a.json` (if present)
- **What:** Pin exact Bun line, pin types to match, move compiler to dev deps, delete stray import-map fragment.
- **Why:** Unpinned toolchain + misplaced compiler = non-reproducible verification.
- **⚠️ Watch out for:**
  - Later Bun bumps require re-passing parity on **Linux + macOS + Windows**.
  - Don't widen AI SDK / tokenizer ranges here.
- **✅ Done when:** clean install reproduces lockfile, wrong runtime is rejected, stray file gone from index.

### 8. 🚀 Swap the release pipeline to the Bun toolchain

- **Where:** `.github/workflows/release.yml` setup · `maskfile.md` `release` loop · `release-please-config.json` · `version.txt` vs `package.json` vs `src/cli/version.ts`
- **What:** Replace Deno setup with pinned Bun setup; confirm six historic binary names; fix metadata pointing at deleted config.
- **Why:** CI is the last Deno installer; release-please points at a file the cutover deletes.
- **⚠️ Watch out for:**
  - ⛔ Do **not** change what release-please bumps until maintainer picks the version truth.
  - Keep all six names + installer + DMG + AUR flows byte-identical in naming.
  - Dry-run on a **fork tag** first.
- **✅ Done when:** CI has no Deno step, six binaries build with historic names, metadata no longer names deleted config.

### 9. ✂️ Cut over docs, decisions, and the Deno shim

- **Where:** `deno.json` (delete) · `README.md` · `CONTRIBUTING.md` · `AGENTS.md` · `docs/agents/*` · issue templates · `docs/adr/` (015+) · `CONTEXT.md`
- **What:** Delete shim, update all user/agent Deno mentions, record three ADRs + glossary terms.
- **Why:** Point of no return — goes last, when everything is green.
- **⚠️ Watch out for:**
  - Keep this change to _docs + one deletion_ so revert stays one commit until merge.
  - Each ADR needs **decision + alternative + reason** (native-first · keep-Cliffy + prototype result · version truth).
- **✅ Done when:** case-insensitive old-runtime search finds only historical changelog/ADR refs; ADRs linked from map issue.

---

## Verification

### A. Command sequence (in order, all must succeed)

```bash
bun install                  # reproducible bun.lock, no missing modules
bun check                    # same error set via mask task and hook
mask lint                    # Biome clean
mask run -- generate --offline   # stdout identical to main (throwaway repo)
mask run -- config list          # output identical to main
mask compile                 # own-platform binary runs, size recorded
```

| #   | Command                                           | Expectation                                 |
| --- | ------------------------------------------------- | ------------------------------------------- |
| 1   | `bun install` (clean cache)                       | reproducible `bun.lock`, no missing modules |
| 2   | typecheck script                                  | same error set via mask task _and_ hook     |
| 3   | `mask lint`                                       | Biome clean                                 |
| 4   | `mask run -- generate --offline` (throwaway repo) | stdout identical to `main`                  |
| 5   | `mask run -- config list`                         | output identical to `main`                  |
| 6   | `mask compile` (own platform)                     | binary runs, size recorded                  |

### B. Behavior parity vs `main`

- [ ] `generate --offline` stdout **identical**
- [ ] `config list` output **identical**
- [ ] Spinner → **stderr only, TTY only**
- [ ] `commit` without TTY → **fails fast**
- [ ] Exits: `0` success · `1` fatal · `2` usage · `130` abort · signals `130 / 143 / 129`

### C. Edge cases to poke explicitly

- ⏱️ Command timeout via small `git.timeoutMs`
- 🚫 Missing binary → not-found message (not a stack)
- 📝 Editor with `VISUAL` set / `EDITOR` set / neither set
- 📄 Preview: single-line vs multi-line vs heading-with-emphasis vs piped output
- 📦 Binary size per target **before vs after** Steps 1 and 6 — must not exceed Deno baseline without a decision

### D. Binary size baseline (Deno 2.3.0 release vs Bun 1.4.3 `mask release`, maintainer-measured 2026-10-10)

| Asset | Deno 2.3.0 | Bun | Delta |
|---|---:|---:|---|
| `commit-sage-linux-gnu-x64` (was `linux-x64`) | 165 MB | 93 MB | −44% |
| `commit-sage-linux-gnu-arm64` (was `linux-arm64`) | 165 MB | 93 MB | −44% |
| `commit-sage-linux-musl-x64` (new target) | — | 87 MB | new |
| `commit-sage-linux-musl-arm64` (new target) | — | 86 MB | new |
| `commit-sage-macos-x64` | 141 MB | 82 MB | −42% |
| `commit-sage-macos-arm64` | 130 MB | 74 MB | −43% |
| `commit-sage-windows-x64.exe` | 141 MB | 99 MB | −30% |
| `commit-sage-windows-arm64.exe` | 135 MB | 86 MB | −36% |
| macOS DMGs / NSIS setup.exe | 44–46 MB | — | ⬜ needs release dry-run |

Every compiled target is well under its Deno baseline. DMGs and the
installer wrap the binaries, so they follow once the release runs.

---

## Open Questions

| #   | Question                                                                                                                   | Blocks | Owner      | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------- | :----: | ---------- | :----: |
| 1   | Version truth: `version.txt` or `package.json` — what does release-please bump?                                            | Step 8 | maintainer | ⬜ Open |
| 2   | Strict flags: hand-fix all `noUncheckedIndexedAccess` / `noUnusedLocals`, or relax in `tsconfig.json`?                     | Step 3 | maintainer | ✅ Decided — relaxed 3 flags (see Step 3 checkpoint); record in ADR |
| 3   | Cliffy fallback trigger: which prototype failure (raw-mode, Checkbox search, `Secret`, Windows) forces Commander/Inquirer? | Step 1 | maintainer | ✅ Moot — install landed, no fallback triggered; tighten `^` to exact post-prototype |
| 4   | Preview acceptance: default native theme OK, or must it byte-match charmd via callbacks?                                   | Step 6 | maintainer | ⬜ Open |
| 5   | Must pipeline prove working `windows-arm64` + document glibc floor before cutover?                                         | Step 8 | maintainer | ⬜ Open |

> **Note on code in this plan:** per planning discipline, snippets above are _diagnostics and expected-behavior descriptions only_ (commands to run, outputs to compare). No drop-in implementation is included — the human writes all code by hand.
