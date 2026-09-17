import { decode, encode } from "gpt-tokenizer/encoding/o200k_base";

// Single-encoding token counting for prompt truncation.
//
// `o200k_base` matches the default model family (`openai/gpt-5-*`) and is a
// close-enough approximation for other providers — truncation only needs to
// keep the diff roughly within the model's window, not exact per-model
// counts. The slim `gpt-tokenizer/encoding/*` subpath import keeps exactly
// one BPE rank table in the `deno compile` bundle instead of all encodings.

function countTokens(text: string): number {
  return encode(text).length;
}

const TRUNCATION_MARKER = "\n...(truncated)";
const MARKER_TOKENS = countTokens(TRUNCATION_MARKER);

function truncateToTokens(text: string, maxTokens: number): string {
  const tokens = encode(text);
  if (tokens.length <= maxTokens) return text;
  // Reserve marker budget up front so the result never exceeds maxTokens.
  if (maxTokens <= MARKER_TOKENS) return decode(tokens.slice(0, maxTokens));
  return `${decode(tokens.slice(0, maxTokens - MARKER_TOKENS))}${TRUNCATION_MARKER}`;
}

export { countTokens, truncateToTokens };
