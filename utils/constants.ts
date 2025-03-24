export const messages = {
  fetchingDiff: "Fetching Git changes...",
  analyzingChanges: "Analyzing code changes...",
  generating: "Generating commit message...",
  settingMessage: "Setting commit message...",
  done: "Done!",
  success: "Commit message generated using {0} model",
  noStagedChanges:
    "No staged changes to commit. Please stage your changes first.",
  gitConfigError:
    "Git user.name or user.email is not configured. Please configure Git before committing.",
  checkingGitConfig: "Checking Git configuration...",
  committing: "Committing changes...",
  pushing: "Pushing changes...",
};

export const errorMessages = {
  commandExecution: "Error in command execution:",
  generateCommitMessage: "Failed to generate commit message",
  apiError: "API Error: {0}",
  networkError: "Network Error: {0}",
  configError: "Configuration error: {0}",
  fileNotFound: "File not found",
  gitError: "Git Error: {0}",
  invalidInput: "Invalid Input: {0}",
  paymentRequired:
    "Payment Required: Your API key requires a valid subscription or has exceeded its quota. Please check your billing status.",
  invalidRequest:
    "Invalid Request: The request was malformed or the input was invalid. This may happen if the content is too long or contains unsupported characters.",
  rateLimitExceeded:
    "Rate Limit Exceeded: Too many requests in a short time period. Please wait a moment before trying again.",
  serverError:
    "Server Error: The service is temporarily unavailable. Please try again later.",
  authenticationError:
    "Authentication Error: The API key is invalid or has been revoked. Please check your API key.",
  noChanges: "No changes to commit",
  noRepository: "No Git repository found",
  noWorkspace: "No workspace folder is open",
  noCommitsYet: "Repository has no commits yet",
  fileNotCommitted: "File has not been committed yet",
  fileDeleted: "File has been deleted",
};
