import { logWarning } from "@/lib/logger.ts";
import {
  type CommitFormat,
  type CommitLanguage,
  SUPPORTED_LANGUAGES,
} from "@/lib/types/commit.ts";
import { angularTemplate } from "@/templates/formats/angular.ts";
import { conventionalTemplate } from "@/templates/formats/conventional.ts";
import { emojiTemplate } from "@/templates/formats/emoji.ts";
import { freeformTemplate } from "@/templates/formats/freeform.ts";
import { karmaTemplate } from "@/templates/formats/karma.ts";
import { semanticTemplate } from "@/templates/formats/semantic.ts";

type CommitTemplate = Record<CommitLanguage, string>;

const templates: Record<CommitFormat, CommitTemplate> = {
  conventional: conventionalTemplate,
  angular: angularTemplate,
  karma: karmaTemplate,
  semantic: semanticTemplate,
  emoji: emojiTemplate,
  freeform: freeformTemplate,
} as const;

const isValidFormat = (format: string): format is CommitFormat =>
  Object.keys(templates).includes(format);

const isValidLanguage = (language: string): language is CommitLanguage =>
  SUPPORTED_LANGUAGES.includes(language as CommitLanguage);

function getTemplate(format: CommitFormat, language: CommitLanguage): string {
  let template: CommitTemplate;

  if (!isValidFormat(format)) {
    logWarning(`Invalid format "${format}", falling back to conventional`);
    template = templates.conventional;
  } else template = templates[format];

  if (!isValidLanguage(language)) {
    logWarning(`Invalid language "${language}", falling back to english`);
    return template.english;
  }

  return template[language];
}

export { getTemplate };
