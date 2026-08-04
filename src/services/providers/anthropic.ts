import { createAnthropic } from "@ai-sdk/anthropic";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { ModelService } from "@/services/model.ts";

class AnthropicService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("Anthropic");
      const model = (await ConfigService.get("provider", "model")).unwrap();
      const generationOptions = await ModelService.getGenerationOptions();
      const providerOptions = await ModelService.getAnthropicProviderOptions();
      const anthropic = createAnthropic({ apiKey });

      const wrappedModel = wrapLanguageModel({
        model: anthropic(model),
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
      return await AnthropicService.handleGenerationError(
        error,
        prompt,
        attempt,
        AnthropicService.generateCommitMessage.bind(AnthropicService)
      );
    }
  }
}

export default AnthropicService;
