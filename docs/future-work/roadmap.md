# Roadmap: CLI v3.0 Feature Adoption

Source: Grilling decisions + feature-gap analysis + architecture comparison
Versioning: Current rewrite = v2.0.0. Feature adoption = v3.0.0 (or minor versions v2.1-v2.x then v3.0)
Principle: Vertical slices (schema -> service -> CLI -> docs per feature). No big-bang.

## Phase 0: Prerequisites (v2.0.x — Current)

Must complete before any v3 features. From migration spec.

| Task | Status | Notes |
|------|--------|-------|
| Fix constants.ts module-load coupling | Blocking config subcommand | Move REPO_PATH to lazy getRepoPath() |
| Wire dead config keys (autoCommit, autoPush, promptForRefs) | In commit subcommand | Already in schema |
| Add --version flag (installer expects it) | Easy | Cliffy .version(VERSION) |
| Update README (stale) | Easy | Document subcommands, flags, --offline |
| Fix installer commit-sage --version call | Easy | After version flag works |

## Phase 1: Local-First Foundation (v2.1 - v2.3)

Theme: "Run any local model, zero config"
Priority: Grilling #1 (OpenAI-compatible), #4 (formats), #5 (languages)

### v2.1: OpenAI-Compatible Provider Spec Registry

| Task | Effort | Dependencies |
|------|--------|--------------|
| Design Provider protocol (interface) | 1 day | Architecture decision |
| Implement providerRegistry.ts with COMPAT_SPECS | 2 days | Protocol |
| Implement OpenAICompatibleService | 2 days | Vercel AI SDK createOpenAI |
| Add config schema: provider.openaiCompatible.{spec,baseUrl,model,apiKey} | 0.5 day | |
| Add --provider openai-compatible --model <name> --base-url <url> flags | 0.5 day | |
| Auto-discovery: probe localhost:1234/8000/11434/v1/8080 on startup | 1 day | |
| Docs: Local LLM guide (LM Studio, vLLM, llama.cpp, Ollama OpenAI) | 1 day | |

Deliverable: commit-sage generate --provider openai-compatible --model qwen2.5-coder-7b --base-url http://localhost:1234/v1

### v2.2: Additional Formats (Trivial Ports)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Port emojiKarma, google, atom, detailed templates | 1 day | VS Code source |
| Register in templates/index.ts, add to COMMIT_FORMATS | 0.5 day | |
| Add to config.schema.json enum | 0.5 day | |
| Update CLI flag help | 0.5 day | |

Deliverable: 10 formats total (6 -> 10)

### v2.3: Additional Languages

| Task | Effort | Dependencies |
|------|--------|--------------|
| Add spanish, german, french, korean, portuguese to SUPPORTED_LANGUAGES | 0.5 day | |
| Translate 10 format templates x 5 languages = 50 translations | 2-3 days | Can phase: English-first, translations follow |
| Add custom language support (template file frontmatter) | 1 day | Template loader (**v2.7**) |

Deliverable: 9 languages + custom

## Phase 2: Repo Intelligence (v2.4 - v2.5)

Theme: "Know your repo, write like your team"
Priority: Grilling #2 (recent commits), #9 (blame depth)

### v2.4: Recent Commits as Style Examples

| Task | Effort | Dependencies |
|------|--------|--------------|
| Implement GitService.getRecentCommitMessages(repoPath, count, scope) | 1 day | git log --format=%B%x00 |
| Add MIN_EXAMPLE_COMMIT_LENGTH = 10 + noise filter regex | 0.5 day | VS Code RECENT_COMMIT_NOISE |
| Add config: commit.useRecentCommitsAsContext, recentCommitsCount, recentCommitsScope | 0.5 day | |
| Add CLI flags: --recent-commits, --recent-count, --recent-scope | 0.5 day | |
| Modify PromptService.buildPrompt to inject recent commits | 1 day | |
| Add previous format template (instruction-only) | 0.5 day | |

Deliverable: commit-sage generate --format previous mimics repo style

### v2.5: Deeper Git Blame (Token-Aware)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Add token estimation (rough: 1 token ≈ 4 chars) | 0.5 day | |
| Summarize blame by author+file instead of line-by-line if > 2000 tokens | 1 day | |
| Add config: commit.blameTokenBudget (default 2000) | 0.5 day | |
| Graceful degradation: skip blame if single file > budget | 0.5 day | |

Deliverable: Richer context without prompt explosion

## Phase 3: Project Config & Customization (v2.6 - v2.7)

Theme: "Per-repo settings, persistent templates"
Priority: Grilling #3 (project config), #4 (custom instructions), #7 (refs)

