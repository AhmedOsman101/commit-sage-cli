const REASONING_TAG_NAMES = [
  "think",
  "thinking",
  "thought",
  "reasoning",
  "reasoning_scratchpad",
].join("|");

function stripPairedReasoningBlocks(message: string): string {
  return message.replace(
    new RegExp(
      `<\\s*(${REASONING_TAG_NAMES})\\b[^>]*>.*?<\\s*/\\s*\\1\\s*>`,
      "gis"
    ),
    ""
  );
}

function stripStrayReasoningTags(message: string): string {
  return message.replace(
    new RegExp(`<\\s*/?\\s*(?:${REASONING_TAG_NAMES})\\b[^>]*>`, "gi"),
    ""
  );
}

function stripFencedBlocks(message: string): string {
  const withoutComplete = message.replace(
    /^[ \t]*```[^`\n]*\n[\s\S]*?^[ \t]*```[ \t]*$/gim,
    ""
  );
  return withoutComplete.replace(/^[ \t]*```[^`\n]*[\s\S]*$/gim, "");
}

function unwrapFences(message: string): string {
  const withoutDelimiters = message.replace(/^[ \t]*```[^`\n]*$/gim, "");
  return withoutDelimiters.replace(/```([^`]*?)```/gs, "$1");
}

function sanitizeCommitMessage(message: string): string {
  const normalized = message.replace(/\r\n/g, "\n");

  const withoutReasoning = stripStrayReasoningTags(
    stripPairedReasoningBlocks(normalized)
  );

  const withoutBlocks = stripFencedBlocks(withoutReasoning);
  const fenced = withoutBlocks.trim()
    ? withoutBlocks
    : unwrapFences(withoutReasoning);

  return fenced.replace(/\n{3,}/g, "\n\n").trim();
}

export { sanitizeCommitMessage };
