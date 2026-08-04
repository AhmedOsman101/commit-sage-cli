import { Err, ErrFromText, ErrFromUnknown, Ok, type Result } from "lib-result";
import { ERROR_MESSAGES } from "@/lib/constants.ts";
import { logDebug } from "@/lib/logger.ts";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import GitService from "@/services/git.ts";
import GitBlameAnalyzer from "@/services/gitBlameAnalyzer.ts";
import PromptService from "@/services/prompt.ts";
import { getProviderService } from "@/services/providerRegistry.ts";

const AiService = {
  truncateDiff(diff: string, maxInputChars: number): string {
    return diff.length > maxInputChars
      ? `${diff.substring(0, maxInputChars)}\n...(truncated)`
      : diff;
  },

  async resolveDiffMode(): Promise<Result<"staged" | "unstaged", Error>> {
    const diffStrategyResult = await ConfigService.get(
      "general",
      "diffStrategy"
    );
    if (diffStrategyResult.isError()) return Err(diffStrategyResult.error);

    const hasStagedChanges = GitService.hasChanges("staged");

    switch (diffStrategyResult.ok) {
      case "staged":
        return Ok("staged");
      case "unstaged":
        return Ok("unstaged");
      default: {
        const onlyStagedResult = await ConfigService.get(
          "commit",
          "onlyStagedChanges"
        );
        if (onlyStagedResult.isError()) return Err(onlyStagedResult.error);

        return Ok(
          onlyStagedResult.ok || hasStagedChanges ? "staged" : "unstaged"
        );
      }
    }
  },

  async generateCommitMessage(
    diff: string,
    blameAnalysis: string
  ): Promise<Result<CommitMessage, Error>> {
    logDebug(
      `[aiService.generateCommitMessage] ENTRY diff.length=${diff.length}, hasBlame=${!!blameAnalysis}`
    );

    if (!diff) return ErrFromText(ERROR_MESSAGES.noChanges);

    const maxInputCharsResult = await ConfigService.get(
      "general",
      "maxInputChars"
    );
    if (maxInputCharsResult.isError()) return Err(maxInputCharsResult.error);

    const truncatedDiff = this.truncateDiff(diff, maxInputCharsResult.ok);
    logDebug(
      `[aiService.generateCommitMessage] STEP truncated diff, length=${truncatedDiff.length}`
    );

    const prompt = await PromptService.generatePrompt(
      truncatedDiff,
      blameAnalysis
    );
    logDebug(
      `[aiService.generateCommitMessage] STEP prompt generated, length=${prompt.length}`
    );

    const providerResult = await ConfigService.get("provider", "type");
    if (providerResult.isError()) return Err(providerResult.error);

    const providerType = providerResult.ok;
    logDebug(`[aiService.generateCommitMessage] STEP provider=${providerType}`);

    try {
      const Service = getProviderService(providerType);
      logDebug(`[aiService.generateCommitMessage] CALL ${Service.name}`);
      const commitMessage = await Service.generateCommitMessage(prompt, 1);

      logDebug(
        `[aiService.generateCommitMessage] EXIT message="${commitMessage.message.substring(0, 50)}..."`
      );
      return Ok(commitMessage);
    } catch (error) {
      logDebug(`[aiService.generateCommitMessage] ERROR ${error}`);
      return ErrFromUnknown(error);
    }
  },
  async generateAndApplyMessage(): Promise<Result<CommitMessage, Error>> {
    logDebug("[aiService.generateAndApplyMessage] ENTRY");

    GitService.initialize();
    logDebug("[aiService.generateAndApplyMessage] STEP git initialized");

    const diffModeResult = await this.resolveDiffMode();
    if (diffModeResult.isError()) return Err(diffModeResult.error);

    const diffMode = diffModeResult.ok;
    const useStagedChanges = diffMode === "staged";
    logDebug(`[aiService.generateAndApplyMessage] STEP diffMode=${diffMode}`);

    const diffResult = await GitService.getDiff(diffMode);
    if (diffResult.isError()) return Err(diffResult.error);

    const diff = diffResult.ok;
    logDebug(
      `[aiService.generateAndApplyMessage] STEP diff length=${diff.length}`
    );

    const changedFilesResult = GitService.getChangedFiles(diffMode);
    if (changedFilesResult.isError()) return Err(changedFilesResult.error);

    const changedFiles = changedFilesResult.ok;
    logDebug(
      `[aiService.generateAndApplyMessage] STEP changed files=${changedFiles.length}`
    );

    const analysesPromises = changedFiles.map(file =>
      GitBlameAnalyzer.analyzeChanges(file, useStagedChanges)
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

    logDebug(
      `[aiService.generateAndApplyMessage] STEP blame analyses=${blameAnalysis.length}`
    );

    const result = await this.generateCommitMessage(
      diff,
      blameAnalysis.join("\n\n")
    );

    if (result.isOk()) {
      logDebug(
        `[aiService.generateAndApplyMessage] EXIT success message="${result.ok.message.substring(0, 50)}..."`
      );
    } else {
      logDebug(
        `[aiService.generateAndApplyMessage] EXIT error=${result.error.message}`
      );
    }

    return result;
  },
};

export default AiService;
