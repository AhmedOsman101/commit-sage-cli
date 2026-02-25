import { generateText } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import type {
  ApiError,
  CommitMessage,
  ErrorWithResponse,
} from "@/lib/index.d.ts";
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
      const { text } = await generateText({
        model: ollama(model),
        prompt,
        temperature: 0.7,
        maxRetries,
      });

      return { message: text, model };
    } catch (error) {
      return await OllamaService.handleGenerationError(
        error,
        prompt,
        attempt,
        OllamaService.generateCommitMessage.bind(OllamaService)
      );
    }
  }

  static override handleApiError(error: ErrorWithResponse): ApiError {
    if (error.response) {
      const { status } = error.response;
      const responseData = JSON.stringify(error.response.data);

      switch (status) {
        case 404:
          return {
            errorMessage:
              "Model not found. Please check if Ollama is running and the model is installed.",
            shouldRetry: false,
          };
        case 500:
          return {
            errorMessage:
              "Server error. Please check if Ollama is running properly.",
            shouldRetry: true,
          };
        default:
          return {
            errorMessage: `API returned status ${status}. ${responseData}`,
            shouldRetry: status >= 500,
          };
      }
    }

    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ETIMEDOUT")
    ) {
      return {
        errorMessage:
          "Could not connect to Ollama. Please make sure Ollama is running.",
        shouldRetry: true,
      };
    }

    return {
      errorMessage: error.message,
      shouldRetry: false,
    };
  }
}

export default OllamaService;
