import { createMistral } from "@ai-sdk/mistral";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { ModelService } from "@/services/model.ts";

class MistralService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1,
    modelOverride?: string
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("Mistral");
      const model = await ModelService.resolveModel(modelOverride);
      const generationOptions = await ModelService.getGenerationOptions();
      const mistral = createMistral({ apiKey });

      const wrappedModel = wrapLanguageModel({
        model: mistral(model),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });

      const { text } = await generateText({
        model: wrappedModel,
        prompt,
        ...generationOptions,
      });

      return { message: text, model };
    } catch (error) {
      return await MistralService.handleGenerationError(
        error,
        prompt,
        attempt,
        (p: string, a: number) =>
          MistralService.generateCommitMessage(p, a, modelOverride)
      );
    }
  }
}

export default MistralService;
