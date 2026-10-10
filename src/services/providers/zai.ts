import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

const ZAI_BASE_URL = "https://api.z.ai/api/paas/v4/";

/**
 * Z.AI adapter — GLM models via the international Z.AI platform (Zhipu AI).
 * Uses @ai-sdk/openai with a custom baseURL (no new package dependency).
 * The trailing slash on ZAI_BASE_URL is required per Z.AI documentation.
 * Register at https://z.ai and set ZAI_API_KEY.
 */
function createZaiModel(ctx: ProviderRunContext) {
  return createOpenAI({ baseURL: ZAI_BASE_URL, apiKey: ctx.apiKey })(
    ctx.modelId
  );
}

function zaiProviderOptions(reasoning: string | undefined) {
  if (!reasoning) return;
  return {
    openai: {
      reasoningEffort: reasoning,
      forceReasoning: true,
    },
  };
}

const zaiAdapter = defineProvider({
  name: "zai",
  createModel: createZaiModel,
  providerOptions: zaiProviderOptions,
});

registerAdapter(zaiAdapter);

export { zaiAdapter };
