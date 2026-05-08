import { createXai } from "@ai-sdk/xai";
import {
  extractReasoningMiddleware,
  generateText,
  wrapLanguageModel,
} from "ai";
import type { CommitMessage } from "@/lib/index.d.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

class XaiService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("Xai");
      const model = (await ConfigService.get("provider", "model")).unwrap();
      const temperature = await ModelService.getTemperature();
      const xai = createXai({ apiKey });

      const wrappedModel = wrapLanguageModel({
        model: xai(model),
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });

      const { text } = await generateText({
        model: wrappedModel,
        prompt,
        temperature,
      });

      return { message: text, model };
    } catch (error) {
      return await XaiService.handleGenerationError(
        error,
        prompt,
        attempt,
        XaiService.generateCommitMessage.bind(XaiService)
      );
    }
  }
}

export default XaiService;
