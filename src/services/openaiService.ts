import { createOpenAI } from "@ai-sdk/openai";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import type { CommitMessage } from "@/lib/index.d.ts";
import { logDebug } from "@/lib/logger.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

class OpenAiService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("OpenAI");
      const model = (await ConfigService.get("provider", "model")).unwrap();
      const baseURL = (await ConfigService.get("openai", "baseUrl")).unwrap();
      logDebug("Using OpenAI-compatible provider", {
        baseURL,
        model,
      });

      const openai = createOpenAI({ apiKey, baseURL });

      const wrappedModel = wrapLanguageModel({
        model: openai.chat(model),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });

      const { text } = await generateText({
        model: wrappedModel,
        prompt,
        temperature: 0.7,
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
