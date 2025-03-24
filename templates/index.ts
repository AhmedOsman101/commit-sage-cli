import type { CommitLanguage } from "../services/configService.ts";
import { logWarning } from "../utils/Logger.ts";
import { angularTemplate } from "./formats/angular.ts";
import { conventionalTemplate } from "./formats/conventional.ts";
import { emojiTemplate } from "./formats/emoji.ts";
import { karmaTemplate } from "./formats/karma.ts";
import { semanticTemplate } from "./formats/semantic.ts";

export type CommitTemplate = {
  english: string;
  russian: string;
  chinese: string;
  japanese: string;
};

export type CommitFormat =
  | "conventional"
  | "angular"
  | "karma"
  | "semantic"
  | "emoji";

const SUPPORTED_LANGUAGES = [
  "english",
  "russian",
  "chinese",
  "japanese",
] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const templates: Record<CommitFormat, CommitTemplate> = {
  conventional: conventionalTemplate,
  angular: angularTemplate,
  karma: karmaTemplate,
  semantic: semanticTemplate,
  emoji: emojiTemplate,
} as const;

const isValidFormat = (format: string): format is CommitFormat =>
  Object.keys(templates).includes(format);

const isValidLanguage = (language: string): language is SupportedLanguage =>
  SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);

export function getTemplate(
  format: CommitFormat,
  language: CommitLanguage
): string {
  if (!isValidFormat(format)) {
    logWarning(`Invalid format "${format}", falling back to conventional`);
    format = "conventional";
  }

  const template = templates[format];

  if (!isValidLanguage(language)) {
    console.warn(`Invalid language "${language}", falling back to english`);
    return template.english;
  }

  return template[language];
}
