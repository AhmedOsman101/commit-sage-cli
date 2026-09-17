# Feature Gap Analysis: CLI vs VS Code Extensions

Source: Codegraph exploration of three codebases (CLI commit-sage v2.0 rewrite, VS Code v2.2.13 @ 56d0bdb, VS Code v3.3.2 @ 081557d) and grilling decisions.

Goal: CLI achieves feature parity with VS Code v3.3.2 plus extensions (custom templates, local-first focus).

## Executive Summary

| Category | CLI (Current) | VS Code v2.2.13 | VS Code v3.3.2 | Gap Severity |
|----------|---------------|-----------------|----------------|--------------|
| Providers | 11 | 4 | 8+ (different set) | Medium — add 3, keep 11 |
| Formats | 6 | 6 | 11 | Low — add 5 formats |
| Languages | 4 | 5 | 9 + custom | Low — add 5 + custom |
| Custom Instructions | --context flag only | Config-driven | custom format gate | Medium — add config + custom format |
| Recent Commits as Examples | No | No | previous format + useRecentCommitsAsContext | High priority |
| Project Config (.commitsage/config.json) | No | No | File watcher, migration | High priority |
| Commitlint Validation | No | No | Built-in engine + auto-fix | Medium — maybe |
| OpenRouter PKCE | No | No | vscode:// URI handler | Medium — CLI needs different auth flow |
| OpenAI-Compatible (LM Studio/vLLM/llama.cpp) | No | No | COMPAT_SPECS | Highest priority |
| RefStore / Issue Refs | No | No | Per-branch, prompt/branch/input | Low — CLI flags |
| Custom Language Translations | No | No | .commitsage/translations.json | Low — ~/.config/commitSage/templates/ |
| Git Blame Analysis | Basic | Yes | Per-file, graceful degrade | Low — deepen |
| Settings Webview | No | No | Sidebar, combobox/fuzzy | Out of scope (VS Code UI) |
| Telemetry | No | Basic | Amplitude, opt-in | Out of scope |
| Walkthroughs | No | No | .md onboarding | Out of scope |
| Offline Generator | Yes (conventional-only) | No | No | CLI advantage — keep |
| Interactive Staging | Yes (Cliffy Checkbox) | No (uses SCM) | No (uses SCM) | CLI advantage |

## Detailed Gap Matrix

### Providers

| Provider | CLI | VS Code v2 | VS Code v3 | Notes |
|----------|-----|------------|------------|-------|
| gemini | Yes | Yes | Yes | |
| openai | Yes | Yes | Yes | |
| anthropic/claude | Yes | No | Yes | VS Code v3: claude alias |
| deepseek | Yes | No | Yes | |
| mistral | Yes | No | No | CLI only |
| xai/grok | Yes | No | Yes | VS Code v3: xai |
| ollama | Yes | Yes | Yes | |
| moonshotai | Yes | No | No | CLI only (Kimi) |
| zai/glm | Yes | No | No | CLI only |
| minimax | Yes | No | No | CLI only |
| openrouter | Yes | No | Yes | VS Code v3 has PKCE auth |
| codestral | No | Yes | Yes | Add to CLI (Mistral code model) |
| groq | No | No | Yes | Add to CLI (fast, free tier) |
| openai-compatible | No | No | Yes | Add to CLI (LM Studio, vLLM, llama.cpp) — #1 priority |

Action: Keep all 11 CLI providers. Add groq, codestral, openai-compatible. Total: 14 providers.

### Formats

| Format | CLI | VS Code v2 | VS Code v3 | Template Source |
|--------|-----|------------|------------|-----------------|
| conventional | Yes | Yes | Yes | Both |
| angular | Yes | Yes | Yes | Both |
| karma | Yes | Yes | Yes | Both |
| semantic | Yes | Yes | Yes | Both |
| emoji | Yes | Yes | Yes | Both |
| emojiKarma | No | Yes | Yes | Port from VS Code |
| google | No | No | Yes | Port from VS Code |
| atom | No | No | Yes | Port from VS Code |
| detailed | No | No | Yes | Port from VS Code |
| previous | No | No | Yes | Needs recent-commits feature |
| freeform | Yes | No | No | CLI only (AI-only, no constraints) |
| custom | No | No | Yes | Needs custom instructions |

Action: Add 5 formats from VS Code (emojiKarma, google, atom, detailed, previous). Add custom format (gated by custom instructions). Keep freeform as CLI alias or merge.

### Languages

