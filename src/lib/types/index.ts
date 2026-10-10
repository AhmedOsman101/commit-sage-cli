type CommandOutput = {
  stdout: string;
  stderr: string;
  code: number;
};

type ErrorWithResponse = {
  response?: {
    status: number;
    data: unknown;
  };
};

type ApiError = {
  errorMessage: string;
  shouldRetry: boolean;
};

export type { ApiError, CommandOutput, ErrorWithResponse };
