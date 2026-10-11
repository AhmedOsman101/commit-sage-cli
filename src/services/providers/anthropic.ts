import { createAnthropic } from "@ai-sdk/anthropic";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import {
  anthropicProviderOptions,
  defineProvider,
  registerAdapter,
} from "@/services/providerAdapter.ts";

function createAnthropicModel(ctx: ProviderRunContext) {
  return createAnthropic({ apiKey: ctx.apiKey })(ctx.modelId);
}

const anthropicAdapter = defineProvider({
  name: "anthropic",
  createModel: createAnthropicModel,
  providerOptions: anthropicProviderOptions,
});

registerAdapter(anthropicAdapter);

export { anthropicAdapter };
