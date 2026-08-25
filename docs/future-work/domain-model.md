# Domain Model: Commit Sage CLI

Purpose: Establish ubiquitous language for the CLI domain. Derived from codegraph exploration of CLI, VS Code v2, VS Code v3, and grilling decisions.

## Core Entities

### Repository
- **Identity**: Git repository root path
- **Attributes**: currentBranch, hasStagedChanges, hasUnstagedChanges, hasUntrackedFiles, remotes[], upstreamBranch?
- **Operations**: getDiff(mode), getStatus(), getRecentCommits(count, scope), getBlame(filePath), stageFiles(paths[]), commit(message), push(branch, setUpstream)

### CommitMessage
- **Identity**: Generated message string + metadata
- **Attributes**: subject, body?, footer?, format, language, model, provider, generatedAt, source (ai|offline)
- **Operations**: splitSubjectBody(), truncateSubject(maxLength), validate(rules), renderPreview()

### Diff
- **Identity**: Raw git diff output (staged or unstaged)
- **Attributes**: files[], totalLines, truncated
- **Operations**: parseToFileChanges(), estimateTokens()

### FileChange
- **Attributes**: action (created|modified|deleted|renamed|copied), fromPath, toPath, status (staged|unstaged)
- **Operations**: getConventionalType(), getFriendlyName()

### BlameContext
- **Attributes**: filePath, authorChanges[] (author, linesChanged), summary
- **Operations**: summarizeByAuthor(), estimateTokens(), truncateToBudget(budget)

### RecentCommit
- **Attributes**: message, author, hash, date
- **Filters**: minLength (10), noiseRegex (merge, revert, wip, fixup, squash)
- **Scope**: all | mine (by git user.email)

## Configuration Domain

### GlobalConfig (~/.config/commitSage/config.json)
```typescript
interface GlobalConfig {
  provider: ProviderConfig;
  commit: CommitConfig;
  general: GeneralConfig;
  // per-provider sections
  gemini: GeminiConfig;
  openai: OpenAIConfig;
  // ... all 14 providers
}
```

### ProjectConfig (.commit-sage/config.json)
- Same schema as GlobalConfig
- Overrides global when present
- File watcher for auto-reload
- Migration from legacy .commit-sage file

### ConfigPrecedence
CLI flags > Project config > Global config > Defaults

### ProviderConfig
- type: ProviderType (14 values)
- model: string
- apiKeyEnvVar?: string (OpenAI only)
- reasoning?: "off" | "low" | "medium" | "high"
- thinkingBudget?: number (Gemini)
- thinkingLevel?: "minimal" | "low" | "medium" | "high" (Gemini)

### CommitConfig
- commitFormat: CommitFormat (12 values)
- commitLanguage: CommitLanguage (9 + custom)
- maxSubjectLength: number (default 80)
- bodyStyle: "subject-only" | "subject-body" | "subject-body-footer"
- useCustomInstructions: boolean
- customInstructions: string (deprecated, replaced by template files)
- customTemplate: string (filename in ~/.config/commitSage/templates/)
- useRecentCommitsAsContext: boolean
- recentCommitsCount: number (default 5, max 20)
- recentCommitsScope: "all" | "mine"
- autoCommit: boolean
- autoPush: boolean
- onlyStagedChanges: boolean
- blameTokenBudget: number (default 2000)
- commitlintEnabled: boolean
- commitlintEngine: "builtin" | "external"
- refs: RefConfig

### RefConfig
- enabled: boolean
- source: "prompt" | "branch" | "input"
- placement: "start" | "end" | "footer"
- value: string (for "input" source)
- branchPattern: string (regex, default: "[A-Z][A-Z0-9]*-[0-9]+")

### GeneralConfig
- maxRetries: number (default 3)
- temperature: number (default 0.3)
- timeoutMs: number (default 30000)
- diffStrategy: "staged" | "unstaged" | "auto"

### OpenAICompatibleConfig
- spec: "lmstudio" | "vllm" | "llamacpp" | "ollama-openai" | "custom"
- baseUrl: string
- model: string
- apiKey: string

## Provider Domain

### ProviderType (Union)
gemini | openai | anthropic | deepseek | mistral | xai | ollama | moonshotai | zai | minimax | openrouter | groq | codestral | openai-compatible

