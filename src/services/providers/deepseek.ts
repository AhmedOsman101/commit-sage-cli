import { createDeepSeek } from "@ai-sdk/deepseek";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

function createDeepSeekModel(ctx: ProviderRunContext) {
  return createDeepSeek({ apiKey: ctx.apiKey })(ctx.modelId);
}

const deepseekAdapter = defineProvider({
  name: "deepseek",
  createModel: createDeepSeekModel,
});

registerAdapter(deepseekAdapter);

export { deepseekAdapter };
