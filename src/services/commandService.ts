import { Err, Ok, type Result } from "lib-result";
import { CommandError } from "@/lib/errors.ts";
import type { CommandOutput } from "@/lib/index.d.ts";

const CommandService = {
  execute(
    cmd: string,
    args: string[] = [],
    cwd = Deno.cwd()
  ): Result<CommandOutput, CommandError> {
    try {
      const command = new Deno.Command(cmd, {
        args,
        stdout: "piped",
        stderr: "piped",
        cwd,
      });

      const output = command.outputSync();

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
};

export default CommandService;
