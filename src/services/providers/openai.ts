import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import {
  defineProvider,
  openAIProviderOptions,
  registerAdapter,
} from "@/services/providerAdapter.ts";

function createOpenAIModel(ctx: ProviderRunContext) {
  const client = createOpenAI({ apiKey: ctx.apiKey, baseURL: ctx.baseUrl });
  return ctx.apiType === "openai-responses"
    ? client(ctx.modelId)
    : client.chat(ctx.modelId);
}

const openaiAdapter = defineProvider({
  name: "openai",
  createModel: createOpenAIModel,
  providerOptions: openAIProviderOptions,
});

registerAdapter(openaiAdapter);

export { openaiAdapter };
