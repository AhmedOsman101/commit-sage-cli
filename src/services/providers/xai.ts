import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

const XAI_BASE_URL = "https://api.x.ai/v1";

function createXaiModel(ctx: ProviderRunContext) {
  return createOpenAI({
    apiKey: ctx.apiKey,
    baseURL: ctx.baseUrl ?? XAI_BASE_URL,
  })(ctx.modelId);
}

function xaiProviderOptions(reasoning: string | undefined) {
  if (!reasoning) return;
  return {
    xai: {
      reasoningEffort: reasoning === "medium" ? "high" : reasoning,
    },
  };
}

const xaiAdapter = defineProvider({
  name: "xai",
  createModel: createXaiModel,
  providerOptions: xaiProviderOptions,
});

registerAdapter(xaiAdapter);

export { xaiAdapter };
