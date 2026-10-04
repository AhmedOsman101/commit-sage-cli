# Phase D — Refs Feature (promptForRefs)

> **Status:** Planned · **Depends on:** nothing (placed last: new feature, largest surface) · **Ships:** v2.2.0
> **Roadmap:** [`v2-refactor-roadmap.md`](v2-refactor-roadmap.md) (decision D2)

## Problem

`commit.promptForRefs` exists in types/schema/validation/defaults and is read by **nothing** — a blind port from the former codebase. Round-1 grilling initially suggested deletion; the user reconsidered: **it's useful, but three prompts to make one commit is too many.** Decision D2: implement it as a real feature, **off by default, opt-in via flag**, with the persistent config key as the power-user switch.

The user also noted the fragile workaround: `commit-sage commit --context "Closes issue #24"` usually gets the model to mention the ref in the body, but "mentions in body" ≠ structured footer, and it depends on the model obeying. First-class refs remove the fragility.

## Design

### Interaction model

Two opt-in paths, both explicit per run:

| Path | Trigger | Behavior |
|------|---------|----------|
| **Explicit values** | `--ref JIRA-123` (repeatable) | No prompt. Refs go straight into the footer. Scriptable. |
| **Interactive prompt** | `--refs` flag, or `commit.promptForRefs: true` in config | One extra prompt: "Issue/ticket refs (comma-separated, empty to skip):" |

Counting prompts: default flow stays at **2** (confirm + edit-if-changed). `--refs` adds exactly **1**, only when asked for. `--ref` adds **0**.

- If both `--ref` and `--refs` are given: `--ref` values win, `--refs` is a no-op (no prompt).
- `generate` accepts `--ref` (for scripting the message text) but never prompts.
- Refs are validated to be non-empty tokens; free-form (no pattern enforcement in v1 — the domain model's `branchPattern` regex idea stays deferred).

### Placement in the message

Refs land in the **footer** of the generated message, appended after generation (not injected into the prompt):

```
feat(auth): add rate limiting to login endpoint

Token bucket per IP with configurable burst.

Refs: JIRA-123, JIRA-456
```

Rationale for post-generation append over prompt injection: (a) deterministic placement regardless of model obedience; (b) the model doesn't spend tokens restating refs; (c) works identically across all 12 formats. The `--context` route remains available for *prose* mention ("Closes #24") — refs and context solve different problems and compose.

Append happens **before** preview/confirm so the user sees and edits the final text.

### Config

```jsonc
"commit": {
  "promptForRefs": false   // existing key, finally read: persistent opt-in for the interactive prompt
}
```

- The key keeps its name and default (`false`) — schema/validation/defaults need **no changes**, only a reader.
- Schema description updated: "Prompt for issue/ticket refs during `commit` (can be overridden per run with `--ref`/`--refs`)."

### CLI

```
commit-sage commit [--ref <id>]... [--refs]
commit-sage generate [--ref <id>]...
```

New flags in `src/cli/commit.ts` + `src/cli/generate.ts` (cliffy), threaded into `WorkflowOptions` as `refs?: string[]` and `promptRefs?: boolean` (the domain model's `WorkflowOptions` gains both).

## Steps

1. `WorkflowOptions` fields; thread from both subcommands' flag parsing.
2. Footer renderer: `appendRefs(message, refs)` — idempotent, no-op on empty array, refuses to duplicate an existing `Refs:` footer (merge instead).
3. Interactive prompt in the commit flow (after message generation, before preview) when `promptRefs || --refs`, skipped when `--ref` values present.
4. Config reader for `commit.promptForRefs` + schema description update.
5. README (both languages): flag docs + example.

## Verification

- `mask run commit --ref JIRA-123 --ref JIRA-456` → footer `Refs: JIRA-123, JIRA-456` visible in preview and in `git log -1`; zero extra prompts.
- `mask run commit --refs` → exactly one extra prompt; empty input appends nothing.
- Config `promptForRefs: true` → prompt appears without flags; `--ref` on top of it → no prompt.
- Default (no flags, key false) → zero extra prompts, no footer.
- All 12 formats: footer append doesn't corrupt any template's existing footer section (spot-check `conventional`, `freeform`, `detailed`).

## Risks

| Risk | Mitigation |
|------|-----------|
| Formats with their own footer section collide with `Refs:` | `appendRefs` merges into an existing footer block rather than blindly appending |
| Users expect refs to influence generation (body prose) | documented: refs are structural footer entries; use `--context` for prose |
| Free-form refs invite typos with no validation | accepted for v1 (per grilling); pattern validation deferred with `branchPattern` |
