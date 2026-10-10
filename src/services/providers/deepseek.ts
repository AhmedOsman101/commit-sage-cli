import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

function createDeepSeekModel(ctx: ProviderRunContext) {
  return createOpenAI({
    apiKey: ctx.apiKey,
    baseURL: ctx.baseUrl ?? DEEPSEEK_BASE_URL,
  }).chat(ctx.modelId);
}

const deepseekAdapter = defineProvider({
  name: "deepseek",
  createModel: createDeepSeekModel,
});

registerAdapter(deepseekAdapter);

export { deepseekAdapter };
