import { createOpenAI } from "@ai-sdk/openai";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import { Log } from "@/lib/logger.ts";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { ModelService } from "@/services/model.ts";

const ZAI_BASE_URL = "https://api.z.ai/api/paas/v4/";

/**
 * Z.AI Service — GLM models via the international Z.AI platform (Zhipu AI).
 * Uses @ai-sdk/openai with a custom baseURL (no new package dependency).
 * The trailing slash on ZAI_BASE_URL is required per Z.AI documentation.
 * Register at https://z.ai and set ZAI_API_KEY.
 */
class ZaiService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1,
    modelOverride?: string
  ): Promise<CommitMessage> {
    Log.debug(
      `[zaiService.generateCommitMessage] ENTRY attempt=${attempt}, prompt.length=${prompt.length}`
    );
    try {
      const apiKey = await ConfigService.getApiKey("Zai");
      const model = await ModelService.resolveModel(modelOverride);
      const generationOptions = await ModelService.getGenerationOptions();
      const providerOptions = await ModelService.getOpenAIProviderOptions({
        forceReasoning: true,
      });
      Log.debug(
        `[zaiService.generateCommitMessage] CALL API model=${model}, baseURL=${ZAI_BASE_URL}`
      );

      const client = createOpenAI({ baseURL: ZAI_BASE_URL, apiKey });

      const wrappedModel = wrapLanguageModel({
        model: client(model),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });

      const { text } = await generateText({
        model: wrappedModel,
        prompt,
        ...generationOptions,
        providerOptions,
      });

      Log.debug(
        `[zaiService.generateCommitMessage] EXIT message="${text.substring(0, 50)}..."`
      );
      return { message: text, model };
    } catch (error) {
      Log.debug(`[zaiService.generateCommitMessage] ERROR ${error}`);
      return await ZaiService.handleGenerationError(
        error,
        prompt,
        attempt,
        (p: string, a: number) =>
          ZaiService.generateCommitMessage(p, a, modelOverride)
      );
    }
  }
}

export default ZaiService;
