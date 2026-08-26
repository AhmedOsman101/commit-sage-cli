## Question

Wire the tokenizer and finish the `generation` renames that T1 stubbed: spike a small tokenizer (`js-tiktoken` or `gpt-tokenizer` — pick the smallest that works with `deno compile` and covers `openai`/`anthropic`/`9router` families), create `src/lib/tokenCounter.ts` (`countTokens` + `truncateToTokens`), and complete `general→generation` (`initialRetryDelayMs→retryDelay`, `maxInputChars→maxPromptTokens` token-counted), `commit.maxSubjectLength→commit.maxLength` wiring, and remove `timeoutMs` from `generation` (keep only in `providers.defaults`).

**Vertical slice complete when:**
- `src/lib/tokenCounter.ts` exists, `countTokens("hello world")` is token-counted (not char-counted), no WASM bloat in `deno compile`
- `PromptService` / `generate` truncation uses `truncateToTokens(diff, generation.maxPromptTokens)` instead of `maxInputChars` slice
- `generation: { maxRetries, retryDelay, temperature, maxPromptTokens, diffStrategy }` is the only `generation` shape; `providers.defaults.timeoutMs` is the only `timeoutMs` (no duplication)
- Migration for `general.initialRetryDelayMs → generation.retryDelay` + `general.maxInputChars → generation.maxPromptTokens` works (token estimate for old char value, or direct rename if value is numeric), batched warning
- `config get generation.maxPromptTokens` + `config set generation.retryDelay 500` + `config get commit.maxLength` all work; old `commit.maxSubjectLength` migrates with warning
- `mask typecheck` + `mask lint` clean

**Depends on:** T1 (core shape). Blocks T3/T4.
