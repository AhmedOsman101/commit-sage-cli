import type { CommandOutput } from "../lib/index.d.ts";
import { Ok, type Result, Text2Err } from "../lib/result.ts";

const CommandService = {
  execute(
    cmd: string,
    args: string[] = [],
    cwd = Deno.cwd()
  ): Result<CommandOutput> {
    try {
      const command = new Deno.Command(cmd, {
        args,
        stdout: "piped",
        stderr: "piped",
        cwd,
      });

      const output = command.outputSync();

      const stdout = new TextDecoder().decode(output.stdout).trim();
      const stderr = new TextDecoder().decode(output.stderr).trim();
      const code = output.code;

      if (code !== 0) {
        // Combine stderr and stdout for better error context if stderr is empty
        const errorOutput = stderr || stdout || "No output";
        return Text2Err(
          `Command "${cmd} ${args.join(" ")}" failed with code ${code}: ${errorOutput}`
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

      return Text2Err(`Failed to execute command "${cmd}": ${errorMessage}`);
    }
  },
};

export default CommandService;
