import { createMistral } from "@ai-sdk/mistral";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

function createMistralModel(ctx: ProviderRunContext) {
  return createMistral({ apiKey: ctx.apiKey })(ctx.modelId);
}

const mistralAdapter = defineProvider({
  name: "mistral",
  createModel: createMistralModel,
});

registerAdapter(mistralAdapter);

export { mistralAdapter };
