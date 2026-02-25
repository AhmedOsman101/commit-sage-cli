import { Err, ErrFromText, ErrFromUnknown, Ok, type Result } from "lib-result";
import { ERROR_MESSAGES } from "@/lib/constants.ts";
import type { CommitMessage } from "@/lib/index.d.ts";
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
  ): Promise<Result<CommitMessage, Error>> {
    if (!diff) return ErrFromText(ERROR_MESSAGES.noChanges);

    const truncatedDiff = this.truncateDiff(diff);
    const prompt = await PromptService.generatePrompt(
      truncatedDiff,
      blameAnalysis
    );

    const providerResult = await ConfigService.get("provider", "type");
    if (providerResult.isError()) return Err(providerResult.error);

    const provider = providerResult.ok;

    try {
      let commitMessage: CommitMessage;

      switch (provider) {
        case "openai":
          commitMessage = await OpenAiService.generateCommitMessage(prompt);
          break;
        case "ollama":
          commitMessage = await OllamaService.generateCommitMessage(prompt);
          break;
        // biome-ignore lint/complexity/noUselessSwitchCase: Verbosity is better
        case "gemini":
        default:
          commitMessage = await GeminiService.generateCommitMessage(prompt);
      }

      return Ok(commitMessage);
    } catch (error) {
      return ErrFromUnknown(error);
    }
  },
  async generateAndApplyMessage(): Promise<Result<CommitMessage, Error>> {
    GitService.initialize();

    const onlyStagedResult = await ConfigService.get(
      "commit",
      "onlyStagedChanges"
    );
    if (onlyStagedResult.isError()) return Err(onlyStagedResult.error);

    const onlyStagedSetting = onlyStagedResult.ok;
    const hasStagedChanges = GitService.hasChanges("staged");

    const useStagedChanges = onlyStagedSetting || hasStagedChanges;

    const diffResult = await GitService.getDiff(useStagedChanges);
    if (diffResult.isError()) return Err(diffResult.error);

    const diff = diffResult.ok;

    const changedFilesResult = GitService.getChangedFiles(useStagedChanges);
    if (changedFilesResult.isError()) return Err(changedFilesResult.error);

    const changedFiles = changedFilesResult.ok;

    const analysesPromises = changedFiles.map(file =>
      GitBlameAnalyzer.analyzeChanges(file)
    );

    const blameResults = await Promise.all(analysesPromises);

    const blameAnalysis: string[] = [];
    for (const result of blameResults) {
      if (result.isError()) continue;
      const analysis = result.ok;
      if (analysis && !analysis.startsWith("No changes detected")) {
        blameAnalysis.push(analysis);
      }
    }

    return await this.generateCommitMessage(diff, blameAnalysis.join("\n\n"));
  },
};

export default AiService;
