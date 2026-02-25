export function formatUserError(error: Error): string {
  const errorName = error.constructor.name;

  switch (errorName) {
    case "NoRepositoriesFoundError":
      return "No Git repository found. Please run this command from within a Git repository.";

    case "NoChangesDetectedError":
      return "No changes detected. Stage some files or make modifications before committing.";

    case "EmptyCommitMessageError":
      return "Generated commit message was empty. Please try again.";

    case "CommandError":
      return `Git command failed: ${error.message}. Check the log file for details.`;

    case "ConfigurationError":
      return `Configuration issue: ${error.message}. Please check your config file.`;

    case "AiServiceError":
      return `AI service error: ${error.message}. Check the log file for details.`;

    case "OpenAiError":
      return `OpenAI error: ${error.message}. Check the log file for details.`;

    default:
      if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("connection refused")
      ) {
        return "Could not connect to the AI service. Please check your network connection and API configuration.";
      }
      if (error.message.toLowerCase().includes("api key")) {
        return "API key issue. Please check your API key is set correctly.";
      }
      return error.message;
  }
}

export function getErrorContext(
  error: Error
): Record<string, unknown> | undefined {
  if ("context" in error && error.context) {
    return error.context as Record<string, unknown>;
  }

  if ("command" in error) {
    return {
      command: (error as Record<string, unknown>).command,
      code: (error as Record<string, unknown>).code,
    };
  }

  return;
}
