import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import type { CommitMessage } from "@/lib/index.d.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

class OllamaService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    const baseURL = (await ConfigService.get("ollama", "baseUrl")).unwrap();
    const model = (await ConfigService.get("ollama", "model")).unwrap();
    const maxRetries = await ModelService.getMaxRetries();

    const ollama = createOllama({ baseURL });

    try {
      const wrappedModel = wrapLanguageModel({
        model: ollama(model),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });

      const response = await generateText({
        model: wrappedModel,
        prompt,
        temperature: 0.7,
        maxRetries,
      });

      return { message: response.text, model };
    } catch (error) {
      return await OllamaService.handleGenerationError(
        error,
        prompt,
        attempt,
        OllamaService.generateCommitMessage.bind(OllamaService)
      );
    }
  }
}

export default OllamaService;
