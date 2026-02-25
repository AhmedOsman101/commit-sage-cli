export function stripThinkingTags(text: string): string {
  if (!text) return text;

  let result = text;

  // Strip thinking tags
  result = result.replace(/<thinking>[\s\S]*?<\/thinking>/gim, "");
  result = result.replace(/<tool_thinking>[\s\S]*?<\/tool_thinking>/gim, "");

  // Strip standalone closing tags that might remain
  result = result.replace(/<\/ ?think[a-z_]*>/gi, "");
  result = result.replace(/< ?think[a-z_]*>/gi, "");

  // Strip 【 Analysis 】tags
  result = result.replace(/【[\s\S]*?】/g, "");

  // Clean up multiple newlines and leading whitespace
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.trim();

  return result;
}
