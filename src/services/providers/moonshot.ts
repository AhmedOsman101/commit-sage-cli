import { createMoonshotAI } from "@ai-sdk/moonshotai";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

function createMoonshotModel(ctx: ProviderRunContext) {
  return createMoonshotAI({ apiKey: ctx.apiKey })(ctx.modelId);
}

const moonshotaiAdapter = defineProvider({
  name: "moonshotai",
  createModel: createMoonshotModel,
});

registerAdapter(moonshotaiAdapter);

export { moonshotaiAdapter };
