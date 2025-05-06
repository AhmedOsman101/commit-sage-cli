import axios from "axios";
import type { ApiError, CommitMessage, ErrorWithResponse } from "../index.d.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

type OllamaResponse = {
  message: {
    content: string;
  };
};

class OllamaService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    const [baseUrl, baseUrlError] = await ConfigService.get(
      "ollama",
      "baseUrl"
    );
    if (baseUrlError !== null) throw new Error(baseUrlError);

    const [model, modelError] = await ConfigService.get("ollama", "model");
    if (modelError !== null) throw new Error(modelError);

    const apiUrl = `${baseUrl}/api/chat`;

    const requestConfig = {
      headers: {
        "content-type": "application/json",
      },
      timeout: 30000,
    };

    const payload = {
      model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    };

    try {
      // void logInfo(`Attempt ${attempt}: Sending request to Ollama API`);

      const response = await axios.post<OllamaResponse>(
        apiUrl,
        payload,
        requestConfig
      );

      // void logInfo("Ollama API response received successfully");

      const commitMessage = OllamaService.extractCommitMessage(response.data);
      // void logInfo(`Commit message generated using ${model} model`);
      return { message: commitMessage, model };
    } catch (error) {
      return await OllamaService.handleGenerationError(
        error as ErrorWithResponse,
        prompt,
        attempt
      );
    }
  }

  static override extractCommitMessage(response: OllamaResponse): string {
    if (response.message?.content) {
      const commitMessage = OllamaService.cleanCommitMessage(
        response.message.content
      );
      if (!commitMessage.trim()) {
        throw new Error("Generated commit message is empty.");
      }
      return commitMessage;
    }
    throw new Error("Invalid response format from Ollama API");
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
