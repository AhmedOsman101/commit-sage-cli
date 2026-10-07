import { Err, ErrFromText, ErrFromUnknown, Ok, type Result } from "lib-result";
import type { GenerateOptions } from "@/cli/types/generateOptions.ts";
import { DEFAULT_CONFIG, ERROR_MESSAGES } from "@/lib/constants.ts";
import { Log } from "@/lib/logger.ts";
import { sanitizeCommitMessage } from "@/lib/messageSanitizer.ts";
import { splitProviderModel } from "@/lib/modelString.ts";
import {
  countTokens,
  splitDiffByFile,
  truncateDiffByFile,
  truncateToTokens,
} from "@/lib/tokenCounter.ts";
import type { CommitMessage } from "@/lib/types/commit.ts";
import type { RecentCommitsConfig } from "@/lib/types/config.ts";
import ConfigService from "@/services/config.ts";
import GitService from "@/services/git.ts";
import GitBlameAnalyzer, {
  MAX_BLAME_LINES_PER_FILE,
} from "@/services/gitBlameAnalyzer.ts";
import { PromptService } from "@/services/prompt.ts";
import { getProviderService } from "@/services/providerRegistry.ts";

const AiService = {
  async resolveDiffMode(): Promise<Result<"staged" | "unstaged", Error>> {
    const diffStrategyResult = await ConfigService.get(
      "generation",
      "diffStrategy"
    );
    if (diffStrategyResult.isError()) return Err(diffStrategyResult.error);

    const hasStagedChanges = await GitService.hasChanges("staged");

    switch (diffStrategyResult.ok as unknown as string) {
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
          (onlyStagedResult.ok as unknown as boolean) || hasStagedChanges
            ? "staged"
            : "unstaged"
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
    const maxPromptResult = await ConfigService.get(
      "generation",
      "maxPromptTokens"
    );
    if (maxPromptResult.isError()) return Err(maxPromptResult.error);
    const maxPromptTokens = maxPromptResult.ok as unknown as number;

    const formatResult =
      runOptions.format !== undefined
        ? Ok(runOptions.format)
        : await ConfigService.get("commit", "commitFormat");
    if (formatResult.isError()) return Err(formatResult.error);
    const effectiveFormat = formatResult.ok as unknown as string;

    const recentConfigResult = await ConfigService.get(
      "commit",
      "recentCommits"
    );
    const recentConfig = (recentConfigResult.isOk() && recentConfigResult.ok
      ? recentConfigResult.ok
      : DEFAULT_CONFIG.commit.recentCommits) as unknown as RecentCommitsConfig;

    let recentCommits: string[] = [];
    if (effectiveFormat === "previous" || recentConfig.enabled === true) {
      const messagesResult = await GitService.getRecentCommitMessages(
        recentConfig.count,
        recentConfig.scope,
        effectiveFormat === "previous" ? "full" : "subject"
      );
      if (messagesResult.isError()) {
        Log.warning(
          `Could not gather recent commits (${messagesResult.error.message}) — continuing without examples`
        );
      } else {
        recentCommits = messagesResult.ok;
      }
    }

    // Per-file line cap on blame before tokenization, so one huge file
    // cannot eat the whole budget. Warn once when capping kicks in.
    let activeBlame = blameAnalysis;
    if (blameAnalysis) {
      const chunks = blameAnalysis.split("\n\n");
      const capped = chunks.map(chunk => GitBlameAnalyzer.capBlameLines(chunk));
      if (capped.some((chunk, index) => chunk !== chunks[index])) {
        activeBlame = capped.join("\n\n");
        Log.warning(
          `Blame analysis truncated to ${MAX_BLAME_LINES_PER_FILE} lines per file to fit the prompt budget`
        );
      }
    }

    // `maxPromptTokens` budgets the whole prompt (diff + blame +
    // examples), not just the diff. Reduction order on overrun:
    // examples first, then blame, then the diff — one warning each.
    const diffBlocks = splitDiffByFile(diff);
    let activeDiff = diff;
    let activeExamples = recentCommits;

    const buildPromptResult = async (
      diffText: string,
      blameText: string,
      examples: string[]
    ): Promise<Result<string, Error>> => {
      return await PromptService.buildPrompt(diffText, blameText, {
        format: runOptions.format,
        maxLength: runOptions.maxLength,
        language: runOptions.language,
        context: runOptions.context,
        recentCommits: examples,
      });
    };

    let promptResult = await buildPromptResult(
      activeDiff,
      activeBlame,
      activeExamples
    );
    if (promptResult.isError()) return Err(promptResult.error);
    let prompt = promptResult.ok;

    if (countTokens(prompt) > maxPromptTokens) {
      if (activeExamples.length > 0) {
        const dropped = activeExamples.length;
        activeExamples = [];
        Log.warning(
          `Dropped ${dropped} recent commit examples to fit maxPromptTokens budget (${maxPromptTokens} tokens)`
        );
        promptResult = await buildPromptResult(
          activeDiff,
          activeBlame,
          activeExamples
        );
        if (promptResult.isError()) return Err(promptResult.error);
        prompt = promptResult.ok;
      }

      if (countTokens(prompt) > maxPromptTokens && activeBlame) {
        const overhead =
          countTokens(prompt) -
          countTokens(activeDiff) -
          countTokens(activeBlame) -
          countTokens(activeExamples.join("\n"));
        const blameBudget = Math.max(
          0,
          maxPromptTokens -
            overhead -
            countTokens(activeDiff) -
            countTokens(activeExamples.join("\n"))
        );
        const truncatedBlame = truncateToTokens(activeBlame, blameBudget);
        if (truncatedBlame !== activeBlame) {
          activeBlame = truncatedBlame;
          Log.warning(
            `Truncated blame analysis to fit maxPromptTokens budget (${maxPromptTokens} tokens)`
          );
          promptResult = await buildPromptResult(
            activeDiff,
            activeBlame,
            activeExamples
          );
          if (promptResult.isError()) return Err(promptResult.error);
          prompt = promptResult.ok;
        }
      }

      if (countTokens(prompt) > maxPromptTokens) {
        const overhead =
          countTokens(prompt) -
          countTokens(activeDiff) -
          countTokens(activeBlame) -
          countTokens(activeExamples.join("\n"));
        const diffBudget = Math.max(
          0,
          maxPromptTokens -
            overhead -
            countTokens(activeBlame) -
            countTokens(activeExamples.join("\n"))
        );
        const truncatedDiff =
          diffBlocks.length > 0
            ? truncateDiffByFile(diffBlocks, diffBudget)
            : truncateToTokens(activeDiff, diffBudget);
        if (truncatedDiff !== activeDiff) {
          activeDiff = truncatedDiff;
          Log.warning(
            diffBlocks.length > 0
              ? `Truncated diff to fit maxPromptTokens budget (${maxPromptTokens} tokens, ${diffBlocks.length} files preserved)`
              : `Truncated diff to fit maxPromptTokens budget (${maxPromptTokens} tokens)`
          );
          promptResult = await buildPromptResult(
            activeDiff,
            activeBlame,
            activeExamples
          );
          if (promptResult.isError()) return Err(promptResult.error);
          prompt = promptResult.ok;
        }
      }
    }
    Log.debug(
      `[aiService.generateCommitMessage] STEP prompt within budget, length=${prompt.length}`
    );

    // Resolve provider from the effective model string: `--model
    // "provider/model"` flag wins, otherwise the config model string
    // (which falls back to DEFAULT_CONFIG). First slash splits provider
    // from model id; multi-segment ids preserved.
    const effectiveModel = runOptions.model;
    let providerType: string;
    if (effectiveModel !== undefined) {
      const split = splitProviderModel(effectiveModel);
      if (split.isError()) return Err(split.error);
      providerType = split.ok.provider;
    } else {
      const modelResult = await ConfigService.get("model");
      if (modelResult.isError()) return Err(modelResult.error);
      const modelStr = modelResult.ok as unknown as string;
      const split = splitProviderModel(modelStr);
      if (split.isError()) return Err(split.error);
      providerType = split.ok.provider;
    }
    Log.debug(
      `[aiService.generateCommitMessage] STEP provider=${providerType}`
    );

    try {
      const Service = getProviderService(providerType as never);
      Log.debug(`[aiService.generateCommitMessage] CALL ${Service.name}`);
      // modelOverride is the effective "provider/model" string; the provider
      // resolves it via ModelService.resolveModel(modelOverride) which does
      // `modelOverride ?? ConfigService.get("model")`.
      const commitMessage = await Service.generateCommitMessage(
        prompt,
        1,
        effectiveModel
      );

      const sanitized = sanitizeCommitMessage(commitMessage.message);
      Log.debug(
        `[aiService.generateCommitMessage] EXIT message="${sanitized.substring(0, 50)}..."`
      );
      return Ok({ ...commitMessage, message: sanitized });
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
    if (diffResult.isError()) return Err(diffResult.error as Error);

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
    const cappedBlamePaths: string[] = [];
    for (const [index, result] of blameResults.entries()) {
      if (result.isError()) continue;
      const analysis = result.ok;
      if (analysis && !analysis.startsWith("No changes detected")) {
        const capped = GitBlameAnalyzer.capBlameLines(analysis);
        if (capped !== analysis) {
          cappedBlamePaths.push(changedFiles[index] as string);
        }
        blameAnalysis.push(capped);
      }
    }
    if (cappedBlamePaths.length > 0) {
      Log.warning(
        `Blame analysis truncated to ${MAX_BLAME_LINES_PER_FILE} lines per file for: ${cappedBlamePaths.join(", ")}`
      );
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
