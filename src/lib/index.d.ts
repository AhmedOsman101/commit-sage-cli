import type { AxiosError } from "axios";

export type CommandOutput = {
  stdout: string;
  stderr: string;
  code: number;
};

export type CommitMessage = {
  message: string;
  model: string;
};

export type ApiErrorResponse = {
  status: number;
  data: unknown;
};

export type ErrorWithResponse = AxiosError & {
  response?: ApiErrorResponse;
};

export type ApiError = {
  errorMessage: string;
  shouldRetry: boolean;
};

// Commit message format types
export type CommitFormat =
  | "conventional"
  | "angular"
  | "karma"
  | "emoji"
  | "semantic";
