import { Err, Ok, type Result } from "lib-result";
import { selectFormatsToTranslate } from "@/cli/prompts.ts";
import { LanguageTranslationDeclinedError } from "@/lib/errors.ts";
import { Log } from "@/lib/logger.ts";
import type { CommitFormat, CommitLanguage } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { CustomInstructionsService } from "@/services/customInstructions.ts";
import { TemplateTranslationService } from "@/services/templateTranslation.ts";
import TranslationsService from "@/services/translations.ts";
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
  /** Recent commit examples injected as `## Recent commit examples`. */
  recentCommits?: string[];
  /**
   * Override `commit.bodyStyle`. Only a future CLI flag would set this;
   * `previous` skips the config value unless this is present.
   */
  bodyStyle?: "subject-only" | "subject-body" | "subject-body-footer";
};

/**
 * Formats whose instructions can be translated. `previous` is excluded: it
 * has no template of its own (it defers to recent examples), so there is
 * nothing to translate.
 */
const TRANSLATABLE_FORMATS: readonly CommitFormat[] = [
  "conventional",
  "angular",
  "karma",
  "semantic",
  "emoji",
  "freeform",
  "emojiKarma",
  "google",
  "atom",
  "detailed",
];

/**
 * Translate and cache whichever formats the user ticks, then return the
 * requested one.
 *
 * Returns `Err(LanguageTranslationDeclinedError)` when the user declines,
 * cancels, or the run is non-TTY — all three are declines (ADR 003). The
 * caller turns that sentinel into warn + exit 0.
 */
async function resolveCustomLanguageTemplate(
  language: string,
  format: CommitFormat
): Promise<Result<string>> {
  // Non-TTY counts as declined: exit 0 rather than hang or fail. The
  // sentinel carries the user-facing message; the CLI warns once.
  if (!Deno.stdin.isTerminal()) {
    return Err(
      new LanguageTranslationDeclinedError(
        language,
        "this run is not interactive. Set a native language, or re-run in a terminal to translate it."
      )
    );
  }

  // `previous` has no template of its own; it falls back to conventional
  // both here and in getTemplate, so translate and cache conventional.
  const requested = format === "previous" ? "conventional" : format;
  const candidates = TRANSLATABLE_FORMATS.filter(
    candidate => candidate !== requested
  );
  const selection = await selectFormatsToTranslate(
    [requested, ...candidates],
    requested
  );

  // Cancelled (or nothing ticked) is a decline.
  if (selection === null || selection.length === 0) {
    return Err(
      new LanguageTranslationDeclinedError(
        language,
        "no formats were selected."
      )
    );
  }

  // Fill the cache for everything ticked, in the requested format first so a
  // later failure still leaves the run with what it needs.
  const ordered = [
    requested,
    ...selection.filter(candidate => candidate !== requested),
  ];
  let requestedTemplate: string | null = null;

  for (const target of ordered as CommitFormat[]) {
    const cached = await TranslationsService.getCachedTemplate(
      language,
      target
    );
    if (cached !== null) {
      if (target === requested) requestedTemplate = cached;
      continue;
    }

    const translated = await TemplateTranslationService.translateFormatTemplate(
      language,
      target
    );
    if (translated.isError()) return Err(translated.error);

    const saved = await TranslationsService.saveCachedTemplate(
      language,
      target,
      translated.ok
    );
    if (saved.isError()) return Err(saved.error);

    if (target === requested) requestedTemplate = translated.ok;
  }

  if (requestedTemplate === null) {
    return Err(
      new Error(
        `Could not resolve the "${requested}" format instructions in "${language}".`
      )
    );
  }

  return Ok(requestedTemplate);
}

