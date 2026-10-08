import { Err, Ok, type Result } from "lib-result";
import { CommandError } from "@/lib/errors.ts";
import type { CommandOutput } from "@/lib/types/index.ts";
import { Decoder } from "@/lib/utils.ts";

const CommandService = {
  async execute(
    cmd: string,
    args: string[] = [],
    cwd = Deno.cwd(),
    options: Deno.CommandOptions & { timeoutMs?: number } = {}
  ): Promise<Result<CommandOutput, CommandError>> {
    const fullCommand = `${cmd} ${args.join(" ")}`.trim();
    const timeoutMs = options.timeoutMs;
    const timeoutEnabled =
      typeof timeoutMs === "number" &&
      Number.isFinite(timeoutMs) &&
      timeoutMs > 0;
    const timeoutSignal = timeoutEnabled
      ? AbortSignal.timeout(timeoutMs as number)
      : undefined;
    const signal =
      timeoutSignal !== undefined
        ? options.signal !== undefined
          ? AbortSignal.any([options.signal, timeoutSignal])
          : timeoutSignal
        : options.signal;
    const isTimeout = () => timeoutSignal?.aborted === true;
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
      const command = new Deno.Command(cmd, {
        args,
        stdout: "piped",
        stderr: "piped",
        cwd,
        ...(signal !== undefined ? { signal } : {}),
      });

      const output = await command.output();

      if (isTimeout()) {
        return Err(
          timeoutError({
            stdout: Decoder.decode(output.stdout),
            stderr: Decoder.decode(output.stderr),
            code: output.code,
          })
        );
      }

      const stdout = Decoder.decode(output.stdout);
      const stderr = Decoder.decode(output.stderr);
      const code = output.code;

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
      if (isTimeout()) {
        return Err(timeoutError());
      }

      let errorMessage = "An unknown error occurred";

      if (error instanceof Deno.errors.NotFound) {
        errorMessage = `Command "${cmd}" not found`;
      } else if (error instanceof Deno.errors.PermissionDenied) {
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
      const command = new Deno.Command(cmd, {
        args,
        cwd: options.cwd,
        stdin: options.inheritStdin ? "inherit" : "piped",
        stdout: options.inheritStdout ? "inherit" : "piped",
        stderr: options.inheritStderr ? "inherit" : "piped",
      });

      const output = await command.output();

      // Inherited streams have no captured buffer — decoding them throws.
      const stdout = options.inheritStdout ? "" : Decoder.decode(output.stdout);
      const stderr = options.inheritStderr ? "" : Decoder.decode(output.stderr);
      const code = output.code;

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
        error instanceof Deno.errors.NotFound
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
