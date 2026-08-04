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
      const apiKey = await ConfigService.getApiKey("Xai");
      const model = await ModelService.resolveModel(modelOverride);
      const generationOptions = await ModelService.getGenerationOptions();
      const providerOptions = await ModelService.getXaiProviderOptions();
      const xai = createXai({ apiKey });

      const wrappedModel = wrapLanguageModel({
        model: xai(model),
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
