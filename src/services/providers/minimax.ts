import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import { createMinimaxOpenAI } from "vercel-minimax-ai-provider";
import { logDebug } from "@/lib/logger.ts";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { ModelService } from "@/services/model.ts";

class MinimaxService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1,
    modelOverride?: string
  ): Promise<CommitMessage> {
    logDebug(
      `[minimaxService.generateCommitMessage] ENTRY attempt=${attempt}, prompt.length=${prompt.length}`
    );
    try {
      const apiKey = await ConfigService.getApiKey("MiniMax");
      const model = await ModelService.resolveModel(modelOverride);
      const generationOptions = await ModelService.getGenerationOptions();
      logDebug(
        `[minimaxService.generateCommitMessage] CALL API model=${model}`
      );

      const client = createMinimaxOpenAI({ apiKey });

      const wrappedModel = wrapLanguageModel({
        model: client(model),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });

      const { text } = await generateText({
        model: wrappedModel,
        prompt,
        ...generationOptions,
      });

      logDebug(
        `[minimaxService.generateCommitMessage] EXIT message="${text.substring(0, 50)}..."`
      );
      return { message: text, model };
    } catch (error) {
      logDebug(`[minimaxService.generateCommitMessage] ERROR ${error}`);
      return await MinimaxService.handleGenerationError(
        error,
        prompt,
        attempt,
        (p: string, a: number) =>
          MinimaxService.generateCommitMessage(p, a, modelOverride)
      );
    }
  }
}

export default MinimaxService;
