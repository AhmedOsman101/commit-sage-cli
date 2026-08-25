# Format Catalog: Complete Inventory Across All Codebases

Goal: Document all commit formats. CLI target: 12 formats (6 current + 5 from VS Code v3 + custom).
Priority: Trivial ports first (grilling: "mostly cheap operations").

## Current CLI Formats (6)

Defined in src/lib/types/commit.ts:
```typescript
const COMMIT_FORMATS = [
  "conventional",
  "angular",
  "karma",
  "emoji",
  "semantic",
  "freeform",  // CLI-only: AI-only, no constraints
] as const;
```

Each format has a template per language in src/templates/formats/*.ts.

| Format | Template File | Type Prefixes | Scope | Body | Footer | Notes |
|--------|---------------|---------------|-------|------|--------|-------|
| conventional | conventional.ts | 11 types | Yes | Yes | Yes | Standard Conventional Commits |
| angular | angular.ts | 8 types | Yes | Yes | Yes | AngularJS convention |
| karma | karma.ts | 7 types | Yes | Yes | Yes | Karma runner convention |
| emoji | emoji.ts | 11 types (emoji) | Yes | Yes | Yes | Gitmoji-style |
| semantic | semantic.ts | 7 types | Yes | Yes | Yes | Semantic Release compatible |
| freeform | freeform.ts | None | No | Yes | No | "Generate a commit message" — no structure |

Language support: english, russian, chinese, japanese (4 languages)

## VS Code v2.2.13 Formats (6)

Same 6 as CLI except:
- No freeform (VS Code v2 predates it)
- Has emojiKarma (CLI missing)
- Languages: english, russian, chinese, japanese, spanish (5 languages)

## VS Code v3.3.2 Formats (11)

Defined in src/templates/index.ts:
```typescript
export type CommitFormat = 'conventional' | 'angular' | 'karma' | 'semantic'
  | 'emoji' | 'emojiKarma' | 'google' | 'atom' | 'detailed' | 'previous';
```

Plus custom format (handled separately, gated by useCustomInstructions).

| Format | Template File | Type Prefixes | Scope | Body | Footer | Special |
|--------|---------------|---------------|-------|------|--------|---------|
| conventional | conventional.ts | 11 | Yes | Yes | Yes | |
| angular | angular.ts | 8 | Yes | Yes | Yes | |
| karma | karma.ts | 7 | Yes | Yes | Yes | |
| semantic | semantic.ts | 7 | Yes | Yes | Yes | |
| emoji | emoji.ts | 11 (emoji) | Yes | Yes | Yes | |
| emojiKarma | emojiKarma.ts | 7 (emoji) | Yes | Yes | Yes | Missing in CLI |
| google | google.ts | 8 | Yes | Yes | Yes | Missing in CLI |
| atom | atom.ts | 7 | Yes | Yes | Yes | Missing in CLI |
| detailed | detailed.ts | 12 | Yes | Yes | Yes | Missing in CLI |
| previous | previous.ts | None | No | Yes | No | Missing in CLI — mimics recent commits |
| custom | N/A (dynamic) | User-defined | User-defined | User-defined | User-defined | Missing in CLI — uses customInstructions |

Language support: english, russian, chinese, japanese, spanish, german, french, korean, portuguese, custom (10 + custom)

## Missing Formats to Add to CLI (5 + custom)

### 1. emojiKarma (Trivial Port)
- Source: VS Code src/templates/formats/emojiKarma.ts
- Concept: Karma type list + emoji prefixes
- Types: :sparkles: feat, :bug: fix, :memo: docs, :lipstick: style, :recycle: refactor, :zap: perf, :white_check_mark: test
- Effort: Copy template, add translations for 4 CLI languages (+ spanish if adding)

### 2. google (Trivial Port)
- Source: VS Code src/templates/formats/google.ts
- Concept: Google's conventional variant
- Types: feat, fix, docs, style, refactor, test, chore, build
- Diff from conventional: No ci, revert, perf; adds build
- Effort: Copy template, add translations

### 3. atom (Trivial Port)
- Source: VS Code src/templates/formats/atom.ts
- Concept: Minimal "type(scope): subject" — Atom editor convention
- Types: feat, fix, docs, style, refactor, test, chore
- Effort: Copy template, add translations

### 4. detailed (Trivial Port)
- Source: VS Code src/templates/formats/detailed.ts
- Concept: Verbose structured template with all sections
- Types: 12 types including security, deps, config, wip
- Effort: Copy template, add translations

### 5. previous (Depends on Recent Commits Feature)
- Source: VS Code src/templates/formats/previous.ts
- Concept: No fixed template — instruction: "Generate a commit message that matches the style, tone, structure, and conventions of this repository's recent commit messages shown below. Infer the format from those examples."
- Dependencies:
  - GitService.getRecentCommitMessages(repoPath, count, scope) — Priority #2
  - PromptService injects recent commits after template
  - MIN_EXAMPLE_COMMIT_LENGTH = 10 filter
  - Noise regex filter (merge commits, reverts, etc.)
- Effort: Medium — requires recent commits feature first

### 6. custom (Depends on Custom Instructions + Template Files)
- VS Code approach: Single customInstructions string, useCustomInstructions boolean, custom format = "use instructions verbatim"
- CLI approach (grilling decision): Custom template files in ~/.config/commitSage/templates/*.md

Design:
```
~/.config/commitSage/
├── config.json
└── templates/
    ├── my-format.md          # Custom format template
    ├── team-conventional.md  # Team-specific conventional variant
    └── release.md            # Release commit template
```

Template format: Markdown with frontmatter
```markdown
---
name: "My Format"
description: "Team convention with ticket refs"
variables: ["ticket", "type", "scope", "subject", "body"]
---
You are an expert commit message generator.

Format: {{type}}({{scope}}): {{subject}} [#{{ticket}}]

{{body}}

Rules:
- Ticket reference required in footer
- Type must be one: feat, fix, docs, chore, refactor
```

Config:
```json
"commit": {
  "customTemplate": "my-format",  // filename without .md
  "commitFormat": "custom"
}
```

Effort: Medium — template loader, frontmatter parser, variable substitution

## Language Support Gap

| Language | CLI | VS Code v2 | VS Code v3 | Action |
|----------|-----|------------|------------|--------|
| english | Yes | Yes | Yes | |
| russian | Yes | Yes | Yes | |
| chinese | Yes | Yes | Yes | |
| japanese | Yes | Yes | Yes | |
| spanish | No | Yes | Yes | Add translations for all 11 formats |
| german | No | No | Yes | Add translations |
| french | No | No | Yes | Add translations |
| korean | No | No | Yes | Add translations |
| portuguese | No | No | Yes | Add translations |
| custom | No | No | Yes | Custom template files (grilling) |

Translation Effort: 5 languages x 11 formats = 55 template translations. Can start with English-only for new formats, add translations incrementally.

## Format Template Structure (Current CLI)

```typescript
// src/templates/formats/conventional.ts
export const conventionalTemplate: CommitTemplate = {
  english: `...`,
  russian: `...`,
  chinese: `...`,
  japanese: `...`,
};

export type CommitTemplate = Record<CommitLanguage, string>;
```

PromptService.buildPrompt (from src/services/prompt.ts):
1. Resolves format/language/length from config or flags
2. Gets template via getTemplate(format, language)
3. Gets language prompt: "Please write the commit message in English."
4. Gets body style prompt: "Return subject + blank line + body" / "subject only" / "subject + body + footer"
5. Injects context section if provided
6. Combines: Rules + Template + Language + BodyStyle + Context + Diff + Blame

## Format Behavior Differences

| Format | AI Prompt Style | Offline Generator | Commitlint Support |
|--------|-----------------|-------------------|-------------------|
| conventional | Structured template | Yes (native) | @commitlint/config-conventional |
| angular | Structured template | No (falls back to conventional) | @commitlint/config-angular |
| karma | Structured template | No | Custom rules |
| semantic | Structured template | No | Semantic Release rules |
| emoji | Emoji prefixes | No | Custom rules |
| emojiKarma | Emoji + karma types | No | Custom rules |
| google | Google variant | No | Custom rules |
| atom | Minimal | No | Custom rules |
| detailed | Verbose | No | Custom rules |
| previous | Mimic examples | No | No (no fixed format) |
| freeform | No constraints | No | No |
| custom | User template | No | No |

Grilling Decision: Offline generator stays conventional-only (Priority 0 for multi-format offline).

## Format Configuration

### Current CLI
```json
"commit": {
  "commitFormat": "conventional",
  "commitLanguage": "english",
  "maxSubjectLength": 80,
  "bodyStyle": "subject-body"
}
```

### VS Code v3 (Extended)
```json
"commit": {
  "commitFormat": "conventional",
  "commitLanguage": "english",
  "maxSubjectLength": 80,
  "bodyStyle": "subject-body",
  "useCustomInstructions": false,
  "customInstructions": "",
  "useRecentCommitsAsContext": false,
  "recentCommitsCount": 5,
  "recentCommitsScope": "all",
  "commitlintEnabled": true,
  "commitlintEngine": "builtin"
}
```

### Target CLI (Extended)
```json
"commit": {
  "commitFormat": "conventional",
  "commitLanguage": "english",
  "maxSubjectLength": 80,
  "bodyStyle": "subject-body",
  "customTemplate": "",           // NEW: filename in ~/.config/commitSage/templates/
  "useRecentCommitsAsContext": false,  // NEW
  "recentCommitsCount": 5,        // NEW
  "recentCommitsScope": "all",    // NEW: all|mine
  "commitlintEnabled": false      // NEW: maybe
}
```

## Implementation Checklist

### Trivial Ports (Week 1)
- [ ] Add emojiKarma.ts template (copy from VS Code, translate to 4 languages)
- [ ] Add google.ts template
- [ ] Add atom.ts template
- [ ] Add detailed.ts template
- [ ] Register all 4 in src/templates/index.ts
- [ ] Add to COMMIT_FORMATS in src/lib/types/commit.ts
- [ ] Add to config.schema.json enum
- [ ] Update --format flag help in commit.ts / generate.ts

### Language Additions (Week 1-2)
- [ ] Add spanish, german, french, korean, portuguese to SUPPORTED_LANGUAGES
- [ ] Translate all 11 format templates (55 translations) — can phase
- [ ] Add custom language support (load from template file frontmatter)

### Previous Format (Week 2-3, depends on recent commits)
- [ ] Implement GitService.getRecentCommitMessages(count, scope)
- [ ] Add MIN_EXAMPLE_COMMIT_LENGTH = 10 constant
- [ ] Add noise filter regex (RECENT_COMMIT_NOISE)
- [ ] Add previous.ts template (instruction-only)
- [ ] Modify PromptService.buildPrompt to inject recent commits when format=previous or useRecentCommitsAsContext=true
- [ ] Add config keys + CLI flags

### Custom Format + Template Files (Week 3-4)
- [ ] Create ~/.config/commitSage/templates/ directory on first run
- [ ] Implement template loader (frontmatter + markdown body)
- [ ] Add variable substitution ({{type}}, {{scope}}, {{subject}}, {{body}}, {{ticket}}, custom)
- [ ] Add customTemplate config key
- [ ] Add custom to COMMIT_FORMATS
- [ ] Modify PromptService.buildPrompt to load custom template when format=custom
- [ ] CLI flag --template <name> for ad-hoc override

## Template Variable Reference (for Custom Templates)

| Variable | Description | Source |
|----------|-------------|--------|
| {{diff}} | Git diff (staged or unstaged) | GitService |
| {{blame}} | Git blame analysis | GitBlameAnalyzer |
| {{recentCommits}} | Formatted recent commit messages | GitService.getRecentCommitMessages |
| {{languagePrompt}} | "Write in English/Russian/..." | PromptService |
| {{bodyStylePrompt}} | Body structure instruction | PromptService |
| {{maxLength}} | Max subject length | Config/flag |
| {{context}} | User-provided --context | CLI flag |
| {{customInstructions}} | User's custom instructions | Config/custom template |

See roadmap.md for phasing. See feature-gap.md for priority ranking.