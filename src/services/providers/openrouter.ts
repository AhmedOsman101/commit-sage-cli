/**
 * OpenRouter Service — meta-provider routing to hundreds of AI models.
 * Model IDs are provider-prefixed: e.g. "anthropic/claude-opus-4-5" or
 * "openai/gpt-4.1-mini". Config lives in the dedicated 'openrouter' section.
 * Required headers (HTTP-Referer, X-Title) satisfy OpenRouter usage policy.
 * Register at https://openrouter.ai and set OPENROUTER_API_KEY.
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import { DEFAULT_CONFIG } from "@/lib/constants.ts";
import { Log } from "@/lib/logger.ts";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { ModelService } from "@/services/model.ts";

class OpenRouterService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1,
    modelOverride?: string
  ): Promise<CommitMessage> {
    Log.debug(
      `[openrouterService.generateCommitMessage] ENTRY attempt=${attempt}, prompt.length=${prompt.length}`
    );
    try {
      // Resolve the active provider from the model string so the matching
      // `providers.<name>` entry supplies apiKey/baseUrl.
      const { provider, modelId, model } =
        await ModelService.resolveProviderAndModel(modelOverride);
      const apiKey =
        (await ConfigService.getProviderApiKey(provider)) ?? undefined;

      const generationOptions = await ModelService.getGenerationOptions(
        provider,
        modelId
      );

      const rawBaseUrl = await ConfigService.resolveProviderValue(
        provider,
        modelId,
        "baseUrl"
      );
      const baseURL = (
        typeof rawBaseUrl === "string" && rawBaseUrl
          ? rawBaseUrl
          : ((
              DEFAULT_CONFIG.providers as unknown as Record<
                string,
                Record<string, string>
              >
            ).openrouter?.baseUrl as string)
      ) as string;
      Log.debug(
        `[openrouterService.generateCommitMessage] CALL API model=${model}, baseURL=${baseURL}`
      );

      const client = createOpenRouter({
        apiKey,
        baseURL,
        headers: {
          "HTTP-Referer": "https://github.com/AhmedOsman101/commit-sage-cli",
          "X-Title": "Commit Sage",
        },
      });

      const wrappedModel = wrapLanguageModel({
        model: client(modelId),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });

      const { text } = await generateText({
        model: wrappedModel,
        prompt,
        ...generationOptions,
      });

      Log.debug(
        `[openrouterService.generateCommitMessage] EXIT message="${text.substring(0, 50)}..."`
      );
      return { message: text, model };
    } catch (error) {
      Log.debug(`[openrouterService.generateCommitMessage] ERROR ${error}`);
      return await OpenRouterService.handleGenerationError(
        error,
        prompt,
        attempt,
        (p: string, a: number) =>
          OpenRouterService.generateCommitMessage(p, a, modelOverride)
      );
    }
  }
}

export default OpenRouterService;