/**
 * Build the full prompt that will be sent to the model.
 *
 * Resolution chain for each setting:
 *   `options.X ?? ConfigService.get(...)`
 * (ConfigService.get already falls back to DEFAULT_CONFIG when the user
 * never set the key.)
 *
 * `commitLanguage` resolves in three steps (ADR 003):
 *   1. native template (english, russian, …) → used directly
 *   2. cached `[language][format]` entry in translations.json → used silently
 *   3. neither → offer to translate once; decline or non-TTY surfaces as
 *      `LanguageTranslationDeclinedError` and the caller exits 0.
 *
 * Memoized on `language|format` because the token-budget trim loop rebuilds
 * this prompt up to four times per run — without it, one run could prompt
 * and pay for the same translation several times over.
 */
const templateMemo = new Map<string, Promise<Result<string>>>();

async function resolveTemplate(
  format: CommitFormat,
  rawLanguage: string
): Promise<Result<string>> {
  const native = PromptService.normalizeLanguage(rawLanguage);
  if (native !== null) return Ok(getTemplate(format, native));

  // Custom language: cache first (silent), then offer to translate.
  const effectiveFormat = format === "previous" ? "conventional" : format;
  const memoKey = `${rawLanguage}|${effectiveFormat}`;
  const memoized = templateMemo.get(memoKey);
  if (memoized !== undefined) return await memoized;

  const pending = (async (): Promise<Result<string>> => {
    const cached = await TranslationsService.getCachedTemplate(
      rawLanguage,
      effectiveFormat
    );
    if (cached !== null) {
      Log.debug(
        `[prompt] Using cached translation ${rawLanguage}/${effectiveFormat}`
      );
      return Ok(cached);
    }
    return await resolveCustomLanguageTemplate(rawLanguage, effectiveFormat);
  })();

  // Cache rejections too: a decline must not re-prompt within the same run.
  templateMemo.set(memoKey, pending);
  return await pending;
}

