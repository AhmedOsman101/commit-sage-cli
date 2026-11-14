/*
Sync the version baked into the NSIS Windows installer from `package.json`.

The NSIS `VIProductVersion`/`FileVersion`/`ProductVersion` keys used to be edited
by hand and drifted badly. The installer is a build artifact for releases, so its
version must always equal the released package version.

Usage:
  mask sync-installer-version            # write (exit 0 even if no change)
  mask sync-installer-version --check    # verify in sync; exit 1 on drift
*/

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const PKG_PATH = resolve(ROOT, "package.json");
const NSI_PATH = resolve(ROOT, "installer", "windows", "commit-sage.nsi");

// Check mode is only triggered by a bare `--check` arg, e.g.
// `mask sync-installer-version --check` or `bun run scripts/sync-installer-version.ts --check`.
const MODE = Bun.argv.includes("--check") ? "check" : "write";

const pkg = JSON.parse(readFileSync(PKG_PATH, "utf8"));
const version: string | undefined = pkg.version;
if (!version || typeof version !== "string") {
  console.error("package.json has no valid `version` field");
  process.exit(1);
}

// NSIS version fields are dotted quadruples (e.g. 3.2.2.0). The package version
// is a dotted triple; the fourth component is always 0 for this project.
const nsiVersion = `${version}.0`;
const nsiFileVersion = version;

// Match the three version-bearing directives. Note the NSIS syntax: the
// FileVersion/ProductVersion keys live inside VIAddVersionKey lines, so the
// pattern must match the quoted key, not bare whitespace after the name.
const REPLACEMENTS: Array<[RegExp, string]> = [
  [/VIProductVersion\s+"[^"]*"/, `VIProductVersion "${nsiVersion}"`],
  [/"FileVersion"\s+"[^"]*"/, `"FileVersion" "${nsiFileVersion}"`],
  [/"ProductVersion"\s+"[^"]*"/, `"ProductVersion" "${nsiFileVersion}"`],
];

let source = readFileSync(NSI_PATH, "utf8");
const original = source;
for (const [pattern, replacement] of REPLACEMENTS) {
  source = source.replace(pattern, replacement);
}
const changed = source !== original;

if (MODE === "check") {
  if (changed) {
    console.error(
      `Installer version is out of sync (package.json ${version}, NSIS ${nsiVersion}).\n` +
        "Run: mask sync-installer-version"
    );
    process.exit(1);
  }
  console.log(`Installer version in sync (${nsiVersion}).`);
  process.exit(0);
}

writeFileSync(NSI_PATH, source);
console.log(
  changed
    ? `Installer version synced to ${nsiVersion} (from package.json ${version}).`
    : `Installer version already at ${nsiVersion}.`
);
process.exit(0);
