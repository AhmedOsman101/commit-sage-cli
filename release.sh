#!/usr/bin/env bash

set -euo pipefail

# ---  Main script logic --- #
baseDir="$(dirname "$0")"

if [[ ! -d "${baseDir}/bin" ]]; then
  mkdir -p "${baseDir}/bin/{windows-x64,macos-x64,macos-arm64,linux-x64,linux-arm64}" || {
    echo "Cannot create bin directory" 1>&2
    exit 1
  }
fi

# --- Linux --- #
deno compile -A -o bin/commit-sage-linux-x64 --target x86_64-unknown-linux-gnu main.ts
deno compile -A -o bin/commit-sage-linux-arm64 --target aarch64-unknown-linux-gnu main.ts

# --- Windows --- #
deno compile -A -o bin/commit-sage-windows-x64.exe --target x86_64-pc-windows-msvc main.ts

# --- MacOS --- #
deno compile -A -o bin/commit-sage-macos-x64 --target x86_64-apple-darwin main.ts
deno compile -A -o bin/commit-sage-macos-arm64 --target aarch64-apple-darwin main.ts
