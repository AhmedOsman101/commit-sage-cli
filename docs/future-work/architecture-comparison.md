# Architecture Comparison: CLI vs VS Code Extensions

Purpose: Understand architectural differences to inform CLI evolution. Not a rewrite mandate — hybrid approach per grilling (keep lib-result, adopt good patterns).

## High-Level Architecture

### CLI (Current v2.0 Rewrite)

```
Cliffy CLI
root.ts -> generate.ts | commit.ts | config.ts | version.ts

Services:
  PromptService (buildPrompt)
  AiService (generate)
  OfflineGen (generate)
  ConfigService (JSON file + validation)
  ModelService (base + 11 impls)
  GitService (diff, blame, stage, push)

Dependencies:
  lib-result (Result<T, Error>)
  Vercel AI SDK
  Deno std / cliffy
```

Key Characteristics:
- Flat service layer: static methods, default exports
- lib-result everywhere: Result<T, Error> — no exceptions cross boundaries
- Vercel AI SDK: unified provider interface via generateText
- ModelService base class: retry, backoff, reasoning, error classification
- Cliffy: subcommands, prompts, secret input
- No DI container: services import each other directly
- No AbortSignal propagation: timeout via AbortSignal.timeout() only
- Module-load coupling: constants.ts has REPO_PATH = GitService.initialize() (must fix for config subcommand)

### VS Code v2.2.13 (Old)

```
VS Code Extension
extension.ts -> registerCommand('commitsage.generate')

Services:
  AiService (factory)
  PromptService (templates)
  GitService (vscode.git)
  Provider impls (4 classes)
  ConfigService (vscode workspace)
```

Key Characteristics:
- Simple factory: AiService.createProvider(type) returns class instance
- Axios-based: direct HTTP calls per provider
- Hard-coded enums: provider types, formats in constants
- VS Code workspace.getConfiguration: no project config file
- Telemetry: custom TelemetryService (basic events)
- Single command: generate only (no staging/commit flow)

### VS Code v3.3.2 (New) — 5x Code Growth

```
VS Code Extension v3
extension.ts -> activate() -> initialize all services

Core Services:
  CommitWorkflow (orchestrator, AbortSignal, cancellation)
  ConfigService + ProjectCfg (file watcher, migration)
  TelemetryService (Amplitude, opt-in, events for all steps)
  AiService (dispatcher, Provider protocol, 36 callers)
  GitService (vscode.git + GitProcessRunner, BlameAnalyzer, RefStore)
  CommitLintService (builtin engine, config discovery, auto-fix)

Provider Layer:
  Provider impls (8+ classes)
  OpenAICompatibleService (COMPAT_SPECS registry)
  OpenRouterAuthService (PKCE, vscode:// URI handler, token refresh, SecretStorage)

Supporting Services:
  PromptService (recentCommits, customInstr, customLanguage, blameContext)
  SettingsWebviewProvider (sidebar, combobox/fuzzy, PopupItem, Provider protocol)
  CustomLanguageService (.commitsage/translations.json caching)
  RefStore (per-branch issue refs, source=prompt|branch|input)
```

Key Characteristics:
- CommitWorkflow orchestrator: centralizes generation -> validation -> commit, with AbortSignal throughout
- Dependency Injection-ish: services instantiated in extension.ts, passed around
- Provider protocol: interface with 36 callers — enables OpenAI-compatible, OpenRouter PKCE, etc.
- Project config (.commitsage/config.json): file watcher, migration, schema validation
- Builtin commitlint engine: no Node commitlint dep; rule sets ported from @commitlint/config-conventional/angular
- OpenRouter PKCE: vscode:// URI handler, state+PKCE, token refresh, SecretStorage
- OpenAI-compatible: COMPAT_SPECS registry (LM Studio, vLLM, llama.cpp, custom)
- RefStore: per-branch issue refs, source=prompt|branch|input
- Custom language: .commitsage/translations.json caching
- Settings webview: sidebar, combobox/fuzzy, PopupItem, Provider protocol
- Telemetry: Amplitude, opt-in, structured events for every step
- Walkthroughs: .md files for onboarding
- Tests: tests/ dir with coverage (gitBlame, telemetry, prompt, commitlint, templates, configService)

