import type { CommitLanguage } from "@/lib/configServiceTypes.d.ts";
import { logDebug } from "@/lib/logger.ts";
import { getTemplate } from "@/templates/index.ts";
import ConfigService from "./configService.ts";

const PromptService = {
  async generatePrompt(diff: string, blameAnalysis: string): Promise<string> {
    logDebug(
      `[promptService.generatePrompt] ENTRY diff.length=${diff.length}, blame.length=${blameAnalysis.length}`
    );
    const format = await ConfigService.get("commit", "commitFormat").then(
      result => result.unwrap()
    );

    const commitLanguage = await ConfigService.get(
      "commit",
      "commitLanguage"
    ).then(result => result.unwrap());

    const languagePrompt = PromptService.getLanguagePrompt(commitLanguage);
    const template = getTemplate(format, commitLanguage);
    const blameSection = blameAnalysis.trim()
      ? blameAnalysis
      : "No git blame analysis available.";

    return `You generate exactly one git commit message.

Rules:
- Output exactly one commit message with its body and nothing else.
- Do not add code fences, labels, explanations, notes, or multiple options.
- Do not mention that you are an AI.
- Do not describe the diff before the answer.
- Do not include surrounding whitespace before or after the commit message.
- If the diff is unclear, still return the single best commit message based on the strongest visible change.

Commit format requirements:
${template}

Language requirement:
${languagePrompt}

Use the git blame analysis only as supporting context. Base the commit message primarily on the diff itself.

Git diff to analyze:
${diff}

Git blame analysis:
${blameSection}

Final instruction: return only the commit message.`;
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
