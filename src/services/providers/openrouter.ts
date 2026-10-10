/**
 * OpenRouter adapter — meta-provider routing to hundreds of AI models.
 * Model IDs are provider-prefixed: e.g. "anthropic/claude-opus-4-5" or
 * "openai/gpt-4.1-mini". Config lives in the dedicated 'openrouter' section.
 * Required headers (HTTP-Referer, X-Title) satisfy OpenRouter usage policy.
 * Register at https://openrouter.ai and set OPENROUTER_API_KEY.
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

function createOpenRouterModel(ctx: ProviderRunContext) {
  return createOpenRouter({
    apiKey: ctx.apiKey,
    baseURL: ctx.baseUrl,
    headers: {
      "HTTP-Referer": "https://github.com/AhmedOsman101/commit-sage-cli",
      "X-Title": "Commit Sage",
    },
  })(ctx.modelId);
}

const openrouterAdapter = defineProvider({
  name: "openrouter",
  createModel: createOpenRouterModel,
});

registerAdapter(openrouterAdapter);

export { openrouterAdapter };
