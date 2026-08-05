import { Err, ErrFromText, ErrFromUnknown, Ok, type Result } from "lib-result";
import type { GenerateOptions } from "@/cli/types/generateOptions.ts";
import { ERROR_MESSAGES } from "@/lib/constants.ts";
import { Log } from "@/lib/logger.ts";
import type { CommitMessage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import GitService from "@/services/git.ts";
import GitBlameAnalyzer from "@/services/gitBlameAnalyzer.ts";
import { PromptService } from "@/services/prompt.ts";
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

    const hasStagedChanges = await GitService.hasChanges("staged");

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

  /**
   * Generate a commit message from diff + blame context.
   *
   * @param diff         — the git diff to analyze
   * @param blameAnalysis — blame context string
   * @param runOptions   — per-run CLI flag overrides (CLI → AI → provider)
   */
  async generateCommitMessage(
    diff: string,
    blameAnalysis: string,
    runOptions: GenerateOptions = {}
  ): Promise<Result<CommitMessage, Error>> {
    Log.debug(
      `[aiService.generateCommitMessage] ENTRY diff.length=${diff.length}, hasBlame=${!!blameAnalysis}`
    );

    if (!diff) return ErrFromText(ERROR_MESSAGES.noChanges);

    // ConfigService.get already supplies DEFAULT_CONFIG on missing key.
    const maxInputCharsResult = await ConfigService.get(
      "general",
      "maxInputChars"
    );
    if (maxInputCharsResult.isError()) return Err(maxInputCharsResult.error);
    const maxInputChars = maxInputCharsResult.ok;

    const truncatedDiff = this.truncateDiff(diff, maxInputChars);
    Log.debug(
      `[aiService.generateCommitMessage] STEP truncated diff, length=${truncatedDiff.length}`
    );

    const promptResult = await PromptService.buildPrompt(
      truncatedDiff,
      blameAnalysis,
      {
        format: runOptions.format,
        maxLength: runOptions.maxLength,
        language: runOptions.language,
        context: runOptions.context,
      }
    );
    if (promptResult.isError()) return Err(promptResult.error);
    const prompt = promptResult.ok;
    Log.debug(
      `[aiService.generateCommitMessage] STEP prompt generated, length=${prompt.length}`
    );

    // Resolve provider: flag ?? config (config falls back to DEFAULT_CONFIG).
    const providerTypeResult =
      runOptions.provider !== undefined
        ? Ok(runOptions.provider)
        : await ConfigService.get("provider", "type");
    if (providerTypeResult.isError()) return Err(providerTypeResult.error);
    const providerType = providerTypeResult.ok;
    Log.debug(
      `[aiService.generateCommitMessage] STEP provider=${providerType}`
    );

    try {
      const Service = getProviderService(providerType);
      Log.debug(`[aiService.generateCommitMessage] CALL ${Service.name}`);
      // modelOverride is passed to the provider; it resolves via
      // ModelService.resolveModel(modelOverride) which does
      // `modelOverride ?? ConfigService.get("provider", "model")`.
      const commitMessage = await Service.generateCommitMessage(
        prompt,
        1,
        runOptions.model
      );

      Log.debug(
        `[aiService.generateCommitMessage] EXIT message="${commitMessage.message.substring(0, 50)}..."`
      );
      return Ok(commitMessage);
    } catch (error) {
      Log.debug(`[aiService.generateCommitMessage] ERROR ${error}`);
      return ErrFromUnknown(error);
    }
  },

  /**
   * Full orchestration: initialize git, resolve diff mode, run blame, generate.
   * Called by the CLI `generate` subcommand action.
   */
  async generateMessage(
    runOptions: GenerateOptions = {}
  ): Promise<Result<CommitMessage, Error>> {
    Log.debug("[aiService.generateMessage] ENTRY");

    await GitService.initialize();
    Log.debug("[aiService.generateMessage] STEP git initialized");

    const diffModeResult = await this.resolveDiffMode();
    if (diffModeResult.isError()) return Err(diffModeResult.error);

    const diffMode = diffModeResult.ok;
    const useStagedChanges = diffMode === "staged";
    Log.debug(`[aiService.generateMessage] STEP diffMode=${diffMode}`);

    const diffResult = await GitService.getDiff(diffMode);
    if (diffResult.isError()) return Err(diffResult.error);

    const diff = diffResult.ok;
    Log.debug(`[aiService.generateMessage] STEP diff length=${diff.length}`);

    const changedFilesResult = await GitService.getChangedFiles(diffMode);
    if (changedFilesResult.isError()) return Err(changedFilesResult.error);

    const changedFiles = changedFilesResult.ok;
    Log.debug(
      `[aiService.generateMessage] STEP changed files=${changedFiles.length}`
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

    Log.debug(
      `[aiService.generateMessage] STEP blame analyses=${blameAnalysis.length}`
    );

    const result = await this.generateCommitMessage(
      diff,
      blameAnalysis.join("\n\n"),
      runOptions
    );

    if (result.isOk()) {
      Log.debug(
        `[aiService.generateMessage] EXIT success message="${result.ok.message.substring(0, 50)}..."`
      );
    } else {
      Log.debug(
        `[aiService.generateMessage] EXIT error=${result.error.message}`
      );
    }

    return result;
  },
};

export default AiService;
