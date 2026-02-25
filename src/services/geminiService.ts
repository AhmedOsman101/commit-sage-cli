import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import type { CommitMessage } from "@/lib/index.d.ts";
import { stripThinkingTags } from "@/lib/stripThinkingTags.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

class GeminiService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("Gemini");
      const model = (await ConfigService.get("gemini", "model")).unwrap();
      const baseURL = (await ConfigService.get("gemini", "baseUrl")).unwrap();
      const maxRetries = await ModelService.getMaxRetries();

      const google = createGoogleGenerativeAI({ apiKey, baseURL });

      const { text } = await generateText({
        model: google(model),
        prompt,
        temperature: 0.7,
        maxRetries,
      });

      return { message: stripThinkingTags(text), model };
    } catch (error) {
      return await GeminiService.handleGenerationError(
        error,
        prompt,
        attempt,
        GeminiService.generateCommitMessage.bind(GeminiService)
      );
    }
  }
}

export default GeminiService;
