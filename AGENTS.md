# Commit Sage — Agent Guide

CLI that generates git commit messages with AI. Deno + TypeScript, Biome for format/lint.

## Tasks

Run everything through **mask** (`maskfile.md`), not `deno task`:

```bash
mask lint                    # biome check
mask format                  # biome check --fix (+ --unsafe for unsafe fixes)
mask typecheck               # deno check
mask run                     # deno run -A src/main.ts
mask compile [path]          # binary → ~/.local/bin/commit-sage
mask compile dev             # → ~/scripts/bin/commit-sage
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
- Logging via `@/lib/logger.ts` — `logError()` exits 1.
- AI providers plug in via `providerRegistry.ts` using `ai` SDK providers.
- Git: Conventional Commits (`feat:`, `fix:`, ...).

## Skills

Agent skills live at `~/.agents/skills` (tooling: `mask`, `lib-result`; workflow: `conventional-commits`, `systematic-debugging`, `using-git-worktrees`, ...). Use `find-skills` to locate relevant ones.
