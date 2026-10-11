import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

const MISTRAL_BASE_URL = "https://api.mistral.ai/v1";

function createMistralModel(ctx: ProviderRunContext) {
  return createOpenAI({
    apiKey: ctx.apiKey,
    baseURL: ctx.baseUrl ?? MISTRAL_BASE_URL,
  }).chat(ctx.modelId);
}

const mistralAdapter = defineProvider({
  name: "mistral",
  createModel: createMistralModel,
});

registerAdapter(mistralAdapter);

export { mistralAdapter };
