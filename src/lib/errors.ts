export class NoRepositoriesFoundError extends Error {
  constructor(options: ErrorOptions = {}) {
    super("No Git repositories found in the current directory.", options);
    this.name = new.target.name;
  }
}

export class NoChangesDetectedError extends Error {
  constructor(message = "No changes detected.", options: ErrorOptions = {}) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class EmptyCommitMessageError extends Error {
  constructor(options: ErrorOptions = {}) {
    super("Generated commit message is empty.", options);
    this.name = new.target.name;
  }
}

export class OpenAiError extends Error {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class AiServiceError extends Error {
  constructor(message: string, options: ErrorOptions = {}) {
    super(`AI service error: ${message}`, options);
    this.name = new.target.name;
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, options: ErrorOptions = {}) {
    super(`Configuration error: ${message}`, options);
    this.name = new.target.name;
  }
}
