import type { ProviderType } from "@/lib/types/config.ts";
import { ModelService } from "@/services/model.ts";
import type { ProviderAdapter } from "@/services/providerAdapter.ts";
import { adapterRegistry } from "@/services/providerAdapter.ts";
import "@/services/providers/anthropic.ts";
import "@/services/providers/deepseek.ts";
import "@/services/providers/gemini.ts";
import "@/services/providers/minimax.ts";
import "@/services/providers/mistral.ts";
import "@/services/providers/moonshot.ts";
import "@/services/providers/ollama.ts";
import "@/services/providers/openai.ts";
import "@/services/providers/openrouter.ts";
import "@/services/providers/xai.ts";
import "@/services/providers/zai.ts";

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
  gemini: serviceForAdapterName("gemini"),
  openai: serviceForAdapterName("openai"),
  anthropic: serviceForAdapterName("anthropic"),
  deepseek: serviceForAdapterName("deepseek"),
  mistral: serviceForAdapterName("mistral"),
  xai: serviceForAdapterName("xai"),
  ollama: serviceForAdapterName("ollama"),
  moonshotai: serviceForAdapterName("moonshotai"),
  zai: serviceForAdapterName("zai"),
  minimax: serviceForAdapterName("minimax"),
  openrouter: serviceForAdapterName("openrouter"),
};

function getProviderService(type: ProviderType): typeof ModelService {
  return providers[type];
}

export { getProviderService };
