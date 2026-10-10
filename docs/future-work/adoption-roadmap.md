# CommitSage Extension — Feature-Adoption Roadmap

> Compiled from the extension's live source at `~/work/cloned/CommitSage`
> (`main` @ `58cf31b`, v3.3.3, 2026-10-05) reconciled against CLI v3.0.0
> (Bun runtime, Config V2, 11 providers, 11 formats). Code wins over
> notes; conflicts flagged inline. Date: 2026-10-10.
> Status: M1 shipped (v2.3.0), M2 shipped inside v3.0.0, M3/M4 retargeted.

## Release log (2026-10-10 sync)

- **v2.3.0** (2026-10-08): M1 landed as planned, issues #44/#48-51 closed.
- **v2.4.0 milestone done, never released**: slices #52-54 merged via PR #67,
  but no v2.4.0 release was cut. The features shipped inside v3.0.0 instead.
- **v3.0.0** (2026-10-10): Bun runtime migration (**breaking**: Linux binary
  renames to `-gnu-`/`-musl-`, XDG honored) + the absorbed v2.4.0 features.
- **Consequence**: old v2.5.0 (provider completion) becomes **v3.1.0**; old
  v3.0.0 umbrella (project config + commitlint + diff consolidation) becomes
  **v4.0.0**. Runtime is Bun everywhere below (see AGENTS.md).

## 1. Parity matrix

