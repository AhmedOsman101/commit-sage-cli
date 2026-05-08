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
    const maxSubjectLength = await ConfigService.get(
      "commit",
      "maxSubjectLength"
    ).then(r => r.unwrap());
    const bodyStyle = await ConfigService.get("commit", "bodyStyle").then(r =>
      r.unwrap()
    );

    const languagePrompt = PromptService.getLanguagePrompt(commitLanguage);
    const template = getTemplate(format, commitLanguage);
    const blameSection = blameAnalysis.trim()
      ? blameAnalysis
      : "No git blame analysis available.";
    const bodyStylePrompt = PromptService.getBodyStylePrompt(bodyStyle);

    return `You generate exactly one git commit message.

Rules:
- Output exactly one commit message with its body and nothing else.
- Do not add code fences, labels, explanations, notes, or multiple options.
- Do not mention that you are an AI.
- Do not describe the diff before the answer.
- Do not include surrounding whitespace before or after the commit message.
- If the diff is unclear, still return the single best commit message based on the strongest visible change.
- The first line must be at most ${maxSubjectLength} characters.

Commit format requirements:
${template}

Language requirement:
${languagePrompt}

Output structure requirement:
${bodyStylePrompt}

Use the git blame analysis only as supporting context. Base the commit message primarily on the diff itself.

Git diff to analyze:
${diff}

Git blame analysis:
${blameSection}

Final instruction: return only the commit message.`;
  },

  getBodyStylePrompt(
    bodyStyle: "subject-only" | "subject-body" | "subject-body-footer"
  ): string {
    switch (bodyStyle) {
      case "subject-body":
        return "Return a subject line, then one blank line, then a short body. Do not include a footer.";
      case "subject-body-footer":
        return "Return a subject line, then one blank line, then a short body. Add a footer only when the diff clearly needs one, such as an issue reference or breaking change note.";
      default:
        return "Return only a single subject line. Do not include a body or footer.";
    }
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
