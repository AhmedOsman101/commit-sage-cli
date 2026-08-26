## Destination

Ship Config V2 — `model: "provider/model"` (first-slash split, multi-segment ids like `9router/kc/stealth/ox-alpha`), open `providers` registry (`providers.defaults` + `providers.<name>` + `providers.<name>.models` presets), `apiKey: "$ENV"` for all providers, `reasoning: boolean|ProviderReasoning` tri-state, `apiType: openai-chat|openai-responses|anthropic`, BCP-47 `commitLanguage` store-as-given (`ja`/`jp`), renames `general→generation`/`maxSubjectLength→maxLength`/`initialRetryDelayMs→retryDelay`/`maxInputChars→maxPromptTokens` via tokenizer, per-value fallback `model > provider > defaults`, shallow `config get/set`, automatic migration with batched warnings.

Spec: `docs/specs/2026-08-04-config-v2.md` — ADR: `docs/adr/002-config-v2.md` — Plan: `docs/plans/2026-08-04-config-v2.md`

Done when: `commit-sage config list` shows new shape, `generate --model 9router/kc/stealth/ox-alpha` works, `providers.ollama.apiKey` optional, `generation.maxPromptTokens` token-counted, `commit.maxLength` + `generation.retryDelay` migrated, 4 tickets closed, no `general`/`provider.type` top-level remains.

## Notes

- Stack: Deno + TypeScript, `zod`, `lib-result` Result, Cliffy `Command`, `mask` tasks, `js-tiktoken`/`gpt-tokenizer` spike in Task 2.
- Skills every session: `grill-with-docs` (done), `writing-plans` (done), `executing-plans`/`subagent-driven-development` for tickets; `codegraph_explore` mandatory before edits; `verification-before-completion` before claim done.
- Reference shapes: `~/.config/opencode/opencode.jsonc#provider` + `~/.pi/agent/models.json#providers` — took map `models` + open registry, not `limit` nesting or `attachment`/`modalities`.
- Migration: refactor existing `ConfigService.migrateConfig` (not new function), batch warnings, fail only on empty model / invalid provider.
- CLI: `--model "provider/model"` replaces `--provider`+`--model` pair; keep deprecated `--provider` with warning for one release.

## Decisions so far

<!-- one line per closed ticket — gist + link -->

## Not yet specified

<!-- fog toward destination — in-scope but not yet ticketed -->
- Future interactive model picker using `providers.<name>.models[*].name` display names (out of this slice, noted in spec).
- Additional `providers.defaults` tuning (e.g. `temperature` in defaults vs `generation`) if per-value fallback proves redundant — revisit after T3.
- Extra languages beyond `en`/`ru`/`zh`/`ja`/`jp` — BCP-47 open, just extend alias map.

## Out of scope

- `input`/`output` modalities, `attachment`, `npm` provider metadata from `opencode`/`pi` — text CLI only.
- Ordered `models` array — map chosen for `config edit` ergonomics.
- Deep `config get/set` for `providers.*.models` — intentionally shallow, use `config edit`.
- `inputTypes`/`outputTypes` from `pi` — not ported.
