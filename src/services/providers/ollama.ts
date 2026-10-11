import { createOllama } from "ollama-ai-provider-v2";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

function createOllamaModel(ctx: ProviderRunContext) {
  return createOllama({ baseURL: ctx.baseUrl })(ctx.modelId);
}

const ollamaAdapter = defineProvider({
  name: "ollama",
  createModel: createOllamaModel,
});

registerAdapter(ollamaAdapter);

export { ollamaAdapter };
