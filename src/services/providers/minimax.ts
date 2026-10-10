import { createMinimaxOpenAI } from "vercel-minimax-ai-provider";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

function createMinimaxModel(ctx: ProviderRunContext) {
  return createMinimaxOpenAI({ apiKey: ctx.apiKey })(ctx.modelId);
}

const minimaxAdapter = defineProvider({
  name: "minimax",
  createModel: createMinimaxModel,
});

registerAdapter(minimaxAdapter);

export { minimaxAdapter };
