# Commit Sage — Agent Guide

CLI that generates git commit messages with AI. Bun + TypeScript, Biome for format/lint.

## Tasks

Run everything through **mask** (`maskfile.md`), not `bun run <task>`:

```bash
mask lint                    # biome check
mask format                  # biome check --fix (+ --unsafe for unsafe fixes)
mask typecheck               # bun check
mask run                     # bun run src/main.ts
mask compile [path]          # binary -> ~/.local/bin/commit-sage
mask compile dev             # -> ~/scripts/bin/commit-sage
mask release                 # cross-compile all platforms to bin/
mask release pr              # release-please release-pr
mask release gh              # release-please github-release (--force for manual tag+release)
```

Biome runs via `biome` CLI or `pnpm dlx`/`bunx`/`npx` (v2.5.6). Format before committing.

## Layout

```
src/main.ts              # entry
src/lib/                 # logger, errors, constants, types
src/services/            # one service per concern (gitService, configService, per-provider AI services)
src/templates/formats/   # commit format templates (conventional, emoji, ...)
```

## Conventions

- Relative imports need `.ts` extension; use `@/` alias for `src/` (`@/lib/logger.ts`).
- `import type` for type-only imports; `node:` prefix for Node builtins.
- Failures use the `Result` pattern from `lib-result` (`Ok`/`Err`); custom errors extend `Error` in `src/lib/errors.ts`.
- Services use static methods, default export.
- Exports: Consolidate all named exports (`export { ... }`) and type exports (`export type { ... }`) at the very end of the file; strictly avoid using inline `export` keywords during variable, function, or type declaration.
- Logging via `@/lib/logger.ts` — `throw Log.error().exit()` exits 1.
- Git: Conventional Commits (`feat:`, `fix:`, ...).

## Skills

Agent skills live at `~/.agents/skills` (tooling: `mask`, `lib-result`; workflow: `conventional-commits`, `systematic-debugging`, `using-git-worktrees`, ...). Use `find-skills` to locate relevant ones.

## Runtime

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

### APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
