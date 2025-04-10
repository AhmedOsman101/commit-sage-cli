import type { CommandOutput, Option } from "../index.d.ts";

const CommandService = {
  async execute(
    cmd: string,
    args: string[] = [],
    cwd = Deno.cwd()
  ): Promise<Option<CommandOutput>> {
    try {
      const command = new Deno.Command(cmd, {
        args,
        stdout: "piped",
        stderr: "piped",
        cwd,
      });

      const childProcess = command.spawn();

      // Capture stdout
      const stdoutReader = childProcess.stdout
        .pipeThrough(new TextDecoderStream())
        .getReader();
      const stdoutResult = await stdoutReader.read();
      const stdout = stdoutResult.value || ""; // Default to null if no output

      // Capture stderr
      const stderrReader = childProcess.stderr
        .pipeThrough(new TextDecoderStream())
        .getReader();
      const stderrResult = await stderrReader.read();
      const stderr = stderrResult.value || ""; // Default to null if no error output

      // Capture status code
      const status = await childProcess.status;
      const code = status.code;

      // Clean up readers
      stdoutReader.releaseLock();
      stderrReader.releaseLock();
      return [{ stdout: stdout.trim(), stderr, code }, null];
    } catch (error) {
      const e: Error = error as unknown as Error;
      return [null, e.message];
    }
  },
};

export default CommandService;
