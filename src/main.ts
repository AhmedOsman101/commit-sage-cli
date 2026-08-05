// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import { ValidationError } from "@cliffy/command";
import { buildRootCommand } from "@/cli/root.ts";
import { Log } from "@/lib/logger.ts";
import { Encoder } from "@/lib/utils.ts";

try {
  await buildRootCommand().parse(Deno.args);
} catch (error) {
  // Exit code 2: usage error (unknown flag, missing required arg).
  // With .throwErrors(), Cliffy skips its built-in stderr printing —
  // we print the message ourselves so the user still sees what went wrong.
  if (error instanceof ValidationError) {
    const message = error.message;
    Deno.stderr.writeSync(Encoder.encode(`error: ${message}\n`));
    Deno.exit(error.exitCode || 2);
  }
  // Exit code 130: user abort (Esc from TUI). Cliffy throws CancelError
  // from @cliffy/prompt when a prompt is dismissed. Not importable here
  // without pulling in the prompt module — T6 wires this up.
  if (error instanceof Error && error.name === "CancelError") {
    Deno.exit(130);
  }
  throw Log.error(error).exit();
}
