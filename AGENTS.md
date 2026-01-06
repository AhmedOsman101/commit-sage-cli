# AGENTS.md

This file contains guidelines for agentic coding assistants working on this repository.

## Build/Lint/Test Commands

### Available Tasks (deno.json)

- `deno task dev` - Run in watch mode for development
- `deno task run` - Run the CLI tool
- `deno task format` - Format code using Biome (requires pnpm)
- `deno task format:check` - Check code formatting using Biome (requires pnpm)
- `deno task compile` - Compile binary to ~/.local/bin/commit-sage
- `deno task compile-dev` - Compile binary to ~/scripts/bin/commit-sage
- `deno task compile-windows` - Compile for Windows (x64)
- `deno task compile-macos-x64` - Compile for macOS (Intel)
- `deno task compile-macos-arm64` - Compile for macOS (Apple Silicon)
- `deno task compile-linux-x64` - Compile for Linux (x64)
- `deno task compile-linux-arm64` - Compile for Linux (ARM64)

### Before Committing

Run `deno task format` to fix all formatting issues. This uses Biome via `pnpm dlx` since Deno doesn't support devDependencies.

### Testing

This project does not have automated tests. When adding new features, manually verify by running `deno task dev` and testing the functionality.

## Code Style Guidelines

### Project Overview

- **Runtime**: Deno 2.2+ required
- **Language**: TypeScript
- **Linting/Formatting**: Biome 2.3.0
- **Architecture**: Service-oriented with static classes and result types
- **License**: GPL v3.0 - Add copyright header to new files

### File Organization

- `src/main.ts` - Entry point
- `src/lib/` - Shared utilities (constants, errors, logger, types)
- `src/services/` - Business logic services
- `src/templates/` - Commit message templates and formats
- Define types in `.d.ts` files inside `src/lib/` or subdirectories

### Imports

- Use `node:` prefix for Node.js built-ins (e.g., `import * as path from "node:path"`)
- JSDR imports: `@std/fmt`, `@cliffy/prompt`
- npm imports: `ai`, `axios`, `lib-result`, provider packages
- Group imports: Node.js built-ins first, then external packages, then local imports
- Use `type` keyword for type-only imports: `import type { ... }`
- Biome auto-organizes imports on format

### Classes and Objects

- Use **static classes** for services with state: `class GitService { static ... }`
- Use **const objects** for stateless utilities: `const CommandService = { ... }`
- Extend base classes when sharing logic: `class GeminiService extends ModelService`
- Use `default export` for services/classes: `export default GitService`
- Disable `noStaticOnlyClass` lint rule for static services

### Types and Interfaces

- Use Result types from `lib-result`: `Result<T>`, `Ok(value)`, `Err(error)`
- Unwrap Results with `.unwrap()` when you're sure they're valid
- Mark configuration types as `readonly` where appropriate
- Use `as const` for object literals that should be immutable
- Union types for provider/model options: `"gemini" | "openai" | "ollama"`
- Type guards with `is` keyword: `format is CommitFormat`

### Naming Conventions

- **Classes**: PascalCase (`class ConfigService`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_DIFF_LENGTH`, `DEFAULT_CONFIG`)
- **Functions/methods**: camelCase (`generateCommitMessage`, `getRepoPath`)
- **Interfaces/Types**: PascalCase (`CommitMessage`, `CommandOutput`)
- **Private/protected**: Use TypeScript `protected` for internal methods
- **Error classes**: PascalCase ending with `Error` (`NoChangesDetectedError`)

### Error Handling

- Extend `Error` class for custom errors: `class FooError extends Error`
- Set error name: `this.name = new.target.name`
- Use `ErrorOptions` parameter for cause: `constructor(msg, options: ErrorOptions = {})`
- Wrap errors with context: Use service-specific errors (e.g., `AiServiceError`, `ConfigurationError`)
- Use Result types for recoverable errors, throw exceptions for unrecoverable
- Log errors using `logError()` from `lib/logger.ts` (terminates program)
- Log warnings with `logWarning()`, info with `logInfo()`, success with `logSuccess()`

### Constants and Configuration

- Define in `src/lib/constants.ts`
- Use `Readonly<T>` type for constants that should never change
- Export as `const` with `Readonly`: `export const OS: Readonly<string> = Deno.build.os`
- Group related constants in objects: `ERROR_MESSAGES`, `GIT_STATUS_CODES`
- Use `as const` for constant objects to enable type inference

### Formatting (Biome rules)

- **Indentation**: 2 spaces, spaces only
- **Line width**: 80 characters
- **Quotes**: Double quotes for strings
- **Semicolons**: Always use semicolons
- **Trailing commas**: ES5 style
- **Brackets**: Same line for opening bracket (control flow: new line)
- **Arrow functions**: Parentheses as needed (`() => {}`, `x => {}`)
- **Template literals**: Use template strings over string concatenation
- **Properties**: Sorted properties enabled (auto-organized)
- **Imports**: Auto-organize imports enabled
- **Line ending**: LF (not CRLF)

### Async Patterns

- Use `async/await` for asynchronous operations
- Return `Promise<T>` from async methods
- Handle errors with try-catch or Result types
- Use `.then()` for chaining when appropriate (e.g., `ConfigService.get().then(r => r.unwrap())`)

### Template System

- Commit formats in `src/templates/formats/`: conventional, angular, karma, semantic, emoji
- Each format exports a `CommitTemplate` object with language variants
- Get templates with `getTemplate(format, language)` from `src/templates/index.ts`
- Supported languages: english, russian, chinese, japanese
- Fallback to conventional format if invalid, english if invalid language

### Service Patterns

1. **Static class services** (GitService, ConfigService):
   - Static methods only
   - Static properties for state (e.g., `static repoPath = ""`)
   - Initialize with static methods: `GitService.initialize()`

2. **Object-based services** (CommandService, AiService):
   - Const objects with methods
   - Use for stateless utilities

3. **Inheritance-based services** (GeminiService, OpenAiService, OllamaService):
   - Extend base class (ModelService)
   - Override specific methods
   - Use `static override` keyword for overridden methods

### Config Management

- Config stored at `~/.config/commitSage/config.json`
- Use `ConfigService.get(section, key)` to read (returns Result)
- Use `ConfigService.set(section, key, value)` to write (returns Result)
- Config validation via `ConfigValidationService`
- Environment variable fallback for API keys

### Git Operations

- Use `GitService.execGit(args)` for all git commands
- Returns `Result<CommandOutput>` with stdout, stderr, code
- Check error with `.isError()` and get value with `.ok`
- Handle submodules: skip them with `GitService.isSubmodule(file)`
- Use `GitService.getDiff(onlyStaged)` for diff generation
- Initialize GitService before use: `GitService.initialize()`

### License Headers

Add to all new TypeScript files:
```typescript
// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.
```

### Additional Biome Lint Rules

- `useNodejsImportProtocol` - Enforce `node:` prefix for built-ins
- `useAsConstAssertion` - Enforce `as const` for immutable objects
- `useConst` - Prefer `const` over `let`
- `useTemplate` - Use template literals over concatenation
- `useShorthandFunctionType` - Use shorthand function types
- `noTsIgnore` - Disallow `@ts-ignore` comments
- `noImportCycles` - Prevent circular dependencies
