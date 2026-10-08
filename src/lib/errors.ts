import type { CommandOutput } from "@/lib/types/index.ts";

class NoRepositoriesFoundError extends Error {
  constructor(options: ErrorOptions = {}) {
    super("No Git repositories found in the current directory.", options);
    this.name = new.target.name;
  }
}

class NoChangesDetectedError extends Error {
  constructor(message = "No changes detected.", options: ErrorOptions = {}) {
    super(message, options);
    this.name = new.target.name;
  }
}

class EmptyCommitMessageError extends Error {
  constructor(options: ErrorOptions = {}) {
    super("Generated commit message is empty.", options);
    this.name = new.target.name;
  }
}

/**
 * Signals that the user declined — or could not be asked — to have an
 * unknown `commit.commitLanguage` translated. Not a failure: the CLI warns
 * and exits 0 (ADR 003).
 *
 * Carried as a typed error so `PromptService.buildPrompt` can keep its
 * `Result<string>` shape while callers distinguish "declined" from "broken"
 * by `instanceof`. The message is the user-facing warning, so the service
 * layer stays silent and the CLI prints exactly once.
 */
class LanguageTranslationDeclinedError extends Error {
  constructor(language: string, detail: string, options: ErrorOptions = {}) {
    super(
      `Not translating commit format instructions into "${language}": ${detail} Using the english template instead.`,
      options
    );
    this.name = new.target.name;
  }
}

class TruncatedResponseError extends Error {
  constructor(provider: string, detail: string, options: ErrorOptions = {}) {
    super(
      `${provider} stopped before the message was complete (${detail}). Raise generation.maxOutputTokens if this keeps happening.`,
      options
    );
    this.name = new.target.name;
  }
}

class OpenAiError extends Error {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, options);
    this.name = new.target.name;
  }
}

class AiServiceError extends Error {
  constructor(message: string, options: ErrorOptions = {}) {
    super(`AI service error: ${message}`, options);
    this.name = new.target.name;
  }
}

class ConfigurationError extends Error {
  constructor(message: string, options: ErrorOptions = {}) {
    super(`Configuration error: ${message}`, options);
    this.name = new.target.name;
  }
}

class CommandError extends Error {
  command: string;
  stdout?: string;
  stderr?: string;
  code?: number;
  context?: Record<string, unknown>;
  constructor(
    message: string,
    command: string,
    cmdOutput?: CommandOutput,
    options: ErrorOptions = {}
  ) {
    super(message, options);
    this.name = new.target.name;

    this.command = command;
    this.stdout = cmdOutput?.stdout;
    this.stderr = cmdOutput?.stderr;
    this.code = cmdOutput?.code;
    if (options.cause && typeof options.cause === "object") {
      this.context = options.cause as Record<string, unknown>;
    }
  }
}

export {
  AiServiceError,
  CommandError,
  ConfigurationError,
  EmptyCommitMessageError,
  LanguageTranslationDeclinedError,
  NoChangesDetectedError,
  NoRepositoriesFoundError,
  OpenAiError,
  TruncatedResponseError,
};
