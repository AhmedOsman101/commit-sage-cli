import { createXai } from "@ai-sdk/xai";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { ModelService } from "@/services/model.ts";

class XaiService extends ModelService {
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
      const providerOptions = await ModelService.getXaiProviderOptions(
        provider,
        modelId
      );
      const xai = createXai({ apiKey });

      const wrappedModel = wrapLanguageModel({
        model: xai(modelId),
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
      return await XaiService.handleGenerationError(
        error,
        prompt,
        attempt,
        (p: string, a: number) =>
          XaiService.generateCommitMessage(p, a, modelOverride)
      );
    }
  }
}

export default XaiService;
