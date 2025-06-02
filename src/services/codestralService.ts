import axios from "axios";
import type { CommitMessage, ErrorWithResponse } from "../lib/index.d.ts";
import { ConfigurationError } from "../models/errors.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

type CodestralResponse = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
};

class CodestralService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey: string = await ConfigService.getApiKey("Codestral");

      const { ok: model, error: modelError } = await ConfigService.get(
        "codestral",
        "model"
      );
      if (modelError !== undefined) throw modelError;

      const apiUrl = "https://codestral.mistral.ai/v1/chat/completions";

      const requestConfig = {
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30000,
      };

      const payload = {
        model,
        messages: [{ role: "user", content: prompt }],
      };

      const response = await axios.post<CodestralResponse>(
        apiUrl,
        payload,
        requestConfig
      );

      const message = CodestralService.extractCommitMessage(response.data);
      // void logInfo(`Commit message generated using ${model} model`);
      return { message, model };
    } catch (error) {
      const axiosError = error as ErrorWithResponse;
      if (axiosError.response) {
        const { status } = axiosError.response;
        const responseData = JSON.stringify(axiosError.response.data);

        switch (status) {
          case 401:
            if (attempt === 1) {
              ConfigService.promptForApiKey("Codestral");
              return CodestralService.generateCommitMessage(
                prompt,
                attempt + 1
              );
            }
            throw new Error(
              "Invalid API key. Please check your Codestral API key."
            );
          case 429:
            throw new Error("Rate limit exceeded. Please try again later.");
          case 500:
            throw new Error("Server error. Please try again later.");
          default:
            throw new Error(`API returned status ${status}. ${responseData}`);
        }
      }

      if (
        axiosError.message.includes("ECONNREFUSED") ||
        axiosError.message.includes("ENOTFOUND") ||
        axiosError.message.includes("ETIMEDOUT")
      ) {
        throw new Error(
          "Could not connect to Codestral API. Please check your internet connection."
        );
      }

      // If the key is not set and this is the first attempt
      if (error instanceof ConfigurationError && attempt === 1) {
        ConfigService.promptForApiKey("Codestral");
        return CodestralService.generateCommitMessage(prompt, attempt + 1);
      }

      throw error;
    }
  }

  protected static override extractCommitMessage(
    response: CodestralResponse
  ): string {
    if (response.choices?.[0]?.message?.content) {
      const commitMessage = CodestralService.cleanCommitMessage(
        response.choices[0].message.content
      );
      if (!commitMessage.trim()) {
        throw new Error("Generated commit message is empty.");
      }
      return commitMessage;
    }
    throw new Error("Invalid response format from Codestral API");
  }

  protected static override handleApiError(error: ErrorWithResponse): {
    errorMessage: string;
    shouldRetry: boolean;
  } {
    if (error.response) {
      const { status } = error.response;
      const responseData = JSON.stringify(error.response.data);

      switch (status) {
        case 401:
          return {
            errorMessage:
              "Invalid API key. Please check your Codestral API key.",
            shouldRetry: false,
          };
        case 429:
          return {
            errorMessage: "Rate limit exceeded. Please try again later.",
            shouldRetry: true,
          };
        case 500:
          return {
            errorMessage: "Server error. Please try again later.",
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
          "Could not connect to Codestral API. Please check your internet connection.",
        shouldRetry: true,
      };
    }

    return {
      errorMessage: error.message,
      shouldRetry: false,
    };
  }
}

export default CodestralService;
