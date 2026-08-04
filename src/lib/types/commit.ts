const SUPPORTED_LANGUAGES = [
  "english",
  "russian",
  "chinese",
  "japanese",
] as const;
type CommitLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Commit message format types
const COMMIT_FORMATS = [
  "conventional",
  "angular",
  "karma",
  "emoji",
  "semantic",
  "freeform",
] as const;

type CommitFormat = (typeof COMMIT_FORMATS)[number];

type CommitMessage = {
  message: string;
  model: string;
};

export type { CommitFormat, CommitLanguage, CommitMessage };
export { COMMIT_FORMATS, SUPPORTED_LANGUAGES };
