import { createMoonshotAI } from "@ai-sdk/moonshotai";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import type { CommitMessage } from "@/lib/index.d.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

class MoonshotService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("MoonshotAI");
      const model = (await ConfigService.get("provider", "model")).unwrap();
      const maxRetries = await ModelService.getMaxRetries();

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

      return { message: text, model };
    } catch (error) {
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
