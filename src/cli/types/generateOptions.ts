// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import type { CommitFormat, CommitLanguage } from "@/lib/types/commit.ts";

/**
 * Per-command options for the `generate` subcommand.
 *
 * Every field is optional. The CLI resolves each value at its call site via
 * `flag ?? config ?? DEFAULT_CONFIG` — there's no shared mutable state, just
 * a plain struct threaded through the layers.
 */
type GenerateOptions = {
  /** Model for this run in `provider/model` format (from `--model` flag). First `/` splits provider from model id. */
  model?: string;
  /** Override `commit.commitFormat` for this run (from `--format` flag). */
  format?: CommitFormat;
  /** Override `commit.maxLength` for this run (from `--max-length` flag). */
  maxLength?: number;
  /** Commit language tag (from `--lang` flag). BCP-47, stored as-given; normalized internally. */
  language?: CommitLanguage;
  /** AI-only. Inject `## External Context\n<text>` into the prompt (from `--context` flag). */
  context?: string;
  /** Use static-analysis generator instead of an AI provider (from `--offline` flag). [T5 stub] */
  offline?: boolean;
  /** Open the generated message in `$EDITOR`/`$VISUAL` before printing (from `--edit` flag). */
  edit?: boolean;
};

export type { GenerateOptions };