### ProviderSpec (for OpenAI-compatible)
- id: string
- name: string
- defaultBaseUrl: string
- defaultModel: string
- modelsEndpoint?: string
- authType: "api-key" | "oauth-pkce" | "none"

### Provider Protocol
```typescript
interface Provider {
  readonly id: ProviderType;
  readonly name: string;
  readonly supportsReasoning: boolean;
  readonly supportsStreaming: boolean;
  generateCommitMessage(prompt: string, options: GenerationOptions): Promise<CommitMessage>;
  validateApiKey(key: string): Promise<ValidationResult>;
}
```

### GenerationOptions
- model: string
- temperature: number
- maxTokens?: number
- reasoning?: ReasoningConfig
- abortSignal?: AbortSignal
- providerOptions?: Record<string, unknown>

### ValidationResult
- valid: boolean
- error?: string

## Format Domain

### CommitFormat (Union)
conventional | angular | karma | semantic | emoji | emojiKarma | google | atom | detailed | previous | freeform | custom

### CommitTemplate
- Per-language template strings
- Variables: {{diff}}, {{blame}}, {{recentCommits}}, {{languagePrompt}}, {{bodyStylePrompt}}, {{maxLength}}, {{context}}

### CustomTemplate (Markdown with Frontmatter)
```markdown
---
name: string
description: string
variables: string[]
---
Template body with {{variable}} placeholders
```

### LanguageSupport
- Built-in: english, russian, chinese, japanese, spanish, german, french, korean, portuguese
- Custom: loaded from template frontmatter or config

### BodyStyle
- subject-only: Single line
- subject-body: Subject + blank line + body
- subject-body-footer: Subject + body + optional footer

## Workflow Domain

### WorkflowOptions
- mode: "generate" | "commit"
- diffMode: "staged" | "unstaged" | "auto"
- offline: boolean
- format?: CommitFormat
- language?: CommitLanguage
- maxLength?: number
- context?: string
- provider?: ProviderType
- model?: string
- template?: string (custom template name)
- edit: boolean
- push?: string | boolean
- yes: boolean (skip confirm)
- commitlint?: boolean
- recentCommits?: boolean
- recentCount?: number
- recentScope?: "all" | "mine"

### CommitResult
- message: CommitMessage
- committed: boolean
- pushed: boolean
- pushedBranch?: string
- validationPassed: boolean
- validationErrors?: string[]

### Workflow Steps (CommitWorkflow.execute)
1. resolveDiffMode(options, config)
2. getDiff(diffMode) -> Diff
3. getBlameContext(diff.files) -> BlameContext
4. getRecentCommits(config) -> RecentCommit[]
5. buildPrompt(diff, blame, recent, options, config) -> string
6. generateMessage(prompt, options) -> CommitMessage
7. validateMessage(message, config) -> ValidationResult
8. autoFix(message, validationErrors) -> CommitMessage (if enabled)
9. confirmCommit(message) -> boolean (if not autoCommit/yes)
10. gitCommit(message, edit) -> CommitResult
11. gitPush(branch, setUpstream) -> CommitResult (if push)

## Error Domain

### Error Types (all extend Error, used with lib-result)
- ConfigurationError: Invalid config, missing keys, migration failures
- AiServiceError: Provider errors, rate limits, auth failures, timeouts
- GitError: Not a repo, no changes, commit failed, push failed
- ValidationError: Commitlint failures, schema violations
- TemplateError: Custom template not found, parse errors, missing variables
- ProjectConfigError: .commit-sage/config.json parse, watcher failures
- AuthenticationError: OpenRouter PKCE, device code flow failures

### Result Pattern
All fallible operations return `Result<T, Error>` from lib-result.
- Ok(value) for success
- Err(error) for failure
- No exceptions cross service boundaries
- Callers must handle both cases

## Service Interfaces

