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

### Imports

- Use `node:` prefix for Node.js built-ins (e.g., `import * as path from "node:path"`)
- JSDR imports: `@std/fmt`, `@cliffy/prompt`
- npm imports: `ai`, `axios`, `lib-result`, provider packages
- Group imports: Node.js built-ins first, then external packages, then local imports
- Use `type` keyword for type-only imports: `import type { ... }`

### Classes and Objects

- Use **static classes** for services: `class GitService { static ... }`
- Use **const objects** for simple services: `const CommandService = { ... }`
- Extend base classes when sharing logic: `class GeminiService extends ModelService`
- Use `default export` for services/classes: `export default GitService`

### Types and Interfaces

- Define custom types in `.d.ts` files inside `src/lib/types` directory directory (e.g., `src/lib/index.d.ts`, `configServiceTypes.d.ts`)
- Use Result types from `lib-result`: `Result<T>`, `Ok(value)`, `Err(error)`
- Mark configuration types as `readonly` where appropriate
- Use `as const` for object literals that should be immutable
- Union types for provider/model options: `"gemini" | "openai" | "ollama"`

### Naming Conventions

- **Classes**: PascalCase (`class ConfigService`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_DIFF_LENGTH`, `DEFAULT_CONFIG`)
- **Functions/methods**: camelCase (`generateCommitMessage`, `getRepoPath`)
- **Private/protected**: Use TypeScript `protected` for internal methods
- **Error classes**: PascalCase ending with `Error` (`NoChangesDetectedError`)

### Error Handling

- Extend `Error` class for custom errors: `class FooError extends Error`
- Set error name: `this.name = new.target.name`
- Use `ErrorOptions` parameter for cause: `constructor(msg, options: ErrorOptions = {})`
- Wrap errors with context: Use service-specific errors (e.g., `AiServiceError`, `ConfigurationError`)
- Use Result types for recoverable errors, throw exceptions for unrecoverable
- Log errors using `logError()` from `lib/logger.ts` (terminates program)

### Constants and Configuration

- Define in `src/lib/constants.ts`
- Use `Readonly<T>` type for constants that should never change
- Export as `const` with `Readonly`: `export const OS: Readonly<string> = Deno.build.os`
- Group related constants in objects: `ERROR_MESSAGES`, `GIT_STATUS_CODES`

### Formatting (Biome rules)

- **Indentation**: 2 spaces, spaces only
- **Line width**: 80 characters
- **Quotes**: Double quotes for strings
- **Semicolons**: Always use semicolons
- **Trailing commas**: ES5 style (where applicable)
- **Brackets**: Same line for opening bracket (except control flow)
- **Arrow functions**: Parentheses as needed (`() => {}`, `x => {}`)
- **Template literals**: Use template strings over string concatenation
- **Properties**: Sorted properties enabled
- **Imports**: Auto-organize imports enabled

### Logging

Use the centralized logger from `src/lib/logger.ts`:

- `logError(...)` - Error messages (terminates program)
- `logInfo(...)` - Informational messages (blue)
- `logWarning(...)` - Warning messages (yellow)
- `logSuccess(...)` - Success messages (green)
- `logDebug(...)` - Debug messages (magenta)

### Service Patterns

1. **Static class services** (GitService, ConfigService):
   - Static methods only
   - Static properties for state (e.g., `static repoPath = ""`)
   - Initialize with static methods: `GitService.initialize()`

2. **Object-based services** (CommandService, AiService):
   - Const objects with methods
   - Use for stateless utilities

3. **Inheritance-based services** (GeminiService, OpenAiService):
   - Extend base class (ModelService)
   - Override specific methods
   - Use `static override` keyword

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