### v2.6: Project Config (per-repo; directory name undecided)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Create ProjectConfigService (mirror VS Code ConfigService project config) | 2 days | |
| File watcher: Deno.watchFs (1.40+) with poll fallback | 1 day | |
| Config precedence: global -> project -> CLI flags | 1 day | |
| Migration: detect legacy per-repo config file -> chosen directory + config.json | 0.5 day | Blocked on the directory-name decision (see v2.6 heading) |
| Lenient parser: drop invalid keys with warning | 0.5 day | |
| CLI: commit-sage config project-init to create template | 0.5 day | |

Deliverable: Per-repo config overrides global

### v2.7: Custom Templates + Custom Format

| Task | Effort | Dependencies |
|------|--------|--------------|
| Create ~/.config/commitSage/templates/ on first run | 0.5 day | |
| Template loader: parse frontmatter + markdown body | 1 day | js-yaml or custom |
| Variable substitution: {{diff}}, {{blame}}, {{recentCommits}}, {{languagePrompt}}, {{bodyStylePrompt}}, {{maxLength}}, {{context}} | 1 day | |
| Add custom to COMMIT_FORMATS, customTemplate config | 0.5 day | |
| CLI flag: --template <name> | 0.5 day | |
| Example templates: team-conventional.md, release.md, hotfix.md | 0.5 day | |

Deliverable: commit-sage generate --format custom --template team-conventional

### v2.7b: RefStore / Issue Refs (CLI Flags)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Add config: commit.refs.{enabled,source,placement,pattern} | 0.5 day | |
| Source branch: extract from current branch name via regex | 1 day | |
| Source prompt: interactive input (Cliffy InputPrompt) | 1 day | |
| Source input: CLI flag --ref <value> | 0.5 day | |
| Placement: start | end | footer | 0.5 day | |

Deliverable: commit-sage commit --ref JIRA-123 --ref-placement footer

## Phase 4: Validation & Polish (v3.0)

Theme: "Production-grade, team-ready"
Priority: Grilling #0 (commitlint - maybe). OpenRouter OAuth was on this list but is now deferred and undecided — see v3.0b.

### v3.0: Commitlint Validation (Conditional)

Only if approved — grilling says "maybe"

| Task | Effort | Dependencies |
|------|--------|--------------|
| Port @commitlint/config-conventional + @commitlint/config-angular rule sets | 2 days | |
| Implement config discovery (package.json, .commitlintrc.*) | 1 day | |
| Builtin validation engine (no Node dep) | 2 days | |
| Auto-fix: rewrite message to pass rules | 1 day | |
| Config: commit.commitlint.{enabled,engine} | 0.5 day | |
| CLI flag: --commitlint / --no-commitlint | 0.5 day | |

Deliverable: commit-sage generate --commitlint validates + fixes

### v3.0b: OpenRouter Authentication — DEFERRED, FLOW UNDECIDED

| Task | Effort | Dependencies |
|------|--------|--------------|
| *(nothing scoped yet)* | deferred | Flow choice: RFC 8628 device code (headless-friendly, no port binding, ~5d) vs browser-launch + localhost callback (VS Code v3 UX parity, needs a bound port, ~3-4d) |
| Fallback: manual token entry (current pattern) | ships with v2.1 | — |

**Status (2026-09-18):** OAuth stays deferred past v2.1. The CLI continues to accept an OpenRouter API key (or a manually pasted token) exactly as it does today. Reopen this section when OAuth is actually needed; `feature-gap.md` previously recommended the localhost callback here and device code flow elsewhere — both are now marked undecided rather than picked.

### v3.0c: Provider Consolidation

| Task | Effort | Dependencies |
|------|--------|--------------|
| Add groq provider (Vercel AI SDK createOpenAI + baseUrl) | 1 day | |
| Add codestral provider (Vercel AI SDK createOpenAI + baseUrl) | 1 day | |
| Audit all 14 providers for consistency | 1 day | |
| Update README provider table | 0.5 day | |

Deliverable: 14 providers, all documented

## Effort Summary

| Phase | Features | Est. Days | Target Version |
|-------|----------|-----------|----------------|
| 0 | Prerequisites | 3-5 | v2.0.x |
| 1 | Local-First (OpenAI-compat, formats, languages) | 10-14 | v2.1-v2.3 |
| 2 | Repo Intelligence (recent commits, blame) | 5-6 | v2.4-v2.5 |
| 3 | Project Config & Customization | 8-10 | v2.6-v2.7 |
| 4 | Validation & Polish (commitlint, providers) | 5.5-8.5 | v3.0 |
| Total | | 31.5-43.5 days | |

