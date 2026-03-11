import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import { createMinimaxOpenAI } from "vercel-minimax-ai-provider";
import type { CommitMessage } from "@/lib/index.d.ts";
import { logDebug } from "@/lib/logger.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

const timestamp = () =>
  new Date().toISOString().replace("T", "@").substring(0, 22);

class MinimaxService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    logDebug(
      `[${timestamp()}] [minimaxService.generateCommitMessage] ENTRY attempt=${attempt}, prompt.length=${prompt.length}`
    );
    try {
      const apiKey = await ConfigService.getApiKey("MiniMax");
      const model = (await ConfigService.get("provider", "model")).unwrap();
      const maxRetries = await ModelService.getMaxRetries();

      logDebug(
        `[${timestamp()}] [minimaxService.generateCommitMessage] CALL API model=${model}`
      );

      const client = createMinimaxOpenAI({ apiKey });

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
        `[${timestamp()}] [minimaxService.generateCommitMessage] EXIT message="${text.substring(0, 50)}..."`
      );
      return { message: text, model };
    } catch (error) {
      logDebug(
        `[${timestamp()}] [minimaxService.generateCommitMessage] ERROR ${error}`
      );
      return await MinimaxService.handleGenerationError(
        error,
        prompt,
        attempt,
        MinimaxService.generateCommitMessage.bind(MinimaxService)
      );
    }
  }
}

export default MinimaxService;
