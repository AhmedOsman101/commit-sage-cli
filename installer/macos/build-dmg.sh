#!/bin/bash
# Build DMG installer(s) for Commit Sage (macOS).
# Usage: build-dmg.sh [VERSION] [OUTPUT_DIR]
# Packages each macOS binary present in bin/ into its own arch-tagged DMG.
# Binaries are cross-compiled beforehand by `mask release`; this script only
# wraps them, so it needs no Deno toolchain — just create-dmg (via Homebrew).

set -euo pipefail

VERSION="${1:-1.0.0}"
OUTPUT_DIR="${2:-release}"

echo "Building DMG installer(s) for Commit Sage v${VERSION}"

if ! command -v create-dmg &>/dev/null; then
  echo "create-dmg not found. Installing via Homebrew..."
  brew install create-dmg
fi

mkdir -p "${OUTPUT_DIR}"

built=0
for arch in arm64 x64; do
  binary="bin/commit-sage-macos-${arch}"
  if [[ ! -f "${binary}" ]]; then
    echo "Skipping ${arch}: ${binary} not found."
    continue
  fi

  # create-dmg wraps a folder: stage the binary so the DMG contains exactly
  # one file plus the /Applications drop link (a bare binary dropped into
  # /Applications is intentional — same artifact as the raw download).
  stage="$(mktemp -d)"
  cp "${binary}" "${stage}/commit-sage"
  chmod +x "${stage}/commit-sage"

  echo "Creating ${arch} DMG..."
  create-dmg \
    --volname "Commit Sage" \
    --window-pos 200 120 \
    --window-size 600 400 \
    --icon-size 100 \
    --app-drop-link 425 178 \
    "${OUTPUT_DIR}/CommitSage-${VERSION}-macos-${arch}.dmg" \
    "${stage}"
  rm -rf "${stage}"

  built=$((built + 1))
done

if [[ "${built}" -eq 0 ]]; then
  echo "Error: No macOS binary found in bin/ (expected bin/commit-sage-macos-{arm64,x64})"
  echo "Run: mask release"
  exit 1
fi

echo "DMG installer(s) created in ${OUTPUT_DIR}/"
ls -la "${OUTPUT_DIR}"/*.dmg
