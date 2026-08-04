import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import { DEFAULT_CONFIG } from "@/lib/constants.ts";
import { logDebug } from "@/lib/logger.ts";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { ModelService } from "@/services/model.ts";

class OllamaService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1,
    modelOverride?: string
  ): Promise<CommitMessage> {
    logDebug(
      `[ollamaService.generateCommitMessage] ENTRY attempt=${attempt}, prompt.length=${prompt.length}`
    );

    const baseURLResult = await ConfigService.get("ollama", "baseUrl");
    const baseURL =
      baseURLResult.isOk() && baseURLResult.ok
        ? baseURLResult.ok
        : (DEFAULT_CONFIG.ollama.baseUrl as string);

    const model = await ModelService.resolveModel(modelOverride);
    const generationOptions = await ModelService.getGenerationOptions();

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
        ...generationOptions,
      });

      return { message: response.text, model };
    } catch (error) {
      return await OllamaService.handleGenerationError(
        error,
        prompt,
        attempt,
        (p: string, a: number) =>
          OllamaService.generateCommitMessage(p, a, modelOverride)
      );
    }
  }
}

export default OllamaService;
