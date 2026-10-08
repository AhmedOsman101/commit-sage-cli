import { Log } from "@/lib/logger.ts";
import {
  type CommitFormat,
  type CommitLanguage,
  SUPPORTED_LANGUAGES,
} from "@/lib/types/commit.ts";
import { angularTemplate } from "@/templates/formats/angular.ts";
import { atomTemplate } from "@/templates/formats/atom.ts";
import { conventionalTemplate } from "@/templates/formats/conventional.ts";
import { detailedTemplate } from "@/templates/formats/detailed.ts";
import { emojiTemplate } from "@/templates/formats/emoji.ts";
import { emojiKarmaTemplate } from "@/templates/formats/emojiKarma.ts";
import { freeformTemplate } from "@/templates/formats/freeform.ts";
import { googleTemplate } from "@/templates/formats/google.ts";
import { karmaTemplate } from "@/templates/formats/karma.ts";
import { semanticTemplate } from "@/templates/formats/semantic.ts";

type CommitTemplate = Record<CommitLanguage, string>;

const templates: Record<Exclude<CommitFormat, "previous">, CommitTemplate> = {
  conventional: conventionalTemplate,
  angular: angularTemplate,
  karma: karmaTemplate,
  semantic: semanticTemplate,
  emoji: emojiTemplate,
  freeform: freeformTemplate,
  emojiKarma: emojiKarmaTemplate,
  google: googleTemplate,
  atom: atomTemplate,
  detailed: detailedTemplate,
} as const;

const isValidFormat = (format: string): format is CommitFormat =>
  format === "previous" || Object.keys(templates).includes(format);

const isValidLanguage = (language: string): language is CommitLanguage =>
  (SUPPORTED_LANGUAGES as readonly string[]).includes(language);

function getTemplate(format: CommitFormat, language: CommitLanguage): string {
  let template: CommitTemplate;

  if (format === "previous") {
    template = templates.conventional;
  } else if (!isValidFormat(format)) {
    Log.warning(`Invalid format "${format}", falling back to conventional`);
    template = templates.conventional;
  } else template = templates[format];

  if (!isValidLanguage(language)) {
    Log.warning(`Invalid language "${language}", falling back to english`);
    return template.english;
  }

  const resolved = template[language];
  if (resolved === undefined) {
    Log.warning(
      `Missing "${language}" template for this format, falling back to english`
    );
    return template.english;
  }

  return resolved;
}

export { getTemplate };
