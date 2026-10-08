const SUPPORTED_LANGUAGES = [
  "english",
  "russian",
  "chinese",
  "japanese",
  "german",
  "french",
] as const;
/**
 * Canonical display set for help text and template keys. Config V2 stores
 * `commit.commitLanguage` as-given (BCP-47: `en`, `en-US`, `jp`, …), so the
 * type stays open — `PromptService.normalizeLanguage` maps stored values to
 * canonical internally.
 */
type CommitLanguage = (typeof SUPPORTED_LANGUAGES)[number] | (string & {});

// Commit message format types
const COMMIT_FORMATS = [
  "conventional",
  "angular",
  "karma",
  "emoji",
  "semantic",
  "freeform",
  "emojiKarma",
  "google",
  "atom",
  "detailed",
  "previous",
] as const;

type CommitFormat = (typeof COMMIT_FORMATS)[number];

type CommitMessage = {
  message: string;
  model: string;
};

export type { CommitFormat, CommitLanguage, CommitMessage };
export { COMMIT_FORMATS, SUPPORTED_LANGUAGES };
