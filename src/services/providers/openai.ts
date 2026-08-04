import { createOpenAI } from "@ai-sdk/openai";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import { logDebug } from "@/lib/logger.ts";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { ModelService } from "@/services/model.ts";

class OpenAiService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("OpenAI");
      const model = (await ConfigService.get("provider", "model")).unwrap();
      const baseURL = (await ConfigService.get("openai", "baseUrl")).unwrap();
      const useChatCompletions = await ConfigService.get(
        "openai",
        "useChatCompletions"
      ).then(result => result.unwrap());
      const generationOptions = await ModelService.getGenerationOptions();
      const providerOptions = await ModelService.getOpenAIProviderOptions({
        forceReasoning: baseURL !== "https://api.openai.com/v1",
      });
      logDebug("Using OpenAI-compatible provider", {
        baseURL,
        model,
        useChatCompletions,
      });

      const openai = createOpenAI({ apiKey, baseURL });

      const wrappedModel = wrapLanguageModel({
        model: useChatCompletions ? openai.chat(model) : openai(model),
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
      return await OpenAiService.handleGenerationError(
        error,
        prompt,
        attempt,
        OpenAiService.generateCommitMessage.bind(OpenAiService)
      );
    }
  }
}

export default OpenAiService;
