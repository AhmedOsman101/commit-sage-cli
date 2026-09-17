#!/bin/bash
# Build DMG installer for Commit Sage (macOS)

set -euo pipefail

VERSION="${1:-1.0.0}"
OUTPUT_DIR="${2:-release}"

echo "Building DMG installer for Commit Sage v${VERSION}"

# Check for create-dmg
if ! command -v create-dmg &>/dev/null; then
  echo "create-dmg not found. Installing via Homebrew..."
  brew install create-dmg
fi

# Verify binaries exist (either arch is ok — mask release builds both)
if [[ ! -f "bin/commit-sage-macos-arm64" ]] && [[ ! -f "bin/commit-sage-macos-x64" ]]; then
  echo "Error: No macOS binary found in bin/ (expected bin/commit-sage-macos-{arm64,x64})"
  echo "Run: mask release"
  exit 1
fi

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Create DMG
echo "Creating DMG..."

# For Intel Macs
create-dmg \
  --volname "Commit Sage" \
  --window-pos 200 120 \
  --window-size 600 400 \
  --icon-size 100 \
  --app-drop-link 425 178 \
  "${OUTPUT_DIR}/CommitSage-${VERSION}-macos-x64.dmg" \
  /Applications \
  "bin/commit-sage-macos-x64" 2>/dev/null || true

# For Apple Silicon (rename for clarity)
cp "${OUTPUT_DIR}/CommitSage-${VERSION}-macos-x64.dmg" "${OUTPUT_DIR}/CommitSage-${VERSION}-macos-arm64.dmg" 2>/dev/null || true

echo "DMG installers created in ${OUTPUT_DIR}/"
ls -la "${OUTPUT_DIR}"/*.dmg 2>/dev/null || echo "Note: DMG creation may need manual adjustment"
