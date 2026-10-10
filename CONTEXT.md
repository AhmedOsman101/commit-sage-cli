# Commit Sage CLI

Terminal CLI that turns a git diff into a commit message, via an AI provider or the offline static-analysis generator.

## Language

**Commit message**:
The text artifact produced for one commit. Has a subject line and an optional body, split per `commit.bodyStyle`.
_Avoid_: message, output

**Previous format**:
A `commit.commitFormat` value that reuses the repo's recent commit messages as style examples instead of a fixed template. Falls back to `conventional` when no usable examples exist.
_Avoid_: last-format, prior format

**Recent commit example**:
A prior commit message used as a style example in the generation prompt. Filtered to drop short or noise messages.

**Token budget**:
The single capped size, in tokens, of everything sent to the model in one prompt.

**File-aware truncation**:
Reducing the diff to fit the token budget by shrinking sections of whole files rather than slicing one long blob. Files with low-value content (lockfiles, generated output) shrink first.

**Reasoning tag**:
Hidden chain-of-thought text some models emit in their response (`<thinking>`, `<think>`, tool-thinking blocks). Stripped before the commit message is used.
_Avoid_: thinking tag, thought

**Offline generator**:
The deterministic, no-network path that builds a conventional-format message from `git diff-index` status rows.

**Provider/model**:
The canonical identity string for an AI backend and model, split on the first `/`. Example: `openai/gpt-5-nano`.
_Avoid_: model string alone

**Refs**:
Issue-tracker identifiers (like `#123` or `PROJ-456`) appended to a commit message outside the subject and body, rendered as a `Refs:` footer line.
_Avoid_: links, tags

**Custom instructions**:
User-written guidance injected into every generation prompt, distinct from the per-run `--context` flag.

**Custom language**:
A `commitLanguage` with no built-in template. Its template comes from an on-demand AI translation, cached in `translations.json` for reuse.
_Avoid_: translated language

**Generic provider**:
A user-named `providers.<name>` entry (like `omniroute`) dispatched at runtime through its `baseUrl` and `apiType`, with no built-in class.
_Avoid_: custom provider

**Project config**:
A repo-local `.commitsage/config.json` that overlays the global config for runs inside that repo. Untrusted repos apply only non-sensitive keys.
_Avoid_: workspace config, local config

**Runtime seam**:
The modules that own every runtime call (`command.ts`, `fileSystem.ts`, `spinner.ts`, `logger.ts`, commit preview, env/args). The rest of `src/` stays runtime-free so the runtime can change without touching callers.
_Avoid_: runtime wrapper, platform layer

**Bun-native-first**:
The policy that seam internals prefer a `Bun.*` API where one exists and use `node:*` only where Bun has none (directory ops, signals, TTY checks). Recorded in ADR 015.
_Avoid_: Bun-only, native-only
