import { createMoonshotAI } from "@ai-sdk/moonshotai";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import type { CommitMessage } from "@/lib/index.d.ts";
import { logDebug } from "@/lib/logger.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

const timestamp = () =>
  new Date().toISOString().replace("T", "@").substring(0, 22);

class MoonshotService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    logDebug(
      `[${timestamp()}] [moonshotService.generateCommitMessage] ENTRY attempt=${attempt}, prompt.length=${prompt.length}`
    );
    try {
      const apiKey = await ConfigService.getApiKey("MoonshotAI");
      const model = (await ConfigService.get("provider", "model")).unwrap();
      const maxRetries = await ModelService.getMaxRetries();

      logDebug(
        `[${timestamp()}] [moonshotService.generateCommitMessage] CALL API model=${model}, maxRetries=${maxRetries}`
      );

      const client = createMoonshotAI({ apiKey });

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
        `[${timestamp()}] [moonshotService.generateCommitMessage] EXIT message="${text.substring(0, 50)}..."`
      );
      return { message: text, model };
    } catch (error) {
      logDebug(
        `[${timestamp()}] [moonshotService.generateCommitMessage] ERROR ${error}`
      );
      return await MoonshotService.handleGenerationError(
        error,
        prompt,
        attempt,
        MoonshotService.generateCommitMessage.bind(MoonshotService)
      );
    }
  }
}

export default MoonshotService;
