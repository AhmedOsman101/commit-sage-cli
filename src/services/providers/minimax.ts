import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import { createMinimaxOpenAI } from "vercel-minimax-ai-provider";
import { Log } from "@/lib/logger.ts";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { ModelService } from "@/services/model.ts";

class MinimaxService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1,
    modelOverride?: string
  ): Promise<CommitMessage> {
    Log.debug(
      `[minimaxService.generateCommitMessage] ENTRY attempt=${attempt}, prompt.length=${prompt.length}`
    );
    try {
      const { provider, modelId, model } =
        await ModelService.resolveProviderAndModel(modelOverride);
      const apiKey =
        (await ConfigService.getProviderApiKey(provider)) ?? undefined;
      const generationOptions = await ModelService.getGenerationOptions(
        provider,
        modelId
      );
      Log.debug(
        `[minimaxService.generateCommitMessage] CALL API model=${model}`
      );

      const client = createMinimaxOpenAI({ apiKey });

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
        `[minimaxService.generateCommitMessage] EXIT message="${text.substring(0, 50)}..."`
      );
      return { message: text, model };
    } catch (error) {
      Log.debug(`[minimaxService.generateCommitMessage] ERROR ${error}`);
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
