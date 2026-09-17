import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { ModelService } from "@/services/model.ts";

class GeminiService extends ModelService {
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
      const providerOptions = await ModelService.getGoogleProviderOptions(
        provider,
        modelId
      );
      const google = createGoogleGenerativeAI({ apiKey });

      const wrappedModel = wrapLanguageModel({
        model: google(modelId),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });

      const { text } = await generateText({
        model: wrappedModel,
        prompt,
        ...generationOptions,
        providerOptions,
      });

      return { message: text, model };
    } catch (error) {
      return await GeminiService.handleGenerationError(
        error,
        prompt,
        attempt,
        (p: string, a: number) =>
          GeminiService.generateCommitMessage(p, a, modelOverride)
      );
    }
  }
}

export default GeminiService;
