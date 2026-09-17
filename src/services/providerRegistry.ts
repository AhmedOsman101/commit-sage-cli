import type { ProviderType } from "@/lib/types/config.ts";
import type { ModelService } from "@/services/model.ts";
import AnthropicService from "@/services/providers/anthropic.ts";
import DeepseekService from "@/services/providers/deepseek.ts";
import GeminiService from "@/services/providers/gemini.ts";
import MinimaxService from "@/services/providers/minimax.ts";
import MistralService from "@/services/providers/mistral.ts";
import MoonshotService from "@/services/providers/moonshot.ts";
import OllamaService from "@/services/providers/ollama.ts";
import OpenAiService from "@/services/providers/openai.ts";
import OpenRouterService from "@/services/providers/openrouter.ts";
import XaiService from "@/services/providers/xai.ts";
import ZaiService from "@/services/providers/zai.ts";

const providers: Record<ProviderType, typeof ModelService> = {
  gemini: GeminiService,
  openai: OpenAiService,
  anthropic: AnthropicService,
  deepseek: DeepseekService,
  mistral: MistralService,
  xai: XaiService,
  ollama: OllamaService,
  moonshotai: MoonshotService,
  zai: ZaiService,
  minimax: MinimaxService,
  openrouter: OpenRouterService,
};

function getProviderService(type: ProviderType): typeof ModelService {
  return providers[type];
}

export { getProviderService };
