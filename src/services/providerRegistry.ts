import type { ProviderType } from "@/lib/configServiceTypes.d.ts";
import AnthropicService from "./anthropicService.ts";
import DeepseekService from "./deepseekService.ts";
import GeminiService from "./geminiService.ts";
import MinimaxService from "./minimaxService.ts";
import MistralService from "./mistralService.ts";
import type { ModelService } from "./modelService.ts";
import MoonshotService from "./moonshotService.ts";
import OllamaService from "./ollamaService.ts";
import OpenAiService from "./openaiService.ts";
import OpenRouterService from "./openrouterService.ts";
import XaiService from "./xaiService.ts";
import ZaiService from "./zaiService.ts";

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

export function getProviderService(type: ProviderType): typeof ModelService {
  return providers[type];
}
