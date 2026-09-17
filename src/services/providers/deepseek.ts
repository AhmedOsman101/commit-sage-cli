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
      const { provider, modelId, model } =
        await ModelService.resolveProviderAndModel(modelOverride);
      const apiKey =
        (await ConfigService.getProviderApiKey(provider)) ?? undefined;
      const generationOptions = await ModelService.getGenerationOptions(
        provider,
        modelId
      );
      const deepseek = createDeepSeek({ apiKey });

      const wrappedModel = wrapLanguageModel({
        model: deepseek(modelId),
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
