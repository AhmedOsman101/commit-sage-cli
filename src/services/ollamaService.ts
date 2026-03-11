import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import { DEFAULT_CONFIG } from "@/lib/constants.ts";
import type { CommitMessage } from "@/lib/index.d.ts";
import { logDebug } from "@/lib/logger.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

class OllamaService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    logDebug(
      `[ollamaService.generateCommitMessage] ENTRY attempt=${attempt}, prompt.length=${prompt.length}`
    );

    const baseURLResult = await ConfigService.get("ollama", "baseUrl");
    const baseURL =
      baseURLResult.isOk() && baseURLResult.ok
        ? baseURLResult.ok
        : (DEFAULT_CONFIG.ollama.baseUrl as string);

    const modelResult = await ConfigService.get("provider", "model");
    if (modelResult.isError()) {
      throw new Error(
        "provider.model is required for Ollama. Please set it in your config."
      );
    }
    const model = modelResult.ok;

    const maxRetries = await ModelService.getMaxRetries();

    logDebug(
      `[ollamaService.generateCommitMessage] CALL API model=${model}, baseURL=${baseURL}`
    );

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
