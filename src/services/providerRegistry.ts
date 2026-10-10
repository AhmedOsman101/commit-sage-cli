import type { ProviderType } from "@/lib/types/config.ts";
import { ModelService } from "@/services/model.ts";
import type { ProviderAdapter } from "@/services/providerAdapter.ts";
import { adapterRegistry } from "@/services/providerAdapter.ts";
import AnthropicService from "@/services/providers/anthropic.ts";
import DeepseekService from "@/services/providers/deepseek.ts";
import GeminiService from "@/services/providers/gemini.ts";
import "@/services/providers/minimax.ts";
import MistralService from "@/services/providers/mistral.ts";
import "@/services/providers/moonshot.ts";
import OllamaService from "@/services/providers/ollama.ts";
import OpenAiService from "@/services/providers/openai.ts";
import "@/services/providers/openrouter.ts";
import XaiService from "@/services/providers/xai.ts";
import ZaiService from "@/services/providers/zai.ts";

/**
 * One `ModelService` subclass per adapter, built once and cached. The
 * subclass is only a dispatch shell — every run goes through the shared
 * `ModelService.run()`, so adapter-backed providers stay byte-identical
 * to the classes they replace.
 */
const adapterServices = new Map<string, typeof ModelService>();

function serviceForAdapter(adapter: ProviderAdapter): typeof ModelService {
  const cached = adapterServices.get(adapter.name);
  if (cached) return cached;
  class AdapterService extends ModelService {
    static override generateCommitMessage(
      prompt: string,
      attempt = 1,
      modelOverride?: string
    ) {
      return ModelService.run(adapter, prompt, attempt, modelOverride);
    }
  }
  adapterServices.set(adapter.name, AdapterService);
  return AdapterService;
}

function serviceForAdapterName(name: string): typeof ModelService {
  const adapter = adapterRegistry[name];
  if (!adapter) throw new Error(`No adapter registered for "${name}"`);
  return serviceForAdapter(adapter);
}

const providers: Record<ProviderType, typeof ModelService> = {
  gemini: GeminiService,
  openai: OpenAiService,
  anthropic: AnthropicService,
  deepseek: DeepseekService,
  mistral: MistralService,
  xai: XaiService,
  ollama: OllamaService,
  moonshotai: serviceForAdapterName("moonshotai"),
  zai: ZaiService,
  minimax: serviceForAdapterName("minimax"),
  openrouter: serviceForAdapterName("openrouter"),
};

function getProviderService(type: ProviderType): typeof ModelService {
  return providers[type];
}

export { getProviderService };
