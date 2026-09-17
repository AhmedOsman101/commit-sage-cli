import { Err, Ok, type Result } from "lib-result";
import { Log } from "@/lib/logger.ts";
import type { CommitFormat, CommitLanguage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { getTemplate } from "@/templates/index.ts";

/**
 * Options for prompt generation.
 * Each field: `flag ?? config (ConfigService.get already supplies DEFAULT)`.
 * Callers propagate `Result` errors upward — no `unwrap()` here.
 */
type PromptOptions = {
  /** Override `commit.commitFormat`. */
  format?: CommitFormat;
  /** Override `commit.maxLength`. */
  maxLength?: number;
  /** Override `commit.commitLanguage`. */
  language?: CommitLanguage;
  /** AI-only. Injects `## External Context\n<text>` into the prompt. */
  context?: string;
};

/**
 * Build the full prompt that will be sent to the model.
 *
 * Resolution chain for each setting:
 *   `options.X ?? ConfigService.get(...)`
 * (ConfigService.get already falls back to DEFAULT_CONFIG when the user
 * never set the key.)
 */
async function buildPrompt(
  diff: string,
  blameAnalysis: string,
  options: PromptOptions
): Promise<Result<string, Error>> {
  Log.debug(
    `[promptService.buildPrompt] ENTRY diff.length=${diff.length}, blame.length=${blameAnalysis.length}, options=${JSON.stringify(
      options
    )}`
  );

  // ConfigService.get already falls back to DEFAULT_CONFIG[section][key].
  // So no `?? DEFAULT_CONFIG` chain needed — config-or-default in one shot.
  const formatResult =
    options.format !== undefined
      ? Ok(options.format)
      : await ConfigService.get("commit", "commitFormat");
  if (formatResult.isError()) return Err(formatResult.error);

  const languageResult =
    options.language !== undefined
      ? Ok(options.language)
      : await ConfigService.get("commit", "commitLanguage");
  if (languageResult.isError()) return Err(languageResult.error);

  const lengthResult =
    options.maxLength !== undefined
      ? Ok(options.maxLength)
      : await ConfigService.get("commit", "maxLength");
  if (lengthResult.isError()) return Err(lengthResult.error);

  const bodyStyleResult = await ConfigService.get("commit", "bodyStyle");
  if (bodyStyleResult.isError()) return Err(bodyStyleResult.error);

  const format = formatResult.ok as unknown as CommitFormat;
  const rawLanguage = languageResult.ok as unknown as string;
  const language = PromptService.normalizeLanguage(rawLanguage);
  const maxLength = lengthResult.ok as unknown as number;
  const bodyStyle = bodyStyleResult.ok as unknown as
    | "subject-only"
    | "subject-body"
    | "subject-body-footer";

  const languagePrompt = PromptService.getLanguagePrompt(language);
  const template = getTemplate(format, language);
  const blameSection = blameAnalysis.trim()
    ? blameAnalysis
    : "No git blame analysis available.";
  const bodyStylePrompt = PromptService.getBodyStylePrompt(bodyStyle);
  const contextSection = options.context?.trim()
    ? `## Additional Context\n${options.context.trim()}\n\n`
    : "";

  return Ok(`You generate exactly one git commit message.

Rules:
- Output exactly one commit message with its body and nothing else.
- Do not add code fences, labels, explanations, notes, or multiple options.
- Do not mention that you are an AI.
- Do not describe the diff before the answer.
- Do not include surrounding whitespace before or after the commit message.
- If the diff is unclear, still return the single best commit message based on the strongest visible change.
 - The first line must be at most ${maxLength} characters.

Commit format requirements:
${template}

Language requirement:
${languagePrompt}

Output structure requirement:
${bodyStylePrompt}

${contextSection}Use the git blame analysis only as supporting context. Base the commit message primarily on the diff itself.

Git diff to analyze:
${diff}

Git blame analysis:
${blameSection}

Final instruction: return only the commit message.`);
}

/**
 * Alias map for stored-as-given language tags → canonical prompt language.
 * Short codes need no second table: BCP-47 primary subtags (`en-US` → `en`)
 * resolve through the same map, so future languages extend here only.
 */
const LANGUAGE_ALIASES: Record<string, CommitLanguage> = {
  en: "english",
  english: "english",
  ru: "russian",
  russian: "russian",
  zh: "chinese",
  chinese: "chinese",
  ja: "japanese",
  jp: "japanese",
  japanese: "japanese",
};

const PromptService = {
  buildPrompt,

  /**
   * Normalize a stored-as-given language tag (BCP-47) to canonical prompt
   * language. `ja` and `jp` both alias Japanese; region/script subtags are
   * stripped (`en-US` → `en`). Unknown tags warn and fall back to english —
   * the stored value is never rewritten.
   */
  normalizeLanguage(language: string): CommitLanguage {
    const key = language.toLowerCase();
    const direct = LANGUAGE_ALIASES[key];
    if (direct) return direct;
    const primary = key.split(/[-_]/)[0] as string;
    const canonical = LANGUAGE_ALIASES[primary];
    if (canonical) return canonical;
    Log.warning(`Unknown language "${language}", falling back to english`);
    return "english";
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

export type { PromptOptions };
export { PromptService };
