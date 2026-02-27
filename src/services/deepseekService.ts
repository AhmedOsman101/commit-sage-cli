import { createDeepSeek } from "@ai-sdk/deepseek";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import type { CommitMessage } from "@/lib/index.d.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

class DeepseekService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("DeepSeek");
      const model = (await ConfigService.get("provider", "model")).unwrap();
      const maxRetries = await ModelService.getMaxRetries();

      const deepseek = createDeepSeek({ apiKey });

      const wrappedModel = wrapLanguageModel({
        model: deepseek(model),
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
      return await DeepseekService.handleGenerationError(
        error,
        prompt,
        attempt,
        DeepseekService.generateCommitMessage.bind(DeepseekService)
      );
    }
  }
}

export default DeepseekService;
