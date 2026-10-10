import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";

function createMoonshotModel(ctx: ProviderRunContext) {
  return createOpenAI({
    apiKey: ctx.apiKey,
    baseURL: ctx.baseUrl ?? MOONSHOT_BASE_URL,
  }).chat(ctx.modelId);
}

const moonshotaiAdapter = defineProvider({
  name: "moonshotai",
  createModel: createMoonshotModel,
});

registerAdapter(moonshotaiAdapter);

export { moonshotaiAdapter };
