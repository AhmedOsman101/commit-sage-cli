import type { AxiosError } from "axios";

export type Option<T> = [null, string] | [T, null];

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
