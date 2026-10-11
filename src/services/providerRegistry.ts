import { ModelService } from "@/services/model.ts";
import type { ProviderAdapter } from "@/services/providerAdapter.ts";
import { getAdapter } from "@/services/providerAdapter.ts";
import "@/services/providers/anthropic.ts";
import "@/services/providers/deepseek.ts";
import "@/services/providers/gemini.ts";
import "@/services/providers/groq.ts";
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

/**
 * Dispatch shell for a provider name: known literals resolve from the
 * registry, unknown names with `providers.<name>.baseUrl` dispatch a
 * generic gateway adapter, and unknown names without one fail with a
 * `ConfigurationError` naming the missing key (via `getAdapter`).
 */
async function getProviderService(type: string): Promise<typeof ModelService> {
  const adapter = await getAdapter(type);
  return serviceForAdapter(adapter);
}

export { getProviderService };
