import { createOpenAI } from "@ai-sdk/openai";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import type { CommitMessage } from "@/lib/index.d.ts";
import { logDebug } from "@/lib/logger.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

const ZAI_BASE_URL = "https://api.z.ai/api/paas/v4/";

const timestamp = () =>
  new Date().toISOString().replace("T", "@").substring(0, 22);

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
    logDebug(
      `[${timestamp()}] [zaiService.generateCommitMessage] ENTRY attempt=${attempt}, prompt.length=${prompt.length}`
    );
    try {
      const apiKey = await ConfigService.getApiKey("Zai");
      const model = (await ConfigService.get("provider", "model")).unwrap();
      const maxRetries = await ModelService.getMaxRetries();

      logDebug(
        `[${timestamp()}] [zaiService.generateCommitMessage] CALL API model=${model}, baseURL=${ZAI_BASE_URL}`
      );

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

      logDebug(
        `[${timestamp()}] [zaiService.generateCommitMessage] EXIT message="${text.substring(0, 50)}..."`
      );
      return { message: text, model };
    } catch (error) {
      logDebug(
        `[${timestamp()}] [zaiService.generateCommitMessage] ERROR ${error}`
      );
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
