#!/usr/bin/env bash

set -euo pipefail

# ---  Main script logic --- #
baseDir="$(dirname "$0")"

if [[ ! -d "${baseDir}/bin" ]]; then
  mkdir -p "${baseDir}/bin" || {
    echo "Cannot create bin directory" 1>&2
    exit 1
  }
fi

# --- Linux --- #
deno compile -A -o bin/commit-sage-linux-x64 --target x86_64-unknown-linux-gnu src/main.ts
deno compile -A -o bin/commit-sage-linux-arm64 --target aarch64-unknown-linux-gnu src/main.ts

# --- Windows --- #
deno compile -A -o bin/commit-sage-windows-x64 --target x86_64-pc-windows-msvc src/main.ts

# --- MacOS --- #
deno compile -A -o bin/commit-sage-macos-x64 --target x86_64-apple-darwin src/main.ts
deno compile -A -o bin/commit-sage-macos-arm64 --target aarch64-apple-darwin src/main.ts
