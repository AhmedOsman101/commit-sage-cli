import { dirname } from "node:path";
import { Err, Ok, type Result } from "lib-result";
import { TRANSLATIONS_PATH } from "@/lib/constants.ts";
import { Log } from "@/lib/logger.ts";
import type { CommitFormat } from "@/lib/types/commit.ts";
import { JsonParse, JsonStringify } from "@/lib/utils.ts";
import FileSystemService from "@/services/fileSystem.ts";

/**
 * User-owned cache of AI-translated format templates, shaped
 * `[language][format]`. Lives beside `config.json` in the platform config
 * directory.
 *
 * Invalidation is manual by design (ADR 003): delete an entry and the next
 * run re-translates it. No TTL, no version stamp — a template that is good
 * enough stays good until the user says otherwise.
 */
type TranslationsFile = Record<string, Partial<Record<CommitFormat, string>>>;

/**
 * Read the whole cache. A missing file is the common case (nothing
 * translated yet), not an error — returns an empty map. Malformed JSON also
 * degrades to an empty map with a warning: a broken cache must not stop
 * generation, and the rewrite that follows will repair the file.
 */
async function readTranslations(): Promise<TranslationsFile> {
  // Probe existence first so "no cache yet" is a silent normal case rather
  // than an error message we then have to string-match to recognize.
  const exists = await FileSystemService.fileExists(TRANSLATIONS_PATH);
  if (!exists.isOk() || !exists.ok) return {};

  const readResult = await FileSystemService.readFile(TRANSLATIONS_PATH);
  if (readResult.isError()) {
    Log.warning(
      `Could not read ${TRANSLATIONS_PATH} (${readResult.error.message}) — treating the translation cache as empty`
    );
    return {};
  }

  const parsed = JsonParse(readResult.ok);
  if (parsed.isError()) {
    Log.warning(
      `${TRANSLATIONS_PATH} is not valid JSON (${parsed.error.message}) — treating the translation cache as empty`
    );
    return {};
  }

  if (
    typeof parsed.ok !== "object" ||
    parsed.ok === null ||
    Array.isArray(parsed.ok)
  ) {
    Log.warning(
      `${TRANSLATIONS_PATH} is not a language→format object — treating the translation cache as empty`
    );
    return {};
  }

  return parsed.ok as TranslationsFile;
}

/**
 * Cached template for `[language][format]`, or `null` on a miss. Callers
 * treat a miss as "offer to translate", never as an error.
 */
async function getCachedTemplate(
  language: string,
  format: CommitFormat
): Promise<string | null> {
  const translations = await readTranslations();
  const template = translations[language]?.[format];
  return typeof template === "string" && template.trim() !== ""
    ? template
    : null;
}

/**
 * Merge-write `template` into `[language][format]`, preserving every other
 * language and format already cached. Failures warn rather than propagate:
 * a lost cache entry costs one re-translation next run, and must not fail
 * a generation that already succeeded.
 */
async function saveCachedTemplate(
  language: string,
  format: CommitFormat,
  template: string
): Promise<Result<boolean>> {
  const translations = await readTranslations();
  const existing = translations[language];
  translations[language] = { ...existing, [format]: template };

  const stringified = JsonStringify(translations, null, 2);
  if (stringified.isError()) return Err(stringified.error);

  const dirResult = await FileSystemService.createDir(
    dirname(TRANSLATIONS_PATH)
  );
  if (dirResult.isError()) {
    Log.warning(
      `Could not create the config directory for ${TRANSLATIONS_PATH} (${dirResult.error.message})`
    );
    return Ok(false);
  }

  try {
    await Deno.writeTextFile(TRANSLATIONS_PATH, stringified.ok);
    return Ok(true);
  } catch (error) {
    Log.warning(
      `Could not cache the translation in ${TRANSLATIONS_PATH} (${(error as Error).message})`
    );
    return Ok(false);
  }
}

const TranslationsService = {
  getCachedTemplate,
  saveCachedTemplate,
};

export type { TranslationsFile };
export { TranslationsService as default, TranslationsService };
