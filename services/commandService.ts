import type { CommandOutput, Result } from "../index.d.ts";

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
        return [
          null,
          `Command "${cmd} ${args.join(" ")}" failed with code ${code}: ${errorOutput}`,
        ];
      }

      return [{ stdout, stderr, code }, null];
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
      // Add context if helpful, e.g., command attempted
      errorMessage = `Failed to execute command "${cmd}": ${errorMessage}`;
      return [null, errorMessage];
    }
  },
};

export default CommandService;
