import type { ProviderType } from "@/lib/configServiceTypes.d.ts";
import AnthropicService from "./anthropicService.ts";
import DeepseekService from "./deepseekService.ts";
import GeminiService from "./geminiService.ts";
import MistralService from "./mistralService.ts";
import type { ModelService } from "./modelService.ts";
import OllamaService from "./ollamaService.ts";
import OpenAiService from "./openaiService.ts";
import XaiService from "./xaiService.ts";

const providers: Record<ProviderType, typeof ModelService> = {
  gemini: GeminiService,
  openai: OpenAiService,
  anthropic: AnthropicService,
  deepseek: DeepseekService,
  mistral: MistralService,
  xai: XaiService,
  ollama: OllamaService,
};

export function getProviderService(type: ProviderType): typeof ModelService {
  return providers[type];
}
