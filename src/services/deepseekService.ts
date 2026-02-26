import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText } from "ai";
import type { CommitMessage } from "@/lib/index.d.ts";
import { stripThinkingTags } from "@/lib/stripThinkingTags.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

class DeepseekService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("DeepSeek");
      const model = (await ConfigService.get("provider", "model")).unwrap();
      const maxRetries = await ModelService.getMaxRetries();

      const deepseek = createDeepSeek({ apiKey });

      const { text } = await generateText({
        model: deepseek(model),
        prompt,
        temperature: 0.7,
        maxRetries,
      });

      return { message: stripThinkingTags(text), model };
    } catch (error) {
      return await DeepseekService.handleGenerationError(
        error,
        prompt,
        attempt,
        DeepseekService.generateCommitMessage.bind(DeepseekService)
      );
    }
  }
}

export default DeepseekService;
