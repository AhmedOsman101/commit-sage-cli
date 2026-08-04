// Generate `config.schema.json` from `src/lib/types/configSchema.ts`.
//
// Usage:
//   deno run -A scripts/build-schema.ts           # write to config.schema.json
//   deno run -A scripts/build-schema.ts --check   # verify in sync; exit 1 on drift
//
// Run via `mask schema` (write) or `mask schema-check` (verify).

import { ROOT_SCHEMA } from "@/lib/types/configSchema.ts";

const SCHEMA_PATH = new URL("../config.schema.json", import.meta.url);

const MODE_WRITE = "write";
const MODE_CHECK = "check";
const mode = Deno.args.includes("--check") ? MODE_CHECK : MODE_WRITE;

// 2-space indent matches the hand-edited history; trailing newline keeps
// POSIX tooling happy.
const SERIALIZE_OPTIONS = { indent: 2 } as const;
const generated = `${JSON.stringify(ROOT_SCHEMA, null, SERIALIZE_OPTIONS.indent)}\n`;

if (mode === MODE_CHECK) {
  let existing: string;
  try {
    existing = await Deno.readTextFile(SCHEMA_PATH);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      console.error(
        "config.schema.json missing — run `mask schema` to generate it."
      );
      Deno.exit(1);
    }
    throw err;
  }
  if (existing !== generated) {
    console.error(
      "config.schema.json is out of sync with src/lib/types/configSchema.ts."
    );
    console.error("Run `mask schema` and commit the result.");
    Deno.exit(1);
  }
  console.log("config.schema.json is in sync.");
} else {
  await Deno.writeTextFile(SCHEMA_PATH, generated);
  console.log(`Wrote ${SCHEMA_PATH.pathname}`);
}
