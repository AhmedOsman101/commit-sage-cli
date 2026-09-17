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
      const { provider, modelId, model } =
        await ModelService.resolveProviderAndModel(modelOverride);
      const apiKey =
        (await ConfigService.getProviderApiKey(provider)) ?? undefined;
      const baseURL =
        ((
          await ConfigService.get("openai", "baseUrl")
        ).unwrap() as unknown as string) ?? "https://api.openai.com/v1";
      const apiType = await ModelService.getApiType(provider, modelId);
      const generationOptions = await ModelService.getGenerationOptions(
        provider,
        modelId
      );
      const providerOptions = await ModelService.getOpenAIProviderOptions({
        forceReasoning: baseURL !== "https://api.openai.com/v1",
        provider,
        modelId,
      });
      Log.debug("Using OpenAI-compatible provider", {
        baseURL,
        model,
        apiType,
      });

      const openai = createOpenAI({ apiKey, baseURL });

      const wrappedModel = wrapLanguageModel({
        model:
          apiType === "openai-responses"
            ? openai(modelId)
            : openai.chat(modelId),
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
