# Phase C — Diff Mode Consolidation

> **Status:** Planned · **Depends on:** nothing (placed after A for reviewable releases) · **Ships:** v2.1.0
> **Roadmap:** [`v2-refactor-roadmap.md`](v2-refactor-roadmap.md) (decision D1)

## Problem

Two config keys decide one thing:

- `generation.diffStrategy`: `"staged" | "unstaged" | "auto"`
- `commit.onlyStagedChanges`: `boolean` (default **true**)

And they're consulted in **two places**:

1. `AiService.resolveDiffMode()` (`src/services/ai.ts:~32`) — `onlyStagedChanges` is read **only inside the `auto` branch**: `auto → onlyStagedChanges || hasStagedChanges ? "staged" : "unstaged"`.
2. `src/cli/commit.ts:158` — reads `onlyStagedChanges` again, independently, for the "nothing staged after picker" early-exit message.

Consequences of the current shape:

- Setting `onlyStagedChanges: false` does nothing unless `diffStrategy` is `auto` — a silent no-op for users on `"staged"`/`"unstaged"`.
- The two keys can contradict (`diffStrategy: "staged"` + `onlyStagedChanges: false`) with no error and no defined winner beyond implementation accident.
- `commit.ts`'s early-exit makes `onlyStagedChanges` a second source of truth that doesn't even agree with `resolveDiffMode`'s usage.

Decision **D1(a)**: delete `onlyStagedChanges`. `diffStrategy` is the single knob:

| `diffStrategy` | Behavior |
|---|---|
| `"staged"` | staged only; error if nothing staged |
| `"unstaged"` | unstaged only |
| `"auto"` | staged if any staged changes exist, else unstaged |

Semantics of `auto` shift slightly: previously `auto` + `onlyStagedChanges: false` fell to `"unstaged"` even when staged changes existed. Under one-knob semantics that config migrates to `"unstaged"` (migration below), so intent is preserved key-for-key.

## Changes

### Types / schema / validation / defaults

- `src/lib/types/config.ts`: remove `onlyStagedChanges` from `CommitConfig`.
- `src/services/configValidation.ts:79`: remove from the zod schema.
- `src/lib/constants.ts`: remove from `DEFAULT_CONFIG.commit`.
- `src/cli/config.ts:31`: remove from `TYPE_MAP`.
- `config.schema.json`: regenerate.
- README + README.es-ES: drop mentions; CHANGELOG: BREAKING note under the next release heading.

### Logic

`src/services/ai.ts` — `resolveDiffMode`:

```typescript
function resolveDiffMode(config: Config, hasStagedChanges: boolean): "staged" | "unstaged" {
  switch (config.generation.diffStrategy) {
    case "staged":   return "staged";
    case "unstaged": return "unstaged";
    case "auto":     return hasStagedChanges ? "staged" : "unstaged";
  }
}
```

`src/cli/commit.ts:158` — the early-exit keys off the **resolved mode**, not a second config read:

```typescript
if (resolvedMode === "staged" && !hasStagedChanges) {
  throw Log.error().message("No staged changes to commit. Stage files or set generation.diffStrategy to \"auto\".");
}
```

`src/cli/handlers/offline.ts` (comments at lines 25, 103 reference the deleted key) — update the resolver usage to the single knob.

### Migration (`ConfigService.migrateConfig`)

```typescript
// one-time, batched warning
if (legacy.onlyStagedChanges === false && config.generation.diffStrategy === "auto") {
  config.generation.diffStrategy = "unstaged";
  changed = true;
}
delete config.commit.onlyStagedChanges;  // always; "true" is the default and "auto" already covers it
```

Warning text (batched with the existing migration report): `"commit.onlyStagedChanges is removed; generation.diffStrategy now fully controls staged/unstaged selection (migrated: auto → unstaged)."` — only shown when a rewrite happened.

## Steps

1. Migration entry in `migrateConfig` (first, so old configs survive the rest of the change landing).
2. Remove the key from types/schema/validation/defaults/`TYPE_MAP`; regenerate `config.schema.json`.
3. Rewrite `resolveDiffMode`; rewire `commit.ts` early-exit to the resolved mode.
4. Update `offline.ts` comments and all doc references (README ×2, CHANGELOG).

## Verification

- Craft a v2.0.0 config containing `commit.onlyStagedChanges: false` + `diffStrategy: "auto"`; run `mask run config list` → migration rewrote to `diffStrategy: "unstaged"`, warning printed, second run silent.
- Scratch repo: `generate` in all three `diffStrategy` modes — staged-only errors clean when nothing staged; auto falls through to unstaged; unstaged ignores staged changes.
- `grep -rn onlyStagedChanges src/ config.schema.json README.md README.es-ES.md` → zero hits.
