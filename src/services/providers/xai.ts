import { createXai } from "@ai-sdk/xai";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

function createXaiModel(ctx: ProviderRunContext) {
  return createXai({ apiKey: ctx.apiKey })(ctx.modelId);
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
