import { ErrFromText, Ok, type Result } from "lib-result";

function splitProviderModel(
  s: string
): Result<{ provider: string; model: string }> {
  const i = s.indexOf("/");
  if (i <= 0 || i === s.length - 1) {
    return ErrFromText(`Invalid model "${s}": expected "provider/model"`);
  }
  return Ok({ provider: s.slice(0, i), model: s.slice(i + 1) });
}

export { splitProviderModel };
