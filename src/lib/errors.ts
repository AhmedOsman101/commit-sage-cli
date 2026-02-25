import type { CommandOutput } from "@/lib/index.d.ts";

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
  NoRepositoriesFoundError,
  NoChangesDetectedError,
  EmptyCommitMessageError,
  OpenAiError,
  ConfigurationError,
  AiServiceError,
  CommandError,
};
