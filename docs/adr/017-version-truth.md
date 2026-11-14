# 0017 — Version truth

`release-please` runs with `release-type: node`, which bumps `package.json` on every release. `src/cli/version.ts` reads `package.json`, so the CLI version always matches the tag with no separate version file.

There is no `version.txt` in the repo — it was removed once `release-type: node` took over version management.