/**
 * Build the full prompt that will be sent to the model.
 *
 * Resolution chain for each setting:
 *   `options.X ?? ConfigService.get(...)`
 * (ConfigService.get already falls back to DEFAULT_CONFIG when the user
 * never set the key.)
 *
 * `commitLanguage` resolves in three steps (ADR 003):
 *   1. native template (english, russian, …) → used directly
 *   2. cached `[language][format]` entry in translations.json → used silently
 *   3. neither → offer to translate once; decline or non-TTY surfaces as
 *      `LanguageTranslationDeclinedError` and the caller exits 0.
 *
 * Memoized on `language|format` because the token-budget trim loop rebuilds
 * this prompt up to four times per run — without it, one run could prompt
 * and pay for the same translation several times over.
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

  const bodyStyleResult =
    options.bodyStyle !== undefined
      ? Ok(options.bodyStyle)
      : formatResult.ok === "previous"
        ? Ok(null)
        : await ConfigService.get("commit", "bodyStyle");
  if (bodyStyleResult.isError()) return Err(bodyStyleResult.error);

  const format = formatResult.ok as unknown as CommitFormat;
  const rawLanguage = languageResult.ok as unknown as string;
  const language = PromptService.normalizeLanguage(rawLanguage);
  const maxLength = lengthResult.ok as unknown as number;

  // Custom language: native → cache → offer-to-translate. Declines surface
  // as LanguageTranslationDeclinedError for the CLI to turn into exit 0.
  const templateResult = await resolveTemplate(format, rawLanguage);
  if (templateResult.isError()) return Err(templateResult.error);
  const template = templateResult.ok;

  const instructionsResult = await ConfigService.get(
    "commit",
    "customInstructions"
  );
  if (instructionsResult.isError()) return Err(instructionsResult.error);
  const customInstructions =
    await CustomInstructionsService.resolveCustomInstructions(
      instructionsResult.ok as unknown as string
    );
  if (customInstructions.isError()) return Err(customInstructions.error);
  const bodyStyle = bodyStyleResult.ok as unknown as
    | "subject-only"
    | "subject-body"
    | "subject-body-footer"
    | null;

  const languagePrompt = PromptService.getLanguagePrompt(language, rawLanguage);
  const blameSection = blameAnalysis.trim()
    ? blameAnalysis
    : "No git blame analysis available.";
  const bodyStylePrompt =
    bodyStyle === null
      ? "Match the structure of the recent examples: include a body only when the examples typically do, and a footer only when the examples typically do."
      : PromptService.getBodyStylePrompt(bodyStyle);
  const contextSection = options.context?.trim()
    ? `## Additional Context\n${options.context.trim()}\n\n`
    : "";
  // Standing user guidance, rendered for every format. Empty string ⇒ the
  // section is omitted entirely, so the default config costs nothing.
  const instructionsSection = customInstructions.ok
    ? `## Custom Instructions\n${customInstructions.ok}\n\n`
    : "";
  const recentCommits = options.recentCommits ?? [];
  if (format === "previous" && recentCommits.length === 0) {
    Log.warning(
      "No recent commit examples found, falling back to conventional format"
    );
  }
  const examplesSection =
    recentCommits.length === 0
      ? ""
      : format === "previous"
        ? `## Recent commit examples\nMimic the style of these recent commit messages, including whether they use a body or footer.\n\n${recentCommits.map((message, index) => `${index + 1}.\n~~~\n${message}\n~~~`).join("\n\n")}\n\n`
        : `## Recent commit examples\n${recentCommits.map(message => `- ${message}`).join("\n")}\n\n`;

  return Ok(`You generate exactly one git commit message.

Rules:
- Say nothing but the commit message in plain text.
- Output the commit message exactly once. Never repeat it, echo it, or output a second copy in any form — not in a code fence, not as a quote, not at all.
- Do not add code fences, labels, explanations, notes, or multiple options.
- Do not mention that you are an AI.
- Do not describe the diff before the answer.
- Do not include surrounding whitespace before or after the commit message.
- If the diff is unclear, still return the single best commit message based on the strongest visible change.
 - The first line must be at most ${maxLength} characters.

Commit format requirements:
${template}
${instructionsSection}
Language requirement:
${languagePrompt}

Output structure requirement:
${bodyStylePrompt}

${contextSection}Use the git blame analysis only as supporting context. Base the commit message primarily on the diff itself.

Git diff to analyze:
${diff}

Git blame analysis:
${blameSection}

${examplesSection}Final instruction: return only the commit message, a single time, and then stop. No second copy.`);
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
  de: "german",
  german: "german",
  deutsch: "german",
  fr: "french",
  french: "french",
  francais: "french",
};

const PromptService = {
  buildPrompt,

  /**
   * Map a stored-as-given language tag (BCP-47) to a canonical native
   * language, or `null` when the tag names no native template.
   *
   * `ja` and `jp` both alias Japanese; region/script subtags are stripped
   * (`en-US` → `en`). A `null` is not a failure: it routes the run into the
   * custom-language flow (cache → offer to translate) per ADR 003, which is
   * why this no longer warns and falls back to english. The stored value is
   * never rewritten either way.
   */
  normalizeLanguage(language: string): CommitLanguage | null {
    const key = language.toLowerCase();
    const direct = LANGUAGE_ALIASES[key];
    if (direct) return direct;
    const primary = key.split(/[-_]/)[0] as string;
    return LANGUAGE_ALIASES[primary] ?? null;
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

  getLanguagePrompt(
    language: CommitLanguage | null,
    rawLanguage?: string
  ): string {
    switch (language) {
      case "russian":
        return "Пожалуйста, напиши сообщение коммита на русском языке.";
      case "chinese":
        return "请用中文写提交信息。";
      case "japanese":
        return "コミットメッセージを日本語で書いてください。";
      case "german":
        return "Bitte schreibe die Commit-Nachricht auf Deutsch.";
      case "french":
        return "Veuillez rédiger le message de commit en français.";
      default:
        // Custom language: the format template is translated, so ask for the
        // message itself in the same language by name.
        return rawLanguage
          ? `Please write the commit message in ${rawLanguage}.`
          : "Please write the commit message in English.";
    }
  },
};

export type { PromptOptions };
export { PromptService };
