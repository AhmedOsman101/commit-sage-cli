# AGENTS.md - Commit Sage Developer Guide

This file provides guidelines for agents working on the Commit Sage codebase.

## Project Overview

Commit Sage is a CLI tool that uses AI to generate git commit messages. It is built with Deno (TypeScript) and uses Biome for formatting/linting.

## Build, Lint, and Test Commands

### Development

```bash
deno task dev    # Run with file watching
deno task run    # Run the application
```

### Formatting and Linting

```bash
deno task format         # Format and fix issues (requires pnpm)
deno task format:check   # Check formatting without fixing
```

### Compilation

```bash
deno task compile        # Compile to binary (~/.local/bin/commit-sage)
deno task compile-dev    # Compile to dev location
deno task compile-linux-x64
deno task compile-linux-arm64
deno task compile-macos-x64
deno task compile-macos-arm64
deno task compile-windows
```

## Code Style Guidelines

### General

- This is a **Deno TypeScript** project (not Node.js)
- Use **Biome** (v2.3.11) for all formatting and linting
- Run `deno task format` before committing

### Formatting Rules

- **Indent:** 2 spaces
- **Line width:** 80 characters
- **Quotes:** Double quotes (`"`) for strings
- **Semicolons:** Always required
- **Trailing commas:** ES5 style
- **Bracket spacing:** Enabled

### Imports

- Use `type` keyword for type-only imports: `import type { ... }`
- Use explicit file extensions in relative imports (`.ts`)
- Use the import alias `@/lib` instead of relative paths `../lib`
- Use `node:` prefix for Node.js built-ins (e.g., `import * as path from "node:path"`)

```typescript
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { CommitMessage } from "@/lib/index.d.ts";
import ConfigService from "./configService.ts";
```

### Naming Conventions

- **Classes/Types:** PascalCase (`GitService`, `ConfigService`)
- **Variables/Functions:** camelCase (`getRepoPath`, `generateCommitMessage`)
- **Constants:** UPPER_SNAKE_CASE for config values (`MAX_DIFF_LENGTH`)
- **Files:** camelCase (`gitService.ts`, `configService.ts`)

### TypeScript Usage

- Avoid `any` when possible
- Use explicit return types for exported functions
- Use `type` for type aliases, interfaces for objects

```typescript
type CommitMessage = {
  message: string;
  model: string;
};

interface MyInterface {
  // ...
}
```

### Error Handling

- Use the **Result** pattern from `lib-result` for operations that can fail
- Use `Ok()` and `Err()` helpers
- Create custom error classes extending `Error` in `src/lib/errors.ts`

```typescript
import { Err, Ok, type Result } from "lib-result";

function getRepoPath(): Result<string, NoRepositoriesFoundError> {
  if (!GitService.isGitRepo()) {
    return Err(new NoRepositoriesFoundError());
  }
  return Ok(cmd.ok.stdout);
}
```

### Service Pattern

- Use **static methods** for services (no instantiation needed)
- Export default for service classes
- Base classes should use `abstract` or `protected` methods

```typescript
class GitService {
  static initialize(): string { ... }
  static execGit(args: string[]): Result<CommandOutput, CommandError> { ... }
}
export default GitService;
```

### Logging

- Use the logger functions from `@/lib/logger.ts`
- `logError()` exits with code 1
- `logInfo()`, `logWarning()`, `logSuccess()`, `logDebug()`

```typescript
import { logError, logInfo, logWarning } from "@/lib/logger.ts";
```

### Code Organization

```
src/
├── main.ts              # Entry point
├── lib/                 # Shared utilities
│   ├── errors.ts        # Custom error classes
│   ├── logger.ts        # Logging utilities
│   ├── constants.ts     # Constants
│   └── index.d.ts       # Global type definitions
├── services/            # Service classes
│   ├── aiService.ts
│   ├── gitService.ts
│   ├── configService.ts
│   └── ...
└── templates/           # Commit message templates
    ├── index.ts
    └── formats/
```

### Git Conventions

- Follow [Conventional Commits](https://www.conventionalcommits.org/)
- Use prefixes: `feat/`, `fix/`, `docs/`, `refactor/`, etc.
- Run `deno task format` before committing

### Common Patterns

#### Switch Statements

```typescript
switch (provider) {
  case "openai":
    return await OpenAiService.generateCommitMessage(prompt);
  case "ollama":
    return await OllamaService.generateCommitMessage(prompt);
  default: // gemini
    return await GeminiService.generateCommitMessage(prompt);
}
```

#### Unwrap Results

```typescript
const value = await ConfigService.get("provider", "type").then((result) =>
  result.unwrap(),
);
```

#### Async/Await with Error Handling

```typescript
async function main(): Promise<void> {
  try {
    const response = await AiService.generateAndApplyMessage();
  } catch (error) {
    logError((error as Error).message);
  }
}
```
