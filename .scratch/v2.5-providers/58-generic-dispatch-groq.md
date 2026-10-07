## Question

Ship generic dispatch plus the groq preset as adapter literals, per `docs/plans/v2.5-providers.md` phases 4-5 and ADR 008.

## Scope

- `getAdapter(provider, config)`: known literal wins; unknown name + `baseUrl` dispatches `genericAdapterFor(entry.apiType)`; unknown without `baseUrl` is a `ConfigurationError` naming `providers.<name>.baseUrl`.
- New keys `providers.<name>.headers` (map) and `providers.<name>.useApiKey` (default true; false or local host without key sends no auth header).
- `groq` literal (`createOpenAI` + baseUrl) with `DEFAULT_CONFIG.providers.groq` entry (baseUrl + `$GROQ_API_KEY`), `SUPPORTED_PROVIDERS` entry, registry entry. Default model `openai/gpt-oss-120b`; README also recommends `qwen/qwen3-8b-27b`.

## Done when

Unit tests (unknown+baseUrl resolves, unknown-without fails naming the key, no-auth cases), local stub-gateway integration for `omniroute/<id>`, schema check green.
