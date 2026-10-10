import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

const MINIMAX_BASE_URL = "https://api.minimax.io/v1";

function createMinimaxModel(ctx: ProviderRunContext) {
  return createOpenAI({
    apiKey: ctx.apiKey,
    baseURL: ctx.baseUrl ?? MINIMAX_BASE_URL,
  }).chat(ctx.modelId);
}

const minimaxAdapter = defineProvider({
  name: "minimax",
  createModel: createMinimaxModel,
});

registerAdapter(minimaxAdapter);

export { minimaxAdapter };
