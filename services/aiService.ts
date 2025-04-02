import { errorMessages } from "../utils/constants.ts";
import { logError } from "../utils/Logger.ts";
import ConfigService from "./configService.ts";
import GitBlameAnalyzer from "./gitBlameAnalyzer.ts";
import GitService from "./gitService.ts";
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
    if (!diff) {
      throw new Error(errorMessages.noChanges);
    }

    const truncatedDiff = this.truncateDiff(diff);
    const prompt = PromptService.generatePrompt(truncatedDiff, blameAnalysis);

    try {
      const provider = ConfigService.get("provider", "type");
      let result: CommitMessage;
      switch (provider) {
        case "openai":
          result = await OpenAIService.generateCommitMessage(prompt);
          break;
        case "codestral":
          result = await CodestralService.generateCommitMessage(prompt);
          break;
        case "ollama":
          result = await OllamaService.generateCommitMessage(prompt);
          break;
        default:
          result = await GeminiService.generateCommitMessage(prompt);
          break;
      }
      return result;
    } catch (error) {
      void logError("Failed to generate commit message:", error as Error);

      throw error;
    }
  },
  async generateAndApplyMessage() {
    await GitService.initialize();
    const onlyStagedSetting = ConfigService.get("commit", "onlyStagedChanges");
    const hasStagedChanges = await GitService.hasChanges("staged");

    const useStagedChanges = onlyStagedSetting || hasStagedChanges;

    const diff = await GitService.getDiff(useStagedChanges);
    if (!diff) logError("No changes to commit");

    const changedFiles = await GitService.getChangedFiles(useStagedChanges);
    const blameAnalyses = await Promise.all(
      changedFiles.map(file => GitBlameAnalyzer.analyzeChanges(file))
    );
    const blameAnalysis = blameAnalyses
      .filter(analysis => analysis)
      .join("\n\n");

    const commitMessage = await this.generateCommitMessage(diff, blameAnalysis);
  },
};

export default AiService;
