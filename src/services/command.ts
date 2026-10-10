import { Err, Ok, type Result } from "lib-result";
import { CommandError } from "@/lib/errors.ts";
import type { CommandOutput } from "@/lib/types/index.ts";

type ExecuteOptions = {
  signal?: AbortSignal;
  timeout?: number;
};

const CommandService = {
  async execute(
    cmd: string,
    args: string[] = [],
    cwd = process.cwd(),
    options: ExecuteOptions = {}
  ): Promise<Result<CommandOutput, CommandError>> {
    const fullCommand = `${cmd} ${args.join(" ")}`.trim();
    const timeoutMs = options.timeout;
    const timeoutEnabled =
      typeof timeoutMs === "number" &&
      Number.isFinite(timeoutMs) &&
      timeoutMs > 0;
    // Native Bun.spawn timeout. SIGKILL (not the default SIGTERM) is the
    // timeout signature: the async API has no `exitedDueToTimeout` flag,
    // so a SIGKILL death while a timeout is armed is how a timeout kill
    // is told apart from a genuine failure. `isCommandTimeout` still
    // matches on the structured cause below, then the message.
    const timeoutError = (output?: {
      stdout: string;
      stderr: string;
      code: number;
    }) =>
      new CommandError(
        `Command timed out after ${timeoutMs}ms: ${fullCommand}`,
        fullCommand,
        output,
        { cause: { timedOut: true, timeoutMs } }
      );

    try {
      const proc = Bun.spawn([cmd, ...args], {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
        ...(options.signal !== undefined ? { signal: options.signal } : {}),
        ...(timeoutEnabled
          ? { timeout: timeoutMs as number, killSignal: "SIGKILL" }
          : {}),
      });

      const [stdout, stderr, code] = await Promise.all([
        proc.stdout.text(),
        proc.stderr.text(),
        proc.exited,
      ]);

      if (timeoutEnabled && proc.signalCode === "SIGKILL") {
        return Err(timeoutError({ stdout, stderr, code }));
      }

      if (code !== 0) {
        // Combine stderr and stdout for better error context if stderr is empty
        const errorOutput = stderr || stdout || "No output";
        return Err(
          new CommandError(
            `Command failed with code ${code}: ${errorOutput}`,
            `${cmd} ${args.join(" ")}`,
            { stdout, stderr, code }
          )
        );
      }

      return Ok({ stdout, stderr, code });
    } catch (error) {
      // Native timeout kills resolve `exited` rather than throwing, so any
      // throw here is a spawn failure, never a timeout.
      let errorMessage = "An unknown error occurred";

      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        errorMessage = `Command "${cmd}" not found`;
      } else if (
        error instanceof Error &&
        "code" in error &&
        (error.code === "EACCES" || error.code === "EPERM")
      ) {
        errorMessage = `Permission denied for command '${cmd}'`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      return Err(
        new CommandError(
          `Failed to execute command: ${errorMessage}`,
          `${cmd} ${args.join(" ")}`
        )
      );
    }
  },

  /**
   * Spawn a child process asynchronously, optionally inheriting stdio
   * (used for interactive editors where the child needs a real TTY).
   *
   * Returns the exit code. Does NOT capture stdout/stderr — caller decides
   * via `inheritStdout`/`inheritStderr`. Non-zero exit code is not an error
   * for interactive editors (user may quit without saving).
   */
  async spawnInteractive(
    cmd: string,
    args: string[],
    options: {
      cwd?: string;
      inheritStdout?: boolean;
      inheritStderr?: boolean;
      inheritStdin?: boolean;
    } = {}
  ): Promise<Result<CommandOutput, CommandError>> {
    try {
      const proc = Bun.spawn([cmd, ...args], {
        cwd: options.cwd,
        stdin: options.inheritStdin ? "inherit" : "ignore",
        stdout: options.inheritStdout ? "inherit" : "pipe",
        stderr: options.inheritStderr ? "inherit" : "pipe",
      });

      // Inherited streams are not capturable — stdout/stderr are null.
      const stdout = options.inheritStdout
        ? ""
        : ((await proc.stdout?.text()) ?? "");
      const stderr = options.inheritStderr
        ? ""
        : ((await proc.stderr?.text()) ?? "");
      const code = await proc.exited;

      if (code !== 0) {
        // Combine stderr and stdout for better error context if stderr is empty.
        // With inherited streams both are empty — output already went to the
        // terminal live, so don't append a misleading "No output".
        const errorOutput = stderr || stdout;
        return Err(
          new CommandError(
            `Command failed with code ${code}${errorOutput ? `: ${errorOutput}` : ""}`,
            `${cmd} ${args.join(" ")}`,
            { stdout, stderr, code }
          )
        );
      }

      return Ok({ stdout, stderr, code });
    } catch (error) {
      const message =
        error instanceof Error && "code" in error && error.code === "ENOENT"
          ? `Command "${cmd}" not found`
          : error instanceof Error
            ? error.message
            : "An unknown error occurred";

      return Err(
        new CommandError(
          `Failed to execute command: ${message}`,
          `${cmd} ${args.join(" ")}`
        )
      );
    }
  },
};

/**
 * True when a `CommandService.execute` failure was a timeout (the
 * `AbortSignal.timeout` guard fired). Checks the structured
 * `timedOut` cause first, falling back to the timeout message so
 * callers stay robust if the cause is ever dropped.
 */
function isCommandTimeout(error: unknown): boolean {
  if (error instanceof CommandError) {
    if (
      typeof error.context === "object" &&
      error.context !== null &&
      (error.context as Record<string, unknown>).timedOut === true
    ) {
      return true;
    }
    return error.message.includes("timed out after");
  }
  return false;
}

export default CommandService;
export { isCommandTimeout };
