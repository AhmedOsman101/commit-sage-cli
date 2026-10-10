import { createAnthropic } from "@ai-sdk/anthropic";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

function createAnthropicModel(ctx: ProviderRunContext) {
  return createAnthropic({ apiKey: ctx.apiKey })(ctx.modelId);
}

function anthropicProviderOptions(reasoning: string | undefined) {
  if (!reasoning) return;
  return {
    anthropic: {
      thinking: {
        type: "adaptive" as const,
      },
      effort: reasoning,
    },
  };
}

const anthropicAdapter = defineProvider({
  name: "anthropic",
  createModel: createAnthropicModel,
  providerOptions: anthropicProviderOptions,
});

registerAdapter(anthropicAdapter);

export { anthropicAdapter };
