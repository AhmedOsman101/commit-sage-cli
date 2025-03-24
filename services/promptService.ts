import ConfigService from "./configService.ts";

const PromptService = {
  generatePrompt(diff: string, blameAnalysis: string): string {
    const useCustomInstructions = ConfigService.useCustomInstructions();
    const customInstructions = ConfigService.getCustomInstructions();

    if (useCustomInstructions && customInstructions.trim()) {
      return `${customInstructions}

Git diff to analyze:
${diff}

Git blame analysis:
${blameAnalysis}

Please provide ONLY the commit message, without any additional text or explanations.`;
    }

    const format = ConfigService.getCommitFormat() as CommitFormat;
    const commitLanguage = ConfigService.getCommitLanguage() as CommitLanguage;
    const languagePrompt = PromptService.getLanguagePrompt(commitLanguage);
    const template = getTemplate(format, commitLanguage);

    return `${template}

${languagePrompt}

Git diff to analyze:
${diff}

Git blame analysis:
${blameAnalysis}

Please provide ONLY the commit message, without any additional text or explanations.`;
  },
};

export default PromptService;
