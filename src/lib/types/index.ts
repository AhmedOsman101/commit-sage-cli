import type { AxiosError } from "axios";

type CommandOutput = {
  stdout: string;
  stderr: string;
  code: number;
};

type ApiErrorResponse = {
  status: number;
  data: unknown;
};

type ErrorWithResponse = AxiosError & {
  response?: ApiErrorResponse;
};

type ApiError = {
  errorMessage: string;
  shouldRetry: boolean;
};

export type { ApiError, ApiErrorResponse, CommandOutput, ErrorWithResponse };
