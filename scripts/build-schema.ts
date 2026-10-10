/*
Generate `config.schema.json` from `src/lib/types/configSchema.ts`.

Usage:
  mask schema build   # write to config.schema.json
  mask schema check   # verify in sync; exit 1 on drift
*/

import { ROOT_SCHEMA } from "@/lib/types/configSchema.ts";

const SCHEMA_PATH = new URL("../config.schema.json", import.meta.url);

const MODE_WRITE = "write";
const MODE_CHECK = "check";
const mode = Bun.argv.includes("--check") ? MODE_CHECK : MODE_WRITE;

// 2-space indent matches the hand-edited history; trailing newline keeps
// POSIX tooling happy.
const SERIALIZE_OPTIONS = { indent: 2 } as const;
const generated = `${JSON.stringify(ROOT_SCHEMA, null, SERIALIZE_OPTIONS.indent)}\n`;

if (mode === MODE_CHECK) {
  let existing: string;
  try {
    existing = await Bun.file(SCHEMA_PATH).text();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.error(
        "config.schema.json missing — run `mask schema build` to generate it."
      );
      process.exit(1);
    }
    throw error;
  }
  if (existing !== generated) {
    console.error(
      "config.schema.json is out of sync with src/lib/types/configSchema.ts."
    );
    console.error("Run `mask schema build` and commit the result.");
    process.exit(1);
  }
  console.log("config.schema.json is in sync.");
} else {
  await Bun.write(SCHEMA_PATH, generated);
  console.log(`Wrote ${SCHEMA_PATH.pathname}`);
}