## Architectural Patterns Comparison

| Pattern | CLI | VS Code v2 | VS Code v3 | Recommendation for CLI |
|---------|-----|------------|------------|------------------------|
| Error Handling | lib-result Result<T,E> | Try/catch + custom errors | Try/catch + custom errors | Keep lib-result — non-negotiable |
| Provider Abstraction | ModelService base + Vercel AI SDK | Factory + axios per class | Provider protocol + dispatcher | Adopt protocol — cleaner than base class |
| Orchestration | Inline in generate.ts / commit.ts | Inline in command handler | CommitWorkflow class | Add CommitWorkflow — centralizes logic |
| Cancellation | AbortSignal.timeout() only | None | AbortSignal throughout | Add AbortSignal to all async paths |
| Config | JSON file (~/.config/) | VS Code workspace config | Workspace + project file (.commitsage/) | Add project config (.commit-sage/) |
| DI / Service Locator | Direct imports | Direct imports | Manual instantiation in activate() | Keep direct imports — simple, no container needed |
| Testing | None | None | Vitest + coverage | Add tests for pure functions (offline, prompt, blame) |
| Telemetry | None | Custom | Amplitude + VS Code logger | Out of scope |
| Auth Flows | Manual API key entry | Manual API key entry | PKCE + vscode:// | Device code / localhost callback |
| Local LLM Support | Ollama only | Ollama only | OpenAI-compatible spec registry | Add spec registry |

## CLI-Specific Architectural Debt (from migration spec)

1. constants.ts module-load coupling: REPO_PATH = GitService.initialize() runs at import, exits 1 outside git repo. Blocks config subcommand. Fix: lazy getRepoPath() function.

2. Dead config keys: autoCommit, autoPush, promptForRefs defined in schema, never read. Now wired in commit subcommand.

3. No tests: zero test infrastructure. deno.json has no test task.

4. logError typed never: always exits. Cannot recover.

5. ConfigService.get unsound: returns Ok(undefined) on missing key.

6. Format collapse nuance: angular/karma/semantic NOT byte-identical to conventional — each has own type list.

## Recommended CLI Architecture Evolution

### Phase 1: Fix Debt (Prerequisite)

src/
├── lib/
│   ├── repoContext.ts      # NEW: lazy getRepoPath(), no module-load IO
│   └── constants.ts        # Pure constants only
├── services/
│   ├── commitWorkflow.ts   # NEW: orchestrate generate -> validate -> commit
│   ├── providerRegistry.ts # NEW: Provider protocol, spec registry
│   └── projectConfig.ts    # NEW: .commit-sage/config.json watcher

### Phase 2: Protocol + Registry

```typescript
// src/services/providerRegistry.ts
interface Provider {
  readonly id: string;
  readonly name: string;
  readonly supportsReasoning: boolean;
  readonly supportsStreaming: boolean;
  generateCommitMessage(prompt: string, options: GenerationOptions): Promise<CommitMessage>;
  validateApiKey(key: string): Promise<ValidationResult>;
}

interface ProviderSpec {
  id: string;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  modelsEndpoint?: string;  // for auto-discovery
  authType: 'api-key' | 'oauth-pkce' | 'none';
}

// COMPAT_SPECS equivalent
const OPENAI_COMPAT_SPECS: ProviderSpec[] = [
  { id: 'lmstudio', name: 'LM Studio', defaultBaseUrl: 'http://localhost:1234/v1', defaultModel: 'auto', authType: 'none' },
  { id: 'vllm', name: 'vLLM', defaultBaseUrl: 'http://localhost:8000/v1', defaultModel: 'auto', authType: 'api-key' },
  { id: 'llamacpp', name: 'llama.cpp', defaultBaseUrl: 'http://localhost:8080/v1', defaultModel: 'auto', authType: 'none' },
  { id: 'custom', name: 'Custom', defaultBaseUrl: '', defaultModel: '', authType: 'api-key' },
];
```

