import axios, { type AxiosError } from "axios";
import type { CommitMessage } from "../index.d.ts";
import { ConfigurationError } from "../models/errors.ts";
import { errorMessages } from "../utils/constants.ts";
import ConfigService from "./configService.ts";
import { ModelService } from "./modelService.ts";

type GeminiResponse = {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
};

class GeminiService extends ModelService {
  static override async generateCommitMessage(
    prompt: string,
    attempt = 1
  ): Promise<CommitMessage> {
    try {
      const apiKey: string = await ConfigService.getApiKey("Gemini");
      const model = ConfigService.get("gemini", "model");
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const requestConfig = {
        headers: {
          "content-type": "application/json",
        },
        timeout: 30000,
      };

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      };

      const response = await axios.post<GeminiResponse>(
        apiUrl,
        payload,
        requestConfig
      );

      const message = GeminiService.extractCommitMessage(response.data);
      // void logInfo(`Commit message generated using ${model} model`);
      return { message, model };
    } catch (error) {
      const axiosError = error as AxiosError;
      // console.log(error);
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data as {
          error?: { message?: string };
        };

        switch (status) {
          case 401:
            if (attempt === 1) {
              // If this is the first attempt and the key is invalid, request a new key and try again
              await ConfigService.promptForApiKey("Gemini");
              return GeminiService.generateCommitMessage(prompt, attempt + 1);
            }
            throw new Error(errorMessages.authenticationError);
          case 402:
            throw new Error(errorMessages.paymentRequired);
          case 429:
            throw new Error(errorMessages.rateLimitExceeded);
          case 422:
            throw new Error(
              data.error?.message || errorMessages.invalidRequest
            );
          case 500:
            throw new Error(errorMessages.serverError);
          default:
            throw new Error(
              `${errorMessages.apiError.replace("{0}", String(status))}: ${data.error?.message || "Unknown error"}`
            );
        }
      }

      if (
        axiosError.code === "ECONNREFUSED" ||
        axiosError.code === "ETIMEDOUT"
      ) {
        throw new Error(
          errorMessages.networkError.replace(
            "{0}",
            "Connection failed. Please check your internet connection."
          )
        );
      }

      // If the key is not set and this is the first attempt
      if (error instanceof ConfigurationError && attempt === 1) {
        await ConfigService.promptForApiKey("Gemini");
        return GeminiService.generateCommitMessage(prompt, attempt + 1);
      }

      throw new Error(
        errorMessages.networkError.replace("{0}", axiosError.message)
      );
    }
  }

  protected static override extractCommitMessage(
    response: GeminiResponse
  ): string {
    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Unexpected response format from Gemini API");
    }

    return response.candidates[0].content.parts[0].text.trim();
  }
}

export default GeminiService;
