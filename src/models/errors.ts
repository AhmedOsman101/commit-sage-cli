export class GitExtensionNotFoundError extends Error {
  constructor() {
    super(
      "Git extension not found. Please make sure it is installed and enabled."
    );
    this.name = "GitExtensionNotFoundError";
  }
}

export class NoRepositoriesFoundError extends Error {
  constructor() {
    super("No Git repositories found in the current workspace.");
    this.name = "NoRepositoriesFoundError";
  }
}

export class NoChangesDetectedError extends Error {
  constructor(message = "No changes detected.") {
    super(message);
    this.name = "NoChangesDetectedError";
  }
}

export class NoRepositorySelectedError extends Error {
  constructor() {
    super("No repository selected. Operation cancelled.");
    this.name = "NoRepositorySelectedError";
  }
}

export class EmptyCommitMessageError extends Error {
  constructor() {
    super("Generated commit message is empty.");
    this.name = "EmptyCommitMessageError";
  }
}

export class ApiKeyNotSetError extends Error {
  constructor() {
    super("API key is not set. Please set it in the extension settings.");
    this.name = "ApiKeyNotSetError";
  }
}

export class OpenAiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIError";
  }
}

export class AiServiceError extends Error {
  constructor(message: string) {
    super(`AI service error: ${message}`);
    this.name = "AiServiceError";
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(`Configuration error: ${message}`);
    this.name = "ConfigurationError";
  }
}
