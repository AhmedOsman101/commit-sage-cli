// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Err, ErrFromText, Ok, type Result } from "lib-result";
import type { GenerateOptions } from "@/cli/types/generateOptions.ts";
import { splitProviderModel } from "@/lib/modelString.ts";
import {
  COMMIT_FORMATS,
  type CommitFormat,
  type CommitLanguage,
} from "@/lib/types/commit.ts";

/**
 * Resolve {@link GenerateOptions} from raw CLI option bag. Each field is
 * `flag ?? undefined` — config-resolution happens downstream in the service
 * layer.
 */
function resolveOptions(opts: Record<string, unknown>): GenerateOptions {
  return {
    model: opts.model as string | undefined,
    format: opts.format as CommitFormat,
    maxLength: opts.maxLength as number,
    language: opts.lang as CommitLanguage,
    context: opts.context as string,
    offline: opts.offline as boolean,
    edit: opts.edit as boolean,
  } as GenerateOptions;
}

/**
 * Validate resolved {@link GenerateOptions}. Pure function — surfaces a
 * user-facing message via `Err` for invalid input. Shared by `generate` and
 * `commit` so flag semantics stay identical across subcommands.
 */
function validateOptions(runOptions: GenerateOptions): Result<boolean, Error> {
  if (runOptions.format) {
    const valid = COMMIT_FORMATS.includes(runOptions.format);
    if (!valid) {
      return ErrFromText(
        `Invalid format "${runOptions.format}". Valid: ${COMMIT_FORMATS.join(", ")}`
      );
    }
  }

  if (runOptions.model !== undefined) {
    // Single canonical flag: must be a full "provider/model" string (first
    // slash splits; multi-segment model ids preserved).
    const split = splitProviderModel(runOptions.model);
    if (split.isError()) return Err(split.error);
  }

  if (runOptions.language !== undefined) {
    // Store-as-given (BCP-47): any non-empty tag passes; PromptService
    // normalizes internally and falls back to english on unknown tags.
    if (
      typeof runOptions.language !== "string" ||
      runOptions.language.trim() === ""
    ) {
      return ErrFromText(
        "--lang must be a non-empty language tag (e.g. en, en-US, jp)"
      );
    }
  }

  if (runOptions.maxLength !== undefined) {
    if (runOptions.maxLength <= 0 || !Number.isInteger(runOptions.maxLength)) {
      return ErrFromText("--max-length must be a positive integer");
    }
  }

  return Ok(true);
}

export { resolveOptions, validateOptions };
