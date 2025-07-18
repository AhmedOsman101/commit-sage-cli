import axios, { type AxiosError } from "axios";
import { ERROR_MESSAGES } from "../lib/constants.ts";
import { ConfigurationError, OpenAiError } from "../lib/errors.ts";
import type { CommitMessage } from "../lib/index.d.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

type OpenAiResponse = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
};

type ModelsResponse = {
  data: Array<{
    id: string;
    ownedBy?: string;
  }>;
};

type ApiHeaders = Record<string, string>;

class OpenAiService extends ModelService {
  private static readonly modelsPath = "/models";

  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey: string = await ConfigService.getApiKey("OpenAI");

      const model = await ConfigService.get("openai", "model").then(result =>
        result.unwrap()
      );

      const baseUrl = await ConfigService.get("openai", "baseUrl").then(
        result => result.unwrap()
      );

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      };

      const payload = {
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        maxTokens: 1024,
      };

      const response = await axios.post<OpenAiResponse>(
        `${baseUrl}/chat/completions`,
        payload,
        { headers }
      );

      const message = OpenAiService.extractCommitMessage(response.data);

      return { message, model };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const { status } = axiosError.response;
        const data = axiosError.response.data as {
          error?: { message?: string };
        };

        switch (status) {
          case 401:
            if (attempt === 1) {
              return OpenAiService.generateCommitMessage(prompt, attempt + 1);
            }
            throw new OpenAiError(ERROR_MESSAGES.authenticationError);
          case 402:
            throw new OpenAiError(ERROR_MESSAGES.paymentRequired);
          case 429:
            throw new OpenAiError(ERROR_MESSAGES.rateLimitExceeded);
          case 422:
            throw new OpenAiError(
              data.error?.message || ERROR_MESSAGES.invalidRequest
            );
          case 500:
            throw new OpenAiError(ERROR_MESSAGES.serverError);
          default:
            throw new OpenAiError(
              `${ERROR_MESSAGES.apiError.replace("{0}", String(status))}: ${data.error?.message || "Unknown error"}`
            );
        }
      }

      if (
        axiosError.code === "ECONNREFUSED" ||
        axiosError.code === "ETIMEDOUT" ||
        axiosError.code === "ENOTFOUND"
      ) {
        throw new OpenAiError(
          ERROR_MESSAGES.networkError.replace(
            "{0}",
            "Connection failed. Please check your internet connection."
          )
        );
      }

      // If the key is not set and this is the first attempt
      if (error instanceof ConfigurationError && attempt === 1) {
        return OpenAiService.generateCommitMessage(prompt, attempt + 1);
      }

      throw new OpenAiError(
        ERROR_MESSAGES.networkError.replace("{0}", axiosError.message)
      );
    }
  }

  static async fetchAvailableModels(
    baseUrl: string,
    apiKey: string
  ): Promise<string[]> {
    try {
      const headers: ApiHeaders = {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      };

      const response = await axios.get<ModelsResponse>(
        `${baseUrl}${OpenAiService.modelsPath}`,
        { headers }
      );

      if (!response.data?.data) {
        return [];
      }

      const models = response.data.data.map(model => model.id);
      return models;
    } catch {
      return [];
    }
  }

  protected static override extractCommitMessage(
    response: OpenAiResponse
  ): string {
    if (!response.choices?.[0]?.message?.content) {
      throw new OpenAiError("Unexpected response format from OpenAI API");
    }

    let content = response.choices[0].message.content.trim();

    // Remove <think> tags for thinking models support
    content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    return content;
  }
}

export default OpenAiService;
