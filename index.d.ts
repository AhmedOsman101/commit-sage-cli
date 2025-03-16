export type Option<T> = [null, string] | [T, null];

export type CommandOutput = {
  stdout: string;
  stderr: string;
  code: number;
};
