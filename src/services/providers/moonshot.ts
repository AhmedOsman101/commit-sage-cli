import { createMoonshotAI } from "@ai-sdk/moonshotai";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import { Log } from "@/lib/logger.ts";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { ModelService } from "@/services/model.ts";

class MoonshotService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1,
    modelOverride?: string
  ): Promise<CommitMessage> {
    Log.debug(
      `[moonshotService.generateCommitMessage] ENTRY attempt=${attempt}, prompt.length=${prompt.length}`
    );
    try {
      const apiKey = await ConfigService.getApiKey("MoonshotAI");
      const model = await ModelService.resolveModel(modelOverride);
      const generationOptions = await ModelService.getGenerationOptions();
      Log.debug(
        `[moonshotService.generateCommitMessage] CALL API model=${model}`
      );

      const client = createMoonshotAI({ apiKey });

      const wrappedModel = wrapLanguageModel({
        model: client(model),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });

      const { text } = await generateText({
        model: wrappedModel,
        prompt,
        ...generationOptions,
      });

      Log.debug(
        `[moonshotService.generateCommitMessage] EXIT message="${text.substring(0, 50)}..."`
      );
      return { message: text, model };
    } catch (error) {
      Log.debug(`[moonshotService.generateCommitMessage] ERROR ${error}`);
      return await MoonshotService.handleGenerationError(
        error,
        prompt,
        attempt,
        (p: string, a: number) =>
          MoonshotService.generateCommitMessage(p, a, modelOverride)
      );
    }
  }
}

export default MoonshotService;