**Reconciliation (2026-09-18):** Phase 4 previously read 8-10 days, which counted OpenRouter OAuth as scoped (4.5-5d). OAuth is now deferred, so Phase 4 is commitlint (7d) + provider consolidation (3.5d) = **5.5-8.5 days with commitlint conditional** — if commitlint is declined, subtract its 7 days entirely. The `feature-gap.md` per-feature table sums to ~30-40 days because it omits Phase 0 prerequisites (3-5d) and double-counts nothing; the difference from the old 34-45 figure is OpenRouter's removal plus rounding. Per-feature effort differs between the two docs where `feature-gap.md` estimates a feature end-to-end (e.g. "additional formats 1-2d" includes registration and schema) and this roadmap breaks the same work into task rows (2.5d for four formats + registration + schema + help text). Task rows are the binding estimate; the `feature-gap.md` figures are coarse and should be read as ranges, not commitments.

## Release Strategy

### Option A: Minor Versions -> Major

| Version | Contents |
|---------|----------|
| v2.1 | OpenAI-compatible provider |
| v2.2 | + 4 formats |
| v2.3 | + 5 languages |
| v2.4 | + recent commits + previous format |
| v2.5 | + deeper blame |
| v2.6 | + project config *(directory name undecided)* |
| v2.7 | + custom templates + refs |
| v3.0 | + commitlint (if approved) + provider consolidation. OpenRouter OAuth only if its deferred section is reopened |

Pros: Users get value incrementally, easier rollback, semantic versioning clear
Cons: More releases

### Option B: Feature Branches -> Single v3.0

All features in feature/* branches, merged to main for v3.0 release.

Pros: Single migration for users
Cons: Long dark period, merge conflicts, no feedback until v3.0

### Option C: Hybrid

- Phases 1-2 as minors (v2.1-v2.5) — high value, low risk
- Phases 3-4 as v3.0 — config/schema changes, breaking potential

**Recommendation: Option C.** Option A is superseded — it is the same minor-version ladder this roadmap already assumes, except it draws the v3.0 line after v2.7. Option C draws it after v2.5 instead, because Phase 3 (project config) introduces config **precedence**, which is a behavioral break for users with existing global settings, and Phase 4 adds validation. Phases 1–2 are purely additive. Note that the V2 Config rewrite has already shipped one break (v2.0.0); the v2.1–v2.5 minors add nothing that requires migration.

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Vercel AI SDK breaking changes | Medium | High | Pin exact versions in `deno.json`; smoke-test one call per provider family (openai-chat, openai-responses, anthropic, google, ollama) after each SDK bump |
| Deno watchFs instability | Low | Medium | Poll fallback (5s) |
| Commitlint rule port inaccuracies | Medium | Medium | Diff builtin output against `npx commitlint` on a hand-built fixture set of ~20 messages, once, at implementation time |
| OpenRouter API changes | Low | Low | Versioned API; manual token entry fallback; OAuth deferred anyway |
| Custom template security (injection) | Low | High | Sandbox variable substitution, no eval |
| Config migration edge cases | Medium | Medium | Comprehensive test cases, backup |
| Token estimation inaccuracy | Medium | Low | Conservative budget, user override |

## Success Metrics (v3.0)

- [ ] Local-first: Works with LM Studio/vLLM/llama.cpp out of box
- [ ] Repo-aware: previous format mimics team style without config
- [ ] Customizable: Team templates in ~/.config/commitSage/templates/
- [ ] Per-repo: a per-repo config (directory name still undecided) overrides global
- [ ] Provider richness: 14 providers, all free tiers documented
- [ ] Format richness: 12 formats covering all common conventions
- [ ] Language richness: 9 languages + custom
- [ ] Zero breaking changes for existing users (config migration seamless)
- [ ] Documentation: Every feature has README section + --help text

## Dependencies Between Features

```
OpenAI-compatible (v2.1)
    |
    +---> Auto-discovery needs GitService (exists)

Recent Commits (v2.4)
    |
    +---> Previous format (v2.4)
    |
    +---> Custom templates can use {{recentCommits}} (v2.7)

Project Config (v2.6)
    |
    +---> Custom templates per-repo (v2.7)
    |
    +---> Commitlint config discovery (v3.0)

Custom Templates (v2.7)
    |
    +---> Custom format (v2.7)
    |
    +---> RefStore can use template variables (v2.7b)
```

Update this roadmap as phases complete. Track in GitHub issues with roadmap:v3 label.