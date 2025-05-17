import axios, { type AxiosError } from "axios";
import { errorMessages } from "../lib/constants.ts";
import type { CommitMessage } from "../lib/index.d.ts";
import { ConfigurationError, OpenAIError } from "../models/errors.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

type OpenAIResponse = {
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

class OpenAIService extends ModelService {
  private static readonly modelsPath = "/models";

  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey: string = ConfigService.getApiKey("OpenAI");

      const { ok: model, error: modelError } = await ConfigService.get(
        "openai",
        "model"
      );
      if (modelError !== undefined) throw modelError;

      const { ok: baseUrl, error: baseUrlError } = await ConfigService.get(
        "openai",
        "baseUrl"
      );
      if (baseUrlError !== undefined) throw baseUrlError;

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

      const response = await axios.post<OpenAIResponse>(
        `${baseUrl}/chat/completions`,
        payload,
        { headers }
      );

      const message = OpenAIService.extractCommitMessage(response.data);
      // void logInfo(`Commit message generated using ${model} model`);
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
              ConfigService.promptForApiKey("OpenAI");
              return OpenAIService.generateCommitMessage(prompt, attempt + 1);
            }
            throw new OpenAIError(errorMessages.authenticationError);
          case 402:
            throw new OpenAIError(errorMessages.paymentRequired);
          case 429:
            throw new OpenAIError(errorMessages.rateLimitExceeded);
          case 422:
            throw new OpenAIError(
              data.error?.message || errorMessages.invalidRequest
            );
          case 500:
            throw new OpenAIError(errorMessages.serverError);
          default:
            throw new OpenAIError(
              `${errorMessages.apiError.replace("{0}", String(status))}: ${data.error?.message || "Unknown error"}`
            );
        }
      }

      if (
        axiosError.code === "ECONNREFUSED" ||
        axiosError.code === "ETIMEDOUT" ||
        axiosError.code === "ENOTFOUND"
      ) {
        throw new OpenAIError(
          errorMessages.networkError.replace(
            "{0}",
            "Connection failed. Please check your internet connection."
          )
        );
      }

      // If the key is not set and this is the first attempt
      if (error instanceof ConfigurationError && attempt === 1) {
        ConfigService.promptForApiKey("OpenAI");
        return OpenAIService.generateCommitMessage(prompt, attempt + 1);
      }

      throw new OpenAIError(
        errorMessages.networkError.replace("{0}", axiosError.message)
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
        `${baseUrl}${OpenAIService.modelsPath}`,
        { headers }
      );

      if (!response.data?.data) {
        return [];
      }

      const models = response.data.data.map(model => model.id);
      if (models.length > 0) {
        // void logInfo(`Successfully fetched ${models.length} models`);
      }
      return models;
    } catch {
      return [];
    }
  }

  protected static override extractCommitMessage(
    response: OpenAIResponse
  ): string {
    if (!response.choices?.[0]?.message?.content) {
      throw new OpenAIError("Unexpected response format from OpenAI API");
    }

    let content = response.choices[0].message.content.trim();

    // Remove <think> tags for DeepSeek R1 model support
    content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    return content;
  }
}

export default OpenAIService;
