import axios from "axios";
import type { ApiError, CommitMessage, ErrorWithResponse } from "../index.d.ts";
import { logInfo, logWarning } from "../utils/Logger.ts";
import ConfigService from "./configService.ts";

type OllamaResponse = {
  message: {
    content: string;
  };
};

const OllamaService = {
  maxRetryBackoff: 10_000 as const,
  async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    const baseUrl = ConfigService.get("ollama", "baseUrl");
    const model = ConfigService.get("ollama", "model");

    const apiUrl = `${baseUrl}/api/chat`;

    const requestConfig = {
      headers: {
        "content-type": "application/json",
      },
      timeout: 30000,
    };

    const payload = {
      model: model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    };

    try {
      void logInfo(`Attempt ${attempt}: Sending request to Ollama API`);

      const response = await axios.post<OllamaResponse>(
        apiUrl,
        payload,
        requestConfig
      );

      void logInfo("Ollama API response received successfully");

      const commitMessage = this.extractCommitMessage(response.data);
      void logInfo(`Commit message generated using ${model} model`);
      return { message: commitMessage, model };
    } catch (error) {
      return await this.handleGenerationError(
        error as ErrorWithResponse,
        prompt,
        attempt
      );
    }
  },
  extractCommitMessage(response: OllamaResponse): string {
    if (response.message?.content) {
      const commitMessage = this.cleanCommitMessage(response.message.content);
      if (!commitMessage.trim()) {
        throw new Error("Generated commit message is empty.");
      }
      return commitMessage;
    }
    throw new Error("Invalid response format from Ollama API");
  },
  cleanCommitMessage(message: string): string {
    return message.trim();
  },
  calculateRetryDelay(attempt: number): number {
    return Math.min(1000 * 2 ** (attempt - 1), this.maxRetryBackoff);
  },
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  async handleGenerationError(
    error: ErrorWithResponse,
    prompt: string,
    attempt: number
  ): Promise<CommitMessage> {
    void logWarning(`Generation attempt ${attempt} failed:`, error);
    const { errorMessage, shouldRetry } = this.handleApiError(error);

    if (shouldRetry && attempt < ConfigService.get("general", "maxRetries")) {
      const delayMs = this.calculateRetryDelay(attempt);
      void logInfo(`Retrying in ${delayMs / 1000} seconds...`);
      await this.delay(delayMs);

      return this.generateCommitMessage(prompt, attempt + 1);
    }

    throw new Error(`Failed to generate commit message: ${errorMessage}`);
  },
  handleApiError(error: ErrorWithResponse): ApiError {
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
  },
};

export default OllamaService;
