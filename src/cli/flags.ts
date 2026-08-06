// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { ErrFromText, Ok, type Result } from "lib-result";
import type { GenerateOptions } from "@/cli/types/generateOptions.ts";
import {
  COMMIT_FORMATS,
  type CommitFormat,
  type CommitLanguage,
  SUPPORTED_LANGUAGES,
} from "@/lib/types/commit.ts";
import { type ProviderType, SUPPORTED_PROVIDERS } from "@/lib/types/config.ts";

/**
 * Resolve {@link GenerateOptions} from raw CLI option bag. Each field is
 * `flag ?? undefined` — config-resolution happens downstream in the service
 * layer.
 */
function resolveOptions(opts: Record<string, unknown>): GenerateOptions {
  return {
    provider: opts.provider as ProviderType,
    model: opts.model as string,
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

  if (runOptions.provider) {
    const valid = SUPPORTED_PROVIDERS.includes(runOptions.provider);
    if (!valid) {
      return ErrFromText(
        `Invalid provider "${runOptions.provider}". Valid: ${SUPPORTED_PROVIDERS.join(", ")}`
      );
    }
  }

  if (runOptions.language) {
    const valid = SUPPORTED_LANGUAGES.includes(runOptions.language);
    if (!valid) {
      return ErrFromText(
        `Invalid language "${runOptions.language}". Valid: ${SUPPORTED_LANGUAGES.join(", ")}`
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