| Language | CLI | VS Code v2 | VS Code v3 |
|----------|-----|------------|------------|
| english | Yes | Yes | Yes |
| russian | Yes | Yes | Yes |
| chinese | Yes | Yes | Yes |
| japanese | Yes | Yes | Yes |
| spanish | No | Yes | Yes |
| german | No | No | Yes |
| french | No | No | Yes |
| korean | No | No | Yes |
| portuguese | No | No | Yes |
| custom | No | No | Yes |

Action: Add 5 languages + custom (user-defined via ~/.config/commitSage/templates/).

### Custom Instructions / Custom Format

| Feature | CLI | VS Code v3 | Notes |
|---------|-----|------------|-------|
| useCustomInstructions config | No | Yes | Boolean gate |
| customInstructions config | No | Yes | Free-text |
| custom format | No | Yes | Means "use customInstructions verbatim" |
| --context flag | Yes | No | Injects ## External Context into prompt |
| Custom template files | No | No | New CLI feature: ~/.config/commitSage/templates/*.md |

Grilling Decision: User has --context for ad-hoc additions. Wants persistent custom templates as markdown files in config dir. custom format = use selected template. Cleaner than VS Code's single-string customInstructions.

### Recent Commits as Style Examples

| Feature | CLI | VS Code v3 | Notes |
|---------|-----|------------|-------|
| useRecentCommitsAsContext | No | Yes | Toggle |
| recentCommitsCount | No | Yes | Default 5, max 20 |
| recentCommitsScope | No | Yes | all | mine (by git email) |
| previous format | No | Yes | Mimic recent commits — no fixed template |
| MIN_EXAMPLE_COMMIT_LENGTH | N/A | 10 | Filter noise (fix, wip) |
| Noise filter regex | N/A | RECENT_COMMIT_NOISE | Filters merge commits, reverts, etc. |

Grilling Decision: Priority #2. Enables previous format + improves all formats with repo-specific style.

### Project Config (.commitsage/config.json)

| Feature | CLI | VS Code v3 | Notes |
|---------|-----|------------|-------|
| Per-repo config file | No | Yes | .commitsage/config.json |
| File watcher (auto-reload) | No | Yes | vscode.workspace.createFileSystemWatcher |
| Legacy migration (.commitsage file to dir) | No | Yes | One-time |
| Project config overrides global | No | Yes | ConfigService.isProjectOverridden(key) |
| Schema validation on load | No | Yes | Lenient parser, drops invalid keys |

Grilling Decision: Priority #3. CLI equivalent: ~/.config/commitSage/config.json (global) + .commit-sage/config.json (per-repo, optional). File watcher -> poll or Deno.watchFs (Deno 1.40+).

### Commitlint Validation

| Feature | CLI | VS Code v3 | Notes |
|---------|-----|------------|-------|
| Built-in engine (no Node dep) | No | Yes | Ported rule sets |
| Config discovery (package.json, .commitlintrc.*) | No | Yes | Cosmiconfig-like |
| CONFIG_DRIVEN_FORMATS vs COMMITLINT_COMPATIBLE_FORMATS | N/A | Yes | Split: some formats use config rules, some builtin |
| Auto-fix on validation failure | No | Yes | Rewrites message to pass |
| commitlintEngine setting | N/A | Yes | builtin | external (spawn npx commitlint) |

Grilling Decision: Maybe (Priority 0). If implemented: use builtin engine (port rule sets), CLI flag --commitlint / --no-commitlint, config commit.commitlint.enabled.

### OpenRouter PKCE

| Feature | CLI | VS Code v3 | Notes |
|---------|-----|------------|-------|
| OAuth PKCE flow | No | Yes | vscode:// URI handler |
| State + code verifier | No | Yes | Crypto secure |
| Token refresh | No | Yes | Auto-refresh before expiry |
| Token storage | No | Yes | VS Code SecretStorage |

CLI Approach: No URI handler possible. Options:
1. Device Code Flow (OAuth 2.0 Device Authorization Grant) — user visits URL, enters code
2. Manual token entry — user pastes token from OpenRouter dashboard (current CLI pattern)
3. Browser-launch + localhost callback — spawn server on localhost:PORT, open browser, receive callback

Recommendation: Option 3 (localhost callback) for UX parity. Fallback to Option 2.

### OpenAI-Compatible Provider (Local LLMs)

| Feature | CLI | VS Code v3 | Notes |
|---------|-----|------------|-------|
| openai-compatible provider | No | Yes | Single provider, multiple specs |
| COMPAT_SPECS registry | No | Yes | LM Studio, vLLM, llama.cpp, Ollama (OpenAI-compat), Custom |
| Custom baseUrl + model | No | Yes | Per-spec defaults + override |
| Auto-detect local servers | No | Yes | Health check endpoints |

Grilling Decision: Priority #1. Highest local-first value. Implement as new provider type with spec registry.

### RefStore / Issue Refs

| Feature | CLI | VS Code v3 | Notes |
|---------|-----|------------|-------|
| Per-branch ref storage | No | Yes | BranchRefs type |
| refs.source | No | Yes | prompt | branch | input |
| refs.placement | No | Yes | start | end | footer |
| refs.branchPattern | No | Yes | Regex: [A-Z][A-Z0-9]*-[0-9]+ |
| promptForRefs config | Exists, unused | Yes | Triggers input box |

Grilling Decision: Priority #7. CLI flags: --ref, --ref-source, --ref-placement, --ref-pattern. Config mirrors VS Code.

### Custom Language Translations

| Feature | CLI | VS Code v3 | Notes |
|---------|-----|------------|------------|
| .commitsage/translations.json | No | Yes | Per-project |
| Global translations | No | No | New CLI feature: ~/.config/commitSage/templates/ |
| Webview editor for translations | No | Yes | VS Code only |

Grilling Decision: User wants custom templates as markdown files in ~/.config/commitSage/templates/. Each file = a format template. Language = subdirectory or frontmatter.

### Git Blame Analysis

| Feature | CLI | VS Code v3 | Notes |
|---------|-----|------------|------------|
| Per-file blame | Basic | Yes | |
| Blame + diff correlation | Yes | Yes | Changed lines to author mapping |
| Graceful degradation | Yes | Yes | Returns empty string on error |
| Token cost awareness | No | No | New: truncate/summarize if > N tokens |

Grilling Decision: Deepen if token-efficient. Add token budget, summarize blame by author + file instead of line-by-line.

## Effort Estimates (Rough)

| Feature | Effort | Risk | Dependencies |
|---------|--------|------|--------------|
| OpenAI-compatible provider | 3-5 days | Low | Provider registry, spec config |
| Recent commits + previous format | 3-4 days | Low | GitService.getRecentCommitMessages, PromptService |
| Project config (per-repo) | 4-5 days | Medium | ConfigService refactor, file watcher |
| Custom instructions + custom format | 2-3 days | Low | Config schema, template loader |
| Additional formats (5) | 1-2 days | Low | Template files, register in index |
| Additional languages (5 + custom) | 1-2 days | Low | Template translations, custom loader |
| RefStore / issue refs (CLI) | 2-3 days | Low | Config, git branch parsing, flags |
| Commitlint validation (builtin) | 5-7 days | Medium | Port rule sets, config discovery, auto-fix |
| OpenRouter PKCE (device code/localhost) | 3-4 days | Medium | OAuth flow, token storage |
| Custom language templates (markdown) | 2-3 days | Low | Template loader, frontmatter parsing |
| Deeper git blame (token-aware) | 2-3 days | Low | Token estimation, summarization |

## Phasing Recommendation

### Phase 1: Local-First Foundation (v2.1 - v2.3)
1. OpenAI-compatible provider — LM Studio, vLLM, llama.cpp, custom
2. Additional formats — emojiKarma, google, atom, detailed (trivial)
3. Additional languages — de, fr, es, ko, pt (trivial)
3. Custom template files — ~/.config/commitSage/templates/*.md

### Phase 2: Repo Intelligence (v2.4 - v2.5)
5. Recent commits as examples — GitService.getRecentCommitMessages, inject into prompt
6. previous format — mimic recent commits template
7. Deeper git blame — token-budgeted, author/file summary

### Phase 3: Project Config & Customization (v2.6 - v2.7)
8. Project config — .commit-sage/config.json + watcher
9. Custom instructions + custom format — persistent templates
10. RefStore / issue refs — CLI flags + config

### Phase 4: Validation & Polish (v3.0)
11. Commitlint validation — builtin engine, auto-fix (if approved)
12. OpenRouter PKCE — device code flow or localhost callback
13. Provider consolidation — add groq, codestral; audit all 14

## Non-Goals (Explicitly Out of Scope)

- Settings webview (VS Code UI only)
- Walkthroughs/onboarding (VS Code only)
- Telemetry/Amplitude (privacy concerns)
- VS Code-specific integrations (SCM, webview, SecretStorage, URI handlers)

## Open Questions

1. Commitlint: Build builtin engine (port rule sets) vs spawn npx commitlint vs skip? Grilling says maybe.
2. OpenRouter auth: Device code flow vs localhost callback vs manual entry?
3. Project config precedence: Global -> per-repo -> CLI flags (standard)?
4. Custom template format: Markdown with frontmatter? Liquid/Handlebars? Plain text with placeholders?
5. Token budget for blame: What is the limit? (Suggest: 2000 tokens ≈ 8k chars)