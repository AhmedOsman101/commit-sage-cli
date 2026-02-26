import { createXai } from "@ai-sdk/xai";
import { generateText } from "ai";
import type { CommitMessage } from "@/lib/index.d.ts";
import { stripThinkingTags } from "@/lib/stripThinkingTags.ts";
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
      const maxRetries = await ModelService.getMaxRetries();

      const xai = createXai({ apiKey });

      const { text } = await generateText({
        model: xai(model),
        prompt,
        temperature: 0.7,
        maxRetries,
      });

      return { message: stripThinkingTags(text), model };
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
