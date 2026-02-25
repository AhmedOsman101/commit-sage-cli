import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { CommitMessage } from "@/lib/index.d.ts";
import { stripThinkingTags } from "@/lib/stripThinkingTags.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

class OpenAiService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("OpenAI");
      const model = (await ConfigService.get("openai", "model")).unwrap();
      const baseURL = (await ConfigService.get("openai", "baseUrl")).unwrap();

      const maxRetries = await ModelService.getMaxRetries();

      const openai = createOpenAI({ apiKey, baseURL });

      const { text } = await generateText({
        model: openai(model),
        prompt,
        temperature: 0.7,
        maxRetries,
      });

      return { message: stripThinkingTags(text), model };
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
