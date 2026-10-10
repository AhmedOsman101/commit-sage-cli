import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

function createGoogleModel(ctx: ProviderRunContext) {
  return createGoogleGenerativeAI({ apiKey: ctx.apiKey })(ctx.modelId);
}

function googleProviderOptions(reasoning: string | undefined) {
  if (!reasoning) return;
  return {
    google: {
      thinkingConfig: {
        thinkingLevel: reasoning,
      },
    },
  };
}

const geminiAdapter = defineProvider({
  name: "gemini",
  createModel: createGoogleModel,
  providerOptions: googleProviderOptions,
});

registerAdapter(geminiAdapter);

export { geminiAdapter };
