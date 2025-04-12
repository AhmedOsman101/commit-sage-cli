import type { AxiosError } from "axios";

export type Result<T, E = string> = [T, null] | [null, E];

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
