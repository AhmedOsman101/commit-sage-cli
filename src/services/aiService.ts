import { ERROR_MESSAGES } from "../lib/constants.ts";
import type { CommitMessage } from "../lib/index.d.ts";
import { logError } from "../lib/logger.ts";
import ConfigService from "./configService.ts";
import GeminiService from "./geminiService.ts";
import GitBlameAnalyzer from "./gitBlameAnalyzer.ts";
import GitService from "./gitService.ts";
import OllamaService from "./ollamaService.ts";
import OpenAiService from "./openaiService.ts";
import PromptService from "./promptService.ts";

const MAX_DIFF_LENGTH = 100_000;

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
      if (!diff) throw new Error(ERROR_MESSAGES.noChanges);

      const truncatedDiff = this.truncateDiff(diff);
      const prompt = await PromptService.generatePrompt(
        truncatedDiff,
        blameAnalysis
      );

      const provider = await ConfigService.get("provider", "type").then(
        result => result.unwrap()
      );

      switch (provider) {
        case "openai":
          return await OpenAiService.generateCommitMessage(prompt);
        case "ollama":
          return await OllamaService.generateCommitMessage(prompt);
        default: // gemini
          return await GeminiService.generateCommitMessage(prompt);
      }
    } catch (error) {
      logError((error as Error).message);
    }
  },
  async generateAndApplyMessage() {
    GitService.initialize();
    const onlyStagedSetting = await ConfigService.get(
      "commit",
      "onlyStagedChanges"
    ).then(result => result.unwrap());

    const hasStagedChanges = GitService.hasChanges("staged");

    const useStagedChanges = onlyStagedSetting || hasStagedChanges;

    const diff = await GitService.getDiff(useStagedChanges);

    if (!diff) logError("No changes to commit");

    const changedFiles = GitService.getChangedFiles(useStagedChanges);

    const analysesPromises = changedFiles.map(file =>
      GitBlameAnalyzer.analyzeChanges(file)
    );

    const blameAnalyses = await Promise.all(analysesPromises).then(results =>
      results.filter(
        result => result && !result.startsWith("No changes detected")
      )
    );

    const blameAnalysis = blameAnalyses
      .filter(analysis => analysis)
      .join("\n\n");

    return await this.generateCommitMessage(diff, blameAnalysis);
  },
};

export default AiService;
