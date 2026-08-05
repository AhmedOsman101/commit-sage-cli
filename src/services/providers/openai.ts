import { createOpenAI } from "@ai-sdk/openai";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import { Log } from "@/lib/logger.ts";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { ModelService } from "@/services/model.ts";

class OpenAiService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1,
    modelOverride?: string
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("OpenAI");
      const model = await ModelService.resolveModel(modelOverride);
      const baseURL = (await ConfigService.get("openai", "baseUrl")).unwrap();
      const useChatCompletions = await ConfigService.get(
        "openai",
        "useChatCompletions"
      ).then(result => result.unwrap());
      const generationOptions = await ModelService.getGenerationOptions();
      const providerOptions = await ModelService.getOpenAIProviderOptions({
        forceReasoning: baseURL !== "https://api.openai.com/v1",
      });
      Log.debug("Using OpenAI-compatible provider", {
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
        (p: string, a: number) =>
          OpenAiService.generateCommitMessage(p, a, modelOverride)
      );
    }
  }
}

export default OpenAiService;