### Phase 3: Workflow Orchestration

```typescript
// src/services/commitWorkflow.ts
class CommitWorkflow {
  constructor(
    private git: GitService,
    private prompt: PromptService,
    private ai: AiService,
    private config: ConfigService,
    private lint?: CommitLintService,  // optional
  ) {}

  async execute(options: WorkflowOptions, signal?: AbortSignal): Promise<Result<CommitResult, Error>> {
    // 1. Resolve diff (staged/unstaged per config)
    // 2. Get blame context (token-budgeted)
    // 3. Get recent commits (if enabled)
    // 4. Build prompt (with custom instructions, language, format)
    // 5. Generate message (AI or offline)
    // 6. Validate (commitlint if enabled)
    // 7. Auto-fix if validation fails
    // 8. Return message + metadata
  }
}
```

### Phase 4: Project Config

```typescript
// src/services/projectConfig.ts
class ProjectConfigService {
  private watcher?: Deno.FsWatcher;
  private cache: ProjectConfig | null = null;

  async load(): Promise<ProjectConfig> { ... }
  async watch(repoPath: string): Promise<void> { ... }  // Deno.watchFs (1.40+)
  isOverridden(key: string): boolean { ... }
  get<T>(section: string, key: string): T | undefined { ... }
}
```

## What NOT to Copy from VS Code v3

| Pattern | Reason |
|---------|--------|
| vscode-specific APIs (SecretStorage, UriHandler, WebviewViewProvider) | Not portable |
| Amplitude telemetry | Privacy/opt-in concerns; out of scope |
| Settings webview (HTML/CSS/JS in extension) | VS Code UI only |
| Walkthrough .md files | VS Code onboarding only |
| vscode.git extension integration | CLI uses raw git CLI |
| CommitLintService as separate class with external engine option | CLI: builtin only or skip |
| Full DI container | Overkill for CLI; direct imports fine |

## What TO Adopt from VS Code v3

| Pattern | CLI Adaptation |
|---------|----------------|
| Provider protocol | Replace ModelService base with interface + registry |
| CommitWorkflow orchestrator | Centralize generate + commit logic |
| AbortSignal propagation | All async ops take optional signal |
| Project config file (.commit-sage/config.json) | Mirror .commitsage/ but CLI-friendly |
| COMPAT_SPECS for OpenAI-compatible | Spec registry for local LLMs |
| Recent commits as style examples | GitService.getRecentCommitMessages() -> PromptService |
| Custom instructions + custom format | Config-driven + template files |
| Builtin commitlint rule sets | Port @commitlint/config-conventional/angular rules |
| Token-budgeted blame | Summarize by author/file if > threshold |
| Lenient config parser | Drop invalid keys with warning, not error |

## Migration Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Provider protocol replacing ModelService | Medium — touches all 11 providers | Implement alongside, swap per-provider |
| CommitWorkflow centralization | Low — new code, old paths deprecated | Keep AiService.generateMessage as thin wrapper |
| Project config file watcher | Medium — Deno watchFs stability | Poll fallback (5s interval) for Deno < 1.40 |
| Commitlint builtin engine | Medium — rule set port accuracy | Test against commitlint CLI on fixtures |
| OpenRouter device code flow | Low — standard OAuth | Use existing ConfigService.promptForApiKey pattern |

## Conclusion

The CLI architecture is sound but incomplete. VS Code v3 demonstrates patterns that scale:
- Protocol-based providers > base class inheritance
- Workflow orchestrator > inline logic
- Project config > global-only config
- Token-aware context building > unbounded prompt growth

Recommendation: Hybrid evolution. Keep lib-result, Cliffy, Vercel AI SDK. Adopt protocol, workflow, project config, spec registry. Defer DI container, telemetry, webview.

This document informs roadmap.md phasing.