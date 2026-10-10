import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

const OFFICIAL_OPENAI_BASE_URL = "https://api.openai.com/v1";

function createOpenAIModel(ctx: ProviderRunContext) {
  const client = createOpenAI({ apiKey: ctx.apiKey, baseURL: ctx.baseUrl });
  return ctx.apiType === "openai-responses"
    ? client(ctx.modelId)
    : client.chat(ctx.modelId);
}

function openAIProviderOptions(
  reasoning: string | undefined,
  ctx: ProviderRunContext
) {
  if (!reasoning) return;
  return {
    openai: {
      reasoningEffort: reasoning,
      ...(ctx.baseUrl !== OFFICIAL_OPENAI_BASE_URL
        ? { forceReasoning: true }
        : {}),
    },
  };
}

const openaiAdapter = defineProvider({
  name: "openai",
  createModel: createOpenAIModel,
  providerOptions: openAIProviderOptions,
});

registerAdapter(openaiAdapter);

export { openaiAdapter };
