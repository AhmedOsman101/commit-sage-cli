/**
 * OpenRouter Service — meta-provider routing to hundreds of AI models.
 * Model IDs are provider-prefixed: e.g. "anthropic/claude-opus-4-5" or
 * "openai/gpt-4.1-mini". Config lives in the dedicated 'openrouter' section.
 * Required headers (HTTP-Referer, X-Title) satisfy OpenRouter usage policy.
 * Register at https://openrouter.ai and set OPENROUTER_API_KEY.
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import type { CommitMessage } from "@/lib/index.d.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

class OpenRouterService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("OpenRouter");
      const model = (await ConfigService.get("openrouter", "model")).unwrap();
      const baseURL = (
        await ConfigService.get("openrouter", "baseUrl")
      ).unwrap();
      const maxRetries = await ModelService.getMaxRetries();

      const client = createOpenRouter({
        apiKey,
        baseURL,
        headers: {
          "HTTP-Referer": "https://github.com/AhmedOsman101/commit-sage-cli",
          "X-Title": "Commit Sage",
        },
      });

      const wrappedModel = wrapLanguageModel({
        model: client(model),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });

      const { text } = await generateText({
        model: wrappedModel,
        prompt,
        temperature: 0.7,
        maxRetries,
      });

      return { message: text, model };
    } catch (error) {
      return await OpenRouterService.handleGenerationError(
        error,
        prompt,
        attempt,
        OpenRouterService.generateCommitMessage.bind(OpenRouterService)
      );
    }
  }
}

export default OpenRouterService;
