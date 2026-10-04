const REASONING_TAG_NAMES = [
  "think",
  "thinking",
  "thought",
  "reasoning",
  "reasoning_scratchpad",
].join("|");

function sanitizeCommitMessage(message: string): string {
  const normalized = message.replace(/\r\n/g, "\n");

  const withoutPaired = normalized.replace(
    new RegExp(
      `<\\s*(${REASONING_TAG_NAMES})\\b[^>]*>.*?<\\s*/\\s*\\1\\s*>`,
      "gis"
    ),
    ""
  );

  const withoutStrays = withoutPaired.replace(
    new RegExp(`<\\s*/?\\s*(?:${REASONING_TAG_NAMES})\\b[^>]*>`, "gi"),
    ""
  );

  const withoutFences = withoutStrays.replace(/^```[a-zA-Z]*\s*$/gm, "");

  const collapsed = withoutFences.replace(/\n{3,}/g, "\n\n");

  return collapsed.trim();
}

export { sanitizeCommitMessage };
