import type { CommitLanguage } from "../lib/configServiceTypes.d.ts";
import { getTemplate } from "../templates/index.ts";
import ConfigService from "./configService.ts";

const PromptService = {
  async generatePrompt(diff: string, blameAnalysis: string): Promise<string> {
    const format = await ConfigService.get("commit", "commitFormat").then(
      result => result.unwrap()
    );

    const commitLanguage = await ConfigService.get(
      "commit",
      "commitLanguage"
    ).then(result => result.unwrap());

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
  getLanguagePrompt(language: CommitLanguage): string {
    switch (language) {
      case "russian":
        return "Пожалуйста, напиши сообщение коммита на русском языке.";
      case "chinese":
        return "请用中文写提交信息。";
      case "japanese":
        return "コミットメッセージを日本語で書いてください。";
      default:
        return "Please write the commit message in English.";
    }
  },
};

export default PromptService;
