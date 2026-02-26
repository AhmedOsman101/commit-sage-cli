import { createMistral } from "@ai-sdk/mistral";
import { generateText } from "ai";
import type { CommitMessage } from "@/lib/index.d.ts";
import { stripThinkingTags } from "@/lib/stripThinkingTags.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

class MistralService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey = await ConfigService.getApiKey("Mistral");
      const model = (await ConfigService.get("provider", "model")).unwrap();
      const maxRetries = await ModelService.getMaxRetries();

      const mistral = createMistral({ apiKey });

      const { text } = await generateText({
        model: mistral(model),
        prompt,
        temperature: 0.7,
        maxRetries,
      });

      return { message: stripThinkingTags(text), model };
    } catch (error) {
      return await MistralService.handleGenerationError(
        error,
        prompt,
        attempt,
        MistralService.generateCommitMessage.bind(MistralService)
      );
    }
  }
}

export default MistralService;
