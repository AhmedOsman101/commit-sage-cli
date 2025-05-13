import type { CommitMessage } from "../index.d.ts";
import { errorMessages } from "../lib/constants.ts";
import { logError } from "../lib/Logger.ts";
import CodestralService from "./codestralService.ts";
import ConfigService from "./configService.ts";
import GeminiService from "./geminiService.ts";
import GitBlameAnalyzer from "./gitBlameAnalyzer.ts";
import GitService from "./gitService.ts";
import OllamaService from "./ollamaService.ts";
import OpenAIService from "./openaiService.ts";
import PromptService from "./promptService.ts";

const MAX_DIFF_LENGTH = 100000;

const AiService = {
  truncateDiff(diff: string): string {
    return diff.length > MAX_DIFF_LENGTH
      ? `${diff.substring(0, MAX_DIFF_LENGTH)}\n...(truncated)`
      : diff;
  },

  async generateCommitMessage(
    diff: string,
    blameAnalysis: string
  ): Promise<CommitMessage> {
    try {
      if (!diff) throw new Error(errorMessages.noChanges);

      const truncatedDiff = this.truncateDiff(diff);
      const prompt = await PromptService.generatePrompt(
        truncatedDiff,
        blameAnalysis
      );

      const { ok: provider, error: providerError } = await ConfigService.get(
        "provider",
        "type"
      );

      if (providerError !== undefined) throw providerError;

      switch (provider) {
        case "openai":
          return await OpenAIService.generateCommitMessage(prompt);
        case "codestral":
          return await CodestralService.generateCommitMessage(prompt);
        case "ollama":
          return await OllamaService.generateCommitMessage(prompt);
        default: // gemini
          return await GeminiService.generateCommitMessage(prompt);
      }
    } catch (error) {
      void logError((error as Error).message);

      throw error;
    }
  },
  async generateAndApplyMessage() {
    GitService.initialize();
    const { ok: onlyStagedSetting, error: onlyStagedSettingError } =
      await ConfigService.get("commit", "onlyStagedChanges");

    if (onlyStagedSettingError !== undefined) throw onlyStagedSettingError;

    const hasStagedChanges = GitService.hasChanges("staged");

    const useStagedChanges = onlyStagedSetting || hasStagedChanges;

    const diff = await GitService.getDiff(useStagedChanges);

    if (!diff) logError("No changes to commit");

    const changedFiles = GitService.getChangedFiles(useStagedChanges);

    const blameAnalyses: string[] = [];

    for (const file of changedFiles) {
      const analysisResult = GitBlameAnalyzer.analyzeChanges(file);
      blameAnalyses.push(analysisResult);
    }

    const blameAnalysis = blameAnalyses
      .filter(analysis => analysis)
      .join("\n\n");

    return await this.generateCommitMessage(diff, blameAnalysis);
  },
};

export default AiService;
