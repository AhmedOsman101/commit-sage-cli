import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import {
  defineProvider,
  openAIProviderOptions,
  registerAdapter,
} from "@/services/providerAdapter.ts";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

function createGroqModel(ctx: ProviderRunContext) {
  return createOpenAI({
    apiKey: ctx.apiKey,
    baseURL: ctx.baseUrl ?? GROQ_BASE_URL,
  }).chat(ctx.modelId);
}

const groqAdapter = defineProvider({
  name: "groq",
  createModel: createGroqModel,
  providerOptions: openAIProviderOptions,
});

registerAdapter(groqAdapter);

export { groqAdapter };