| # | Extension feature | Evidence (extension) | Confidence | Classification | CLI mapping | Priority | Effort | Target |
|---|---|---|---|---|---|---|---|---|
| 1 | Generate commit message | `package.json:57-63`, `src/commands/generateCommitMessage.ts`, `src/services/commitWorkflow.ts` | HIGH | Already ported | `generate` / `commit` subcommands | — | — | done |
| 2 | 22 set/remove API-key commands | `src/commands/setApiKeys.ts`, `apiKeyManager.ts` | HIGH | Not applicable (see §4) | env var + `providers.<name>.apiKey` | — | — | — |
| 3 | OpenRouter PKCE OAuth | `openRouterAuthService.ts:27-204` | HIGH | Not applicable (deferred) | manual key / device-code; no `vscode://` analogue | — | — | — |
| 4 | Create project config | `src/commands/createProjectConfig.ts` | HIGH | Adoptable w/ adaptation | `config init` scaffolds `.commitsage/config.json` | P1 | M | v4.0.0 |
| 5 | Select-model quick-pick | `src/commands/selectGeminiModel.ts` | HIGH | Not applicable | `--model` flag / `config set model` | — | — | — |
| 6 | `provider.type` registry | `providerCatalog.ts:44-169` | HIGH | Already ported | `model: "provider/model"` + `providers` registry | — | — | done |
| 7 | Commit language (9 fixed) | `promptService.ts:75-92`, templates per-format translations | HIGH | Already ported (open string); extra translations adoptable | `commit.commitLanguage` (BCP-47 open string) | P2 | S | v2.4.0 |
| 8 | `customLanguageName` + cached LLM translation | `customLanguageService.ts`, `.commitsage/translations.json` | HIGH | Adoptable w/ adaptation | `commit.customLanguage` override; cache under config dir | P2 | M | v2.4.0 |
| 9 | 11 commit formats | `src/templates/index.ts`, 10 files in `src/templates/formats/` | HIGH | 6 already ported; 5 adoptable (4 trivial + `previous`) | `COMMIT_FORMATS` extension | P1 | S–M | v2.4.0 |
| 10 | `custom` format = verbatim custom instructions | `formatRules.ts`, templates index dynamic `custom` | HIGH | Adoptable w/ adaptation | `commit.customTemplate` inline string (templates-dir deferred) | P2 | M | v2.4.0 |
| 11 | Custom instructions injection | `package.json:410-437`, `promptService.ts:69-73` | HIGH | Adoptable as-is | `commit.customInstructions` appended to prompt | P1 | S | v2.4.0 |
| 12 | Recent-commits-as-style examples | `useRecentCommitsAsContext`, `recentCommitsCount(1-20)`, `recentCommitsScope`, `gitService.ts:577-604` | HIGH | Adoptable as-is | `commit.recentCommits.{enabled,count,scope}` + `previous` format fallback | P0 | M | v2.3.0 |
| 13 | Commitlint validation (`builtin`) | `commitLintService.ts`, `formatRules.ts:39-125`, `commitlint/*` | HIGH | Adoptable w/ adaptation | prompt-injection + post-check; mechanical auto-fix; no new dep | P1 | L | v4.0.0 |
| 14 | Commitlint `project` CLI engine | `commitLintCliService.ts:32-220` | HIGH | Adoptable w/ adaptation | shell out to repo `commitlint`, trust-gated, builtin fallback | P2 | L | v4.0.0 |
| 15 | `onlyStagedChanges` + `diffStrategy` | `package.json:294-713`, `config.ts:33-335` | HIGH | Already ported (consolidation pending) | both keys live; single-knob consolidation deferred to v4.0.0 umbrella | P2 | S | v4.0.0 |
| 16 | `autoCommit` / `autoPush` | `package.json:294-713` | HIGH | Already ported | `commit.autoCommit`, `commit.autoPush` | — | — | done |
| 17 | Configurable refs (`source/value/placement/branchPattern`) | `refStore.ts`, `refUtils.ts`, `package.json:490-539`, `commitWorkflow.ts:255-269` | HIGH | Adoptable w/ adaptation (see `prompt-for-refs.md` — intentional divergence) | `--ref` (repeatable) + `--refs` prompt; footer-append post-generation; `placement` + `branchPattern` extraction | P1 | M | v2.4.0 |
| 18 | Per-provider `models`/endpoint settings | `openAICompatibleService.ts:125-158`, `modelLists.ts` | HIGH | Already ported | `providers.<name>.models` presets, `baseUrl` | — | — | done |
| 19 | `ollama.useAuthToken` / `ollama.numCtx` | `package.json:612-627`, `ollamaService.ts` | HIGH | Not applicable (see §4) | — | — | — | — |
| 20 | `openrouter.preferFreeModels` | `package.json:600-604`, `modelLists.ts` | HIGH | Not applicable (deferred to model-listing round) | — | — | — | — |
| 21 | `custom` OpenAI-compatible provider | `openAICompatibleService.ts`, `custom.{baseUrl,model,useApiKey,chatCompletionsPath}` | HIGH | Adoptable w/ adaptation | generic dispatch: any `providers.<name>` + `baseUrl` (+ optional `apiType`, `headers`) resolves at runtime; `chatCompletionsPath` dropped (`baseUrl` + `apiType` suffice) | P1 | M | v3.1.0 |
| 22 | `general.temperature/maxDiffSize/maxOutputTokens` | `package.json:294-713`, `baseAIService.ts:23-54` | HIGH | `temperature` ported; other two adoptable | `generation.maxOutputTokens` + truncation-retry doubling; diff budget stays token-based (no char `maxDiffSize`) | P0 | M | v2.3.0 |
| 23 | `apiRequestTimeout` / `gitTimeout` | `package.json:294-713` | HIGH | Adoptable as-is | `generation.timeoutMs` (already in providers.defaults) + `git.timeoutMs` | P1 | S | v2.3.0 |
| 24 | `gemini.thinkingBudget/thinkingLevel` | `geminiService.ts:41-104,286-304` | HIGH | Adoptable w/ adaptation | `providers.gemini.thinkingBudget/thinkingLevel` first-class + `reasoning` cleanup (known providers validate their subset; unknown providers passthrough full set) | P2 | M | v3.1.0 |
| 25 | 11 providers | `providerCatalog.ts:44-169` | HIGH | 11 already ported; `groq` adopts (see #40) | `src/services/providers/` | P1 | S | v3.1.0 |
| 26 | `useCustomInstructions` toggle | `package.json:410-437` | HIGH | Adoptable as-is | `commit.customInstructions.enabled` boolean alongside string | P1 | S | v2.4.0 |
| 27 | Telemetry (Amplitude) | `telemetryService.ts` | HIGH | Not applicable | — | — | — | — |
| 28 | Walkthroughs | `package.json:242-293` | HIGH | Not applicable | — | — | — | — |
| 29 | SCM integration / multi-repo picker | `src/services/gitService.ts:51-149`, `commitWorkflow.ts:271-315` | HIGH | Not applicable | `generate`/`commit` already cover intent | — | — | — |
| 30 | Settings webview sidebar | `src/views/settingsWebviewProvider.ts`, `src/views/webview/*` | HIGH | Not applicable | `config get/set/list/edit/open` covers intent | — | — | — |
| 31 | l10n UI strings | `l10n/bundle.l10n.json`, `vscode.l10n` | HIGH | Not applicable | commit-message languages only (row 7) | — | — | — |
| 32 | File-aware diff truncation | `src/utils/diffTruncation.ts:167-187` | HIGH | Adoptable w/ adaptation | token-budgeted, per-file blocks, noisy-first tiers, fair-share | P0 | L | v2.3.0 |
| 33 | Per-file blame concurrency 8, degrade-to-empty | `gitBlameAnalyzer.ts:14-82` | HIGH | Already ported (verify parity in grill) | `src/services/gitBlameAnalyzer.ts` | — | — | done |
| 34 | `removeThinkTags` thinking strip | `textProcessing.ts`, `baseAIService.ts` | HIGH | Already ported | `src/lib/messageSanitizer.ts` | — | — | done |
| 35 | Temp clamp `[0,2]`, null-omit for reasoning models | `baseAIService.ts`, `aiService.ts:68,132` | HIGH | Already ported | `temperature: null` omit (v2.1.0) | — | — | done |
| 36 | `maxOutputTokens` default 4096, ceiling 32768, doubling-retry | `baseAIService.ts:196-221` | HIGH | Adoptable as-is | `generation.maxOutputTokens` + same retry ladder | P0 | S | v2.3.0 |
| 37 | Gemini/Anthropic/Ollama bespoke wire formats | `geminiService.ts`, `anthropicService.ts`, `ollamaService.ts` | HIGH | Already ported (via `apiType` tri-state) | `providers.<name>.apiType` | — | — | done |
| 38 | Project `.commitsage/config.json` w/ precedence + trust | `configService.ts:323-449`, `projectConfigParser.ts` | HIGH | Adoptable w/ adaptation | poll-once loader, `flags > project > global > defaults`, trust gate for endpoint/auto keys | P0 | L | v4.0.0 |
| 39 | `Mistral` provider | `providerCatalog.ts:135-145` | HIGH | Already ported (ours, since v1.x) | `src/services/providers/mistral.ts` — **leave as-is**; Codestral/Mistral-La-Plateforme split explicitly **dropped** | — | — | frozen |
| 40 | `groq` provider | `package.json:612-627`, `openAICompatibleService.ts` | HIGH | Adoptable as-is | `src/services/providers/groq.ts` preset; default `openai/gpt-oss-120b`, README also recommends `qwen/qwen3-8b-27b` | P1 | S | v3.1.0 |

## 2. Milestones

Sorted for release-please as one feature → one minor (or the v4.0.0 umbrella
for breaking work).

### M1 — v2.3.0 `feat(ai): recent-commits context, file-aware truncation, output budgets`
**Status: shipped in v2.3.0** (issues #44/#48-51, 2026-10-08). As-built divergences recorded in `docs/plans/v2.3-prompt-intelligence.md`.
Theme: **prompt intelligence** — better style mimicry, no silent file drops,
no truncated messages.
- Adopt: `commit.recentCommits.{enabled,count,scope}` (#12), `previous`-format
  recent-examples fallback (#9 partial), file-aware diff truncation (#32),
  `generation.maxOutputTokens` + doubling-retry (#36), doubled-truncation
  `finish_reason` handling (#36), `apiRequestTimeout`/`gitTimeout` (#23).
- Notes: blame context gets a token budget as part of this (from #12/#32).
  `maxDiffSize` char budget deliberately **not** ported — we stay token-based.
- Theme + release: single minor, 1 feature commit + fixes.

### M2 — v2.4.0 milestone, shipped inside v3.0.0
**Status: implemented (#45/#52-54, PR #67) but never released as v2.4.0; features shipped in v3.0.0.** As-built divergences recorded in `docs/plans/v2.4-customization.md`.
Theme: **customization** — user-supplied voice + format catalog + refs footer.
- Adopt: `customInstructions` toggle+string (#11, #26), `custom` format inline
  template (#10), `emojiKarma/google/atom/detailed` formats (#9 partial), extra
  built-in language translations (#7), `customLanguage` LLM-translate w/
  cached `.json` (#8), refs `--ref`/`--refs` + placement + branchPattern (#17).
- Notes: refs plan already exists at `docs/future-work/prompt-for-refs.md`;
  grilling session ratifies the `--ref`/`--refs` split vs. extension's
  input-box flow.

### M3 — v3.1.0 `feat(providers): groq preset, generic openai-compatible dispatch, adapter consolidation, gemini thinking`
Theme: **provider completion** — one new preset, any-gateway dispatch, less
duplication, honest reasoning knobs. No breaking changes.
- Adopt: `groq` preset (#40, default `openai/gpt-oss-120b`), generic dispatch
  for arbitrary `providers.<name>` via `baseUrl` + `apiType` (+ `headers`
  escape hatch) with configuration error when `baseUrl` is missing (#21),
  provider-adapter consolidation first (each provider becomes a
  `defineProvider()` literal + shared `run()`; OpenAI-wire SDKs collapse
  onto `createOpenAI`-with-baseUrl, keeping `anthropic`/`google`/
  `ollama`/`openai`/`openrouter` explicit) (#25-pair), Gemini
  `thinkingBudget`/`thinkingLevel` first-class + `reasoning` subset
  validation for known providers with full passthrough for unknown ones
  (#24).
- **Dropped by maintainer:** Codestral/Mistral La Plateforme split (#39);
  `ollama.useAuthToken/numCtx` (#19 — auth presence already covers it,
  `numCtx` ambiguous); `openrouter.preferFreeModels` (#20 — deferred to
  the model-listing round); `chatCompletionsPath` (#21 partial —
  `baseUrl` + `apiType` suffice).
- Depends on: nothing in M1/M2. Additive. The adapter consolidation lands
  inside M3 (refactor first, then `groq` + generic dispatch as literals).

### M4 — v4.0.0 `feat!: project-level config + commitlint + diff-mode consolidation`
Theme: **breaking umbrella** — all Config V2 breaks land here, one migration.
- Adopt: `.commitsage/config.json` w/ `flags > project > global > defaults`,
  lenient parser, trust gate, poll-once loader (#38); `config init` scaffold (#4);
  commitlint `builtin` engine + prompt-injection (#13); `project` CLI engine
  trust-gated with builtin fallback (#14); collapse `onlyStagedChanges` into
  single `diffStrategy` knob (#15) — the only true break; everything else in
  this milestone is additive behind defaults.
- Migration story: mirror v1→v2 — auto-migrate on first run, batched warnings,
  no manual edits.
- Depends on: M1/M2 shipped; M3 (now v3.1.0) ships first so v4.0.0 can absorb it cleanly.

## 3. Ordering & dependencies

```
v2.3.0 (M1)  ──┐
v3.0.0 (M2 content) ──┼──► v4.0.0 (M4)   # M4 is the breaking umbrella; M3 ships
v3.1.0 (M3)  ──┘    first on the v3 line.
```
- M3 is independent and ships as a v3 minor.
- M4 pulls it together; no Config-V2 break ships before v4.0.0 (the v3.0.0 runtime break already landed separately).
- Shared seams to watch: M1 touches `src/services/prompt.ts` / `ai.ts` /
  `tokenCounter.ts`; M2 touches `src/templates/index.ts` + `prompt.ts`;
  M4 touches `src/services/config.ts` + schema build. Each milestone must
  keep `mask schema check` green.

## 4. Not adopting (appendix)

| Feature | Rationale |
|---|---|
| Settings webview sidebar (#30) | Terminal idiom is `config get/set/list/edit/open`; a TUI settings panel duplicates it with maintenance cost. |
| SCM integration + multi-repo picker (#29) | VS Code runtime-only (`vscode.git`, `inputBox`); CLI's pipe-able `generate` + interactive `commit` already cover the intent. |
| SecretStorage key commands (#2) | Non-interactive `$PROVIDER_API_KEY` + `providers.<name>.apiKey` cover TTY/CI contracts; OS keychain adds scope with no pipe-ability gain. |
| OpenRouter PKCE `vscode://` OAuth (#3) | No browser-callback primitive in a pipe-able CLI. Deferred — manual key / device-code is the honest translation, not a fake PkceFlow. |
| Amplitude telemetry (#27) | A pipe-able CLI has no telemetry channel that doesn't break stdout/pipeability expectations; no phone-home. |
| Walkthroughs (#28) | VS Code onboarding surface; N/A. README + `--help` already cover CLI onboarding. |
| `vscode.l10n` UI-string bundle (#31) | Extension *UI* localization is meaningless in a terminal. Commit-message *languages* (#7) are adopted, UI strings are not. |
| `maxDiffSize` char-budget truncation (#22 partial) | We stay token-counted (`gpt-tokenizer`); file-aware *token* budgeting (M1) preserves intent without a second unit. |
| `codestral` preset + Mistral La Plateforme split (#39) | Maintainer decision: poor model value; existing `mistral` preset kept as-is. |
| `ollama.useAuthToken` / `ollama.numCtx` (#19) | Maintainer decision: low value. Auth presence (`apiKey` set or not) already covers the token case; `numCtx` is ambiguous next to per-model context config. |
| `openrouter.preferFreeModels` (#20) | Deferred, not dropped: meaningless without a model-listing command. Revisit in the model-listing round; key not added. |
| `chatCompletionsPath` (#21 partial) | Maintainer decision: `baseUrl` + `apiType` fully identify an OpenAI-compatible endpoint; the extra path key adds surface for no routing gain. |

## 5. Opportunistic ideas (out of roadmap scope)

- User-defined commit-format templates at `~/.config/commitSage/templates/*.md`
  with `{{diff}}/{{blame}}/{{recentCommits}}/{{languagePrompt}}/...` slots
  (per `format-catalog.md`). Net-new, needs its own design.
- `custom` provider auto-discovery probes against localhost (`llamacpp`/`vllm`
  presets from `provider-spec-registry.md` deferred ideas).
- Blame-aware `Co-authored-by` derivation from dominant author of changed lines.
- Offline-generator classification expansion (currently path-heuristic only).

## 6b. Sync notes (2026-10-10)

- v2.4.0 was implemented but never released; its rows keep `v2.4.0` as the
  historical target with M2 marked shipped-inside-v3.0.0.
- Runtime is Bun 1.4.x (`package.json` + `bun.lock`, `mask typecheck`,
  `Bun.spawn`, `Bun.markdown.ansi()`); historical Deno references in
  archived docs were left untouched — only live docs (this roadmap, the
  v3.1/v4.0 plans, ADR 011) were cut over.
- Shipped shape beat planned shape where the issue comments record a
  maintainer decision: nested `commit.recentCommits`, `~~~`-fenced full
  bodies for `previous`, checkbox translation UI, flags-override-enabled
  refs. See the as-built sections in the v2.3/v2.4 plans.

## 6. Open questions logged for maintainer (surface in final summary)

1. `CONTEXT.md` — contract input lists it, file does not exist in repo.
   Create as glossary-only at first grill, or drop from contract?
2. Project-config directory name — extension code says `.commitsage/`;
   `domain-model.md` left it "undecided". Adopt `.commitsage/`?
3. `config.promptForRefs` live key shipped in v2.2.0 stub — keep as-is in
   v4.0.0 migration, or rename to match extension's `commit.refs.*` shape?
4. Blame token-budget default — extension degrades silently; CLI should
   `Log.warn` once on budget-exhaustion. Acceptable?

## 7. Conflict log: notes vs. code

- `session-prompt.md` cites extension at `6d8bc4e`/v3.3.3; `feature-gap.md`
  cites `081557d`/v3.3.2. Live HEAD is `58cf31b`/v3.3.3. All version pins
  reconciled against live HEAD; no feature disappears between the two cites.
- Notes promise "+3 providers → 14" (`groq`/`codestral`/`openai-compatible`).
  `codestral` dropped per §4/§2-M3; `openai-compatible` became generic
  dispatch (no preset count change); `ollama` extras + `preferFreeModels`
  dropped per §4. Final CLI target: 12 known providers (11 + `groq`) plus
  unbounded user-named gateways.
- `prompt-for-refs.md` says "schema unchanged except description"; current
  schema still has `promptForRefs` with no description — consistent, but the
  follow-through (shipping `--ref`/`--refs`) is still pending and lands in M2.
