import { createDeepSeek } from "@ai-sdk/deepseek";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { ModelService } from "@/services/model.ts";

class DeepseekService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1,
    modelOverride?: string
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("DeepSeek");
      const model = await ModelService.resolveModel(modelOverride);
      const generationOptions = await ModelService.getGenerationOptions();
      const deepseek = createDeepSeek({ apiKey });

      const wrappedModel = wrapLanguageModel({
        model: deepseek(model),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });

      const { text } = await generateText({
        model: wrappedModel,
        prompt,
        ...generationOptions,
      });

      return { message: text, model };
    } catch (error) {
      return await DeepseekService.handleGenerationError(
        error,
        prompt,
        attempt,
        (p: string, a: number) =>
          DeepseekService.generateCommitMessage(p, a, modelOverride)
      );
    }
  }
}

export default DeepseekService;
