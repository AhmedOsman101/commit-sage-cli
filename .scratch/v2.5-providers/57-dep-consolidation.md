## Question

Collapse the OpenAI-wire SDKs onto `createOpenAI`-with-baseUrl inside the adapter literals, per `docs/plans/v2.5-providers.md` phase 3.

## Scope

- Consolidate `deepseek`, `mistral`, `moonshotai`, `xai`, `minimax` (+ `vercel-minimax-ai-provider`), `zai`.
- Keep explicit: `anthropic`, `google`, `ollama-ai-provider-v2`, `openai`, `openrouter` (attribution headers).
- Drop removed imports from `deno.json` + lockfile; `deno check` proves no dangling imports.

## Done when

Generation smoke per consolidated provider (key-gated), `deno check` clean, no behavior change in fixtures.
