# Roadmap: Post-V2 Refactor & Custom Providers (v2.0.x → v2.2)

> **Status:** Planned — grilled 2026-09-18, decisions archived in the per-phase docs
> **Supersedes:** the provider/factory portions of [`roadmap.md`](roadmap.md) (the v3 feature-adoption phases for formats/languages/recent-commits remain valid there)
> **Baseline:** v2.0.0 on `main` (Config V2 T1–T4 shipped: `model: "provider/model"`, `providers` registry, `apiKey: "$ENV"`, `apiType`, BCP-47 language, token-counted `maxPromptTokens`)

## Context

Five concerns surfaced during the Config V2 grilling that V2 did not close:

1. **Provider code duplication** — 11 subclasses under `src/services/providers/`, ~362 lines duplicated (fallow dupes, measured pre-V2; the two biggest clone groups survived V2: the wrap→generateText shell ×11, the debug-log-heavy template ×3).
2. **Custom providers** — the V2 registry accepts any `providers.<name>` entry and `model: "any-thing/model"` splits fine, but `providerRegistry.ts` is a closed `Record<11-known, class>`; an unknown provider name fails at dispatch.
3. **`generation.diffStrategy` vs `commit.onlyStagedChanges`** — two config keys, one decision. `AiService.resolveDiffMode()` consults `onlyStagedChanges` only in the `auto` branch; `commit.ts:158` reads it again for the nothing-staged early-exit.
4. **`commit.promptForRefs`** — declared in types/schema/validation/defaults, read by nothing.
5. **Per-provider `baseUrl` reads** — each provider special-cases its own config read instead of using the V2 per-value fallback chain.

## Decisions (grilled)

| # | Question | Decision |
|---|----------|----------|
| D1 | `diffStrategy` vs `onlyStagedChanges` | Delete `onlyStagedChanges`; `diffStrategy` is the single knob. Migrate via `migrateConfig`. |
| D2 | `promptForRefs` | Implement as a feature — off by default, opt-in flag. Not delete (it is useful), not wire blind. |
| D3 | `apiKeyEnvVar` generalization | Closed by V2 T3 (`providers.<name>.apiKey: "$ENV"`). No work. |
| D4 | Custom providers | Full spec registry (opencode/oh-my-pi style): any provider entry with `id`, `baseUrl`, `apiKey`, `apiType`, models each with its own schema. Known providers stay first-class; everything else dispatches generically on `apiType`. |
| D5 | Factory pattern | Strategy/adapter literals + shared `run()` in `ModelService`. Per-provider files shrink to ~5-line literals; registry stays file-per-provider for grep-ability. |
| D6 | Tests | Smoke-only (manual `mask run` per provider family + `mask typecheck`). No test suite in this scope. |
| D7 | Breaking changes | Config V2 already shipped the break (v2.0.0). These changes ride the same major; user merges/bumps manually. |

## Phases

Vertical slices, each shippable independently, ordered so behavior-neutral work de-risks the rest.

### Phase A — Provider adapter refactor (behavior-neutral)

**Doc:** [`provider-adapter-refactor.md`](provider-adapter-refactor.md)
**Goal:** delete the duplication (concern 1) and fold `baseUrl` into the per-value fallback chain (concern 5). No user-visible change.

- Introduce `ProviderAdapter` interface + `defineProvider()` literal helper.
- Move the shared shell (resolve → key → baseUrl → apiType → options → wrap → generateText → retry) into one `ModelService.run()`.
- 11 provider files become adapter literals; reasoning variants become `providerOptions` functions on the adapter.
- `baseUrl` read via `ConfigService.resolveProviderValue(provider, modelId, "baseUrl")` — no per-provider special cases.

**Verify:** `mask typecheck`, `mask run` against one provider per family (openai-chat, openai-responses, anthropic, google, ollama). Behavior identical.

### Phase B — Provider spec registry (custom providers)

**Doc:** [`provider-spec-registry.md`](provider-spec-registry.md)
**Goal:** close concern 2. Any OpenAI-compatible or Anthropic-compatible endpoint works from config alone: `model: "9router/kc/stealth/ox-alpha"` with a `providers.9router` entry.

- Registry fallback: unknown provider name → read `providers.<name>` → build generic adapter from `apiType` (`openai-chat`/`openai-responses` → `createOpenAI`, `anthropic` → `createAnthropic`).
- Preset specs for local servers (lmstudio, vllm, llamacpp, ollama-openai) with default base URLs + health endpoints; auto-discovery optional/deferred.
- `models` shape: per-model entries each carrying their own schema (user decision D4 — see doc for the map-vs-array migration note against shipped V2).
- Validation: unknown provider with no `providers.<name>` entry → clear error naming the fix.

**Verify:** `mask run generate --model my-router/foo` against a real OpenAI-compatible endpoint (9router, LM Studio); `config list` shows the entry.

### Phase C — Diff mode consolidation

**Doc:** [`diff-mode-consolidation.md`](diff-mode-consolidation.md)
**Goal:** close concern 3. One knob for staged/unstaged.

- Delete `commit.onlyStagedChanges` from types, schema, validation, defaults, `TYPE_MAP`.
- `resolveDiffMode()`: `staged` → staged, `unstaged` → unstaged, `auto` → staged iff `hasStagedChanges`.
- `commit.ts` early-exit keyed off the resolved mode, not a second config read.
- `migrateConfig`: `onlyStagedChanges: false` + `diffStrategy: "auto"` → `diffStrategy: "unstaged"`; drop the key either way, batched warning.

**Verify:** `config list` post-migration on a v2.0 config; `generate` in auto/staged/unstaged modes in a scratch repo.

### Phase D — Refs feature (promptForRefs)

**Doc:** [`prompt-for-refs.md`](prompt-for-refs.md)
**Goal:** close concern 4 as a real feature (decision D2), not a wiring of the dead key.

- Off by default. Opt-in per run: `--ref JIRA-123` (repeatable) or `--refs` (prompt).
- Refs land in the footer of the generated message; `commit.promptForRefs` becomes the persistent opt-in for the interactive prompt.
- Only the `commit` flow prompts; `generate` accepts `--ref` values for scripting.

**Verify:** `mask run commit --refs` with and without input; footer placement in preview and in `git log -1`.

## Ordering & versioning

| Phase | Depends on | Version | Effort |
|-------|-----------|---------|--------|
| A | — | v2.0.x | 1 day |
| B | A (generic adapter is just two more literals) | v2.1.0 | 2–3 days |
| C | — (independent; placed after A so schema churn lands once) | v2.1.0 | 0.5 day |
| D | — | v2.2.0 | 1–2 days |

A before B: B's generic adapters are two additional literals in A's shape — building B first would mean writing the old duplication twice. C is independent but lands after A to keep each release diff reviewable.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Adapter refactor changes retry/timeout behavior subtly | Low | High | Phase A is byte-for-byte shell-moving; diff review + one smoke per family |
| Generic adapter hits an endpoint needing nonstandard headers/params | Medium | Medium | `headers` field on provider entries; escape hatch: promote to first-class provider file |
| `models` array vs shipped V2 map migration | Medium | Medium | Migration in `migrateConfig` before validation; see spec-registry doc |
| `onlyStagedChanges` removal surprises scripted users | Low | Low | `config list` post-migration + CHANGELOG breaking note |
| AI SDK breaking changes | Medium | High | Versions pinned in `deno.json`; smoke per family before release |
