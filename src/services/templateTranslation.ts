import { Err, ErrFromText, Ok, type Result } from "lib-result";
import { DEFAULT_CONFIG } from "@/lib/constants.ts";
import { Log } from "@/lib/logger.ts";
import { splitProviderModel } from "@/lib/modelString.ts";
import type { CommitFormat } from "@/lib/types/commit.ts";
import ConfigService from "@/services/config.ts";
import { getProviderService } from "@/services/providerRegistry.ts";
import { getTemplate } from "@/templates/index.ts";

/**
 * Reference language used to demonstrate the expected output shape to the
 * translating model. Russian is the second native template in every format
 * file, so an english→russian pair always exists to show.
 */
const EXAMPLE_LANGUAGE = "russian";

/**
 * Resolve the effective model string: explicit `--model` override wins,
 * otherwise the config value, otherwise the compiled default. Kept local so
 * this service stays independent of the commit-generation pipeline in
 * `ai.ts` (which itself depends on `prompt.ts`, which depends on us).
 */
async function resolveModel(modelOverride?: string): Promise<string> {
  if (modelOverride !== undefined) return modelOverride;
  const result = await ConfigService.get("model");
  if (result.isError()) return DEFAULT_CONFIG.model as string;
  const value = result.ok as unknown as string | undefined;
  return value ?? (DEFAULT_CONFIG.model as string);
}

/**
 * Build the translation prompt.
 *
 * Structure borrowed in intent from the VS Code extension's translator: show
 * an english→other-native pair so the model can see the required fidelity,
 * then ask for the same text in the target language. The wording here is
 * ours — the extension is a reference, not a source to copy.
 */
function buildTranslationPrompt(
  language: string,
  format: CommitFormat
): string {
  const source = getTemplate(format, "english");
  const example = getTemplate(format, EXAMPLE_LANGUAGE);

  return `Translate the commit-format instructions below into ${language}.

The two blocks first show a worked example: the english original and a
correct translation of it. Match that example's completeness and formatting.

--- ENGLISH ---
${source}

--- ${EXAMPLE_LANGUAGE.toUpperCase()} (WORKED EXAMPLE) ---
${example}

--- YOUR TASK ---
Translate the ENGLISH block into ${language}, following these rules:
- Output only the translated text. No preamble, no commentary, no code fences.
- Keep the same structure, line count, and blank lines as the english original.
- Do not translate: commit type names (feat, fix, docs, style, refactor, perf,
  test, build, ci, chore, revert), emoji shortcodes such as :sparkles:,
  format patterns such as \`type(scope): description\`, or placeholder tags
  such as <type>.
- Translate all prose.

--- ${language.toUpperCase()} ---`;
}

/**
 * Translate one format's instructions into `language` via the configured
 * provider and cache the result under `[language][format]`.
 *
 * The provider call reuses `generateCommitMessage` as the generic
 * single-shot completion seam (the extension does the same) — the sanitizing
 * and retry machinery around it is what we want, since a translation is a
 * short plain-text answer.
 */
async function translateFormatTemplate(
  language: string,
  format: CommitFormat,
  modelOverride?: string
): Promise<Result<string>> {
  const model = await resolveModel(modelOverride);
  const split = splitProviderModel(model);
  if (split.isError()) return Err(split.error);

  // Unknown provider names dispatch generically through the registry when
  // `providers.<name>.baseUrl` is set; without it `getProviderService`
  // throws a `ConfigurationError` naming the missing key, which lands in
  // the `Err` below instead of an opaque "not a function" crash.
  try {
    const Service = await getProviderService(split.ok.provider);
    Log.info(
      `Translating the "${format}" format instructions into ${language}...`
    );

    const response = await Service.generateCommitMessage(
      buildTranslationPrompt(language, format),
      1,
      model
    );
    const translated = response.message.trim();
    if (translated === "") {
      return ErrFromText(
        `The provider returned an empty translation for "${format}" into ${language}.`
      );
    }
    return Ok(translated);
  } catch (error) {
    return Err(
      new Error(
        `Translation of the "${format}" format into ${language} failed: ${(error as Error).message}`
      )
    );
  }
}

const TemplateTranslationService = {
  translateFormatTemplate,
};

export { TemplateTranslationService as default, TemplateTranslationService };
