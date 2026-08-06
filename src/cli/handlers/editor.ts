// Copyright (C) 2025 Ahmad Osman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { Err, Ok, type Result } from "lib-result";
import { OS } from "@/lib/constants.ts";
import { Log } from "@/lib/logger.ts";
import CommandService from "@/services/command.ts";
import FileSystemService from "@/services/fileSystem.ts";

/**
 * Open an editor with `initialContent`, return the final text.
 *
 * 1. Create temp file via FileSystemService
 * 2. Write initial content
 * 3. Spawn editor via CommandService.spawnInteractive (inherits stdio)
 * 4. Read back edited content
 * 5. Cleanup temp file
 */
export async function runEditor(
  initialContent: string
): Promise<Result<string, Error>> {
  // Create temp file
  const tmpFileResult = await FileSystemService.createTempFile(
    "commit-sage-",
    ".txt"
  );
  if (tmpFileResult.isError()) return Err(tmpFileResult.error);
  const tmpFile = tmpFileResult.ok;

  try {
    // Write initial content
    const writeResult = await FileSystemService.writeFile(
      tmpFile,
      initialContent
    );
    if (writeResult.isError()) return Err(writeResult.error);

    // Determine editor
    const editor =
      Deno.env.get("VISUAL") ??
      Deno.env.get("EDITOR") ??
      (OS === "windows" ? "notepad" : "vi");

    // Handle "code --wait" style strings: split on first space
    const [editorBin, ...editorArgs] = editor.split(/\s+/);

    // Spawn editor with inherited stdio (interactive)
    const spawnResult = await CommandService.spawnInteractive(
      editorBin,
      [...editorArgs, tmpFile],
      {
        inheritStdin: true,
        inheritStdout: true,
        inheritStderr: true,
      }
    );
    if (spawnResult.isError()) {
      Log.warning(`Editor exited with error: ${spawnResult.error.message}`);
      return Ok(initialContent.trim());
    }

    // Read back edited content
    const readResult = await FileSystemService.readFile(tmpFile);
    if (readResult.isError()) return Err(readResult.error);

    const edited = readResult.ok.trim();
    return Ok(edited || initialContent.trim());
  } finally {
    // Best-effort cleanup
    await FileSystemService.removeFile(tmpFile);
  }
}
