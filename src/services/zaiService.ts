import { createOpenAI } from "@ai-sdk/openai";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import type { CommitMessage } from "@/lib/index.d.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

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
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("Zai");
      const model = (await ConfigService.get("provider", "model")).unwrap();
      const maxRetries = await ModelService.getMaxRetries();

      const client = createOpenAI({ baseURL: ZAI_BASE_URL, apiKey });

      const wrappedModel = wrapLanguageModel({
        model: client(model),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });

      const { text } = await generateText({
        model: wrappedModel,
        prompt,
        temperature: 0.7,
        maxRetries,
      });

      return { message: text, model };
    } catch (error) {
      return await ZaiService.handleGenerationError(
        error,
        prompt,
        attempt,
        ZaiService.generateCommitMessage.bind(ZaiService)
      );
    }
  }
}

export default ZaiService;