### GitService
- isGitRepo(): boolean
- initialize(): Promise<Result<string, Error>> (returns repo root)
- getRepoRoot(): string
- hasChanges(mode: "staged" | "unstaged"): Promise<boolean>
- getDiff(mode: "staged" | "unstaged"): Promise<Result<string, Error>>
- getStatus(): Promise<Result<FileStatus[], Error>>
- getRecentCommitMessages(count: number, scope: "all" | "mine"): Promise<string[]>
- getBlame(filePath: string, useStaged: boolean): Promise<string>
- stageFiles(paths: string[]): Promise<Result<void, Error>>
- commit(message: string, edit: boolean): Promise<Result<void, Error>>
- push(branch: string, options: { setUpstream: boolean }): Promise<Result<void, Error>>
- currentBranch(): Promise<string | null>
- hasAnyRemote(): Promise<boolean>
- hasOriginRemote(): Promise<boolean>
- hasUpstream(branch: string): Promise<boolean>

### ConfigService
- load(): Promise<Result<Config, Error>>
- get<T>(section: string, key: string): Promise<Result<T, Error>>
- set(section: string, key: string, value: unknown): Promise<Result<boolean, Error>>
- getApiKey(service: string): Promise<string>
- validateApiKey(service: string, key: string): void
- promptForApiKey(service: string): Promise<string>
- migrateConfig(config: Config): Result<boolean>

### ProjectConfigService
- load(repoPath: string): Promise<ProjectConfig>
- watch(repoPath: string): Promise<void>
- isOverridden(key: string): boolean
- get<T>(section: string, key: string): T | undefined
- clearCache(): void

### PromptService
- buildPrompt(diff: string, blame: string, options: PromptOptions): Promise<Result<string, Error>>
- getLanguagePrompt(language: CommitLanguage): string
- getBodyStylePrompt(style: BodyStyle): string
- getTemplate(format: CommitFormat, language: CommitLanguage): string

### AiService
- generateMessage(options: WorkflowOptions): Promise<Result<CommitMessage, Error>>

### OfflineGenerator
- generateOfflineMessage(changes: FileChange[], options: OfflineOptions): string
- parseDiffIndex(output: string): FileChange[]

### CommitLintService
- validate(message: string, repoPath: string): Promise<ValidationResult>
- autoFix(message: string, repoPath: string): Promise<string>
- loadConfig(repoPath: string): Promise<CommitLintRules>

### ProviderRegistry
- get(providerType: ProviderType): Provider
- register(provider: Provider): void
- getSpec(specId: string): ProviderSpec | undefined
- list(): ProviderType[]

### TemplateLoader
- loadCustomTemplate(name: string): Promise<CustomTemplate>
- listTemplates(): string[]
- render(template: CustomTemplate, variables: Record<string, string>): string

## Events (for future telemetry/extension points)

- generation.started { diffSize, fileCount, provider, model }
- generation.completed { provider, model, durationMs, language, format }
- generation.failed { provider, model, error, errorType }
- commit.completed { hasStaged, hasUntracked, hasDeleted, messageLength }
- commit.failed { error, errorType }
- push.completed { branch }
- push.failed { error, errorType }
- config.changed { key }
- project-config.loaded { path }
- auth.openrouter.started
- auth.openrouter.completed

## Glossary

| Term | Definition |
|------|------------|
| Conventional Commits | Specification for structured commit messages (type, scope, subject, body, footer) |
| Offline Generator | Static analysis fallback that produces conventional-style messages without AI |
| Spec Registry | Configuration-driven list of known OpenAI-compatible endpoints (LM Studio, vLLM, etc.) |
| Project Config | Per-repository configuration file (.commit-sage/config.json) that overrides global config |
| Custom Template | User-defined markdown template with frontmatter for commit message generation |
| Previous Format | Format that instructs AI to mimic repository's recent commit style |
| Blame Context | Git blame analysis correlated with changed lines to provide authorship context |
| Token Budget | Maximum estimated tokens allocated for blame/context sections in prompt |
| Device Code Flow | OAuth 2.0 flow for devices without browser (user visits URL, enters code) |
| PKCE | Proof Key for Code Exchange — OAuth 2.0 extension for public clients |

## Invariants

1. Config precedence: CLI flags > Project config > Global config > Defaults
2. Offline generator always produces conventional-shape output
3. Custom format requires customTemplate to be set
4. Previous format requires useRecentCommitsAsContext=true
5. Commitlint validation only runs when commitlintEnabled=true
6. Auto-push requires auto-commit (enforced by SettingsValidator pattern)
7. Refs prompt source cannot be used with auto-commit (would interrupt flow)
8. All provider implementations must implement Provider protocol
9. All async operations accept optional AbortSignal
10. All fallible operations return Result<T, Error>