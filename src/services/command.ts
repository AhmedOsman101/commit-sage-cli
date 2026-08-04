import { Err, Ok, type Result } from "lib-result";
import { CommandError } from "@/lib/errors.ts";
import type { CommandOutput } from "@/lib/types/index.ts";

const CommandService = {
  async execute(
    cmd: string,
    args: string[] = [],
    cwd = Deno.cwd()
  ): Promise<Result<CommandOutput, CommandError>> {
    try {
      const command = new Deno.Command(cmd, {
        args,
        stdout: "piped",
        stderr: "piped",
        cwd,
      });

      const output = await command.output();

      const decoder = new TextDecoder();

      const stdout = decoder.decode(output.stdout).trim();
      const stderr = decoder.decode(output.stderr).trim();
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
  ): Promise<Result<number, CommandError>> {
    try {
      const command = new Deno.Command(cmd, {
        args,
        cwd: options.cwd,
        stdin: options.inheritStdin ? "inherit" : "piped",
        stdout: options.inheritStdout ? "inherit" : "piped",
        stderr: options.inheritStderr ? "inherit" : "piped",
      });

      const output = await command.output();
      return Ok(output.code);
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

export default CommandService;
