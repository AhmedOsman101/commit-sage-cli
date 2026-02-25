#!/usr/bin/env bash

set -euo pipefail

FORCE=false

# ---  Main script logic --- #
choice="$1"
shift

# Parse additional options
while [[ $# -gt 0 ]]; do
  case "$1" in
  --force)
    FORCE=true
    shift
    ;;
  *)
    break
    ;;
  esac
done

if [[ "${choice}" == "pr" ]]; then
  release-please release-pr \
    --repo-url="https://github.com/AhmedOsman101/commit-sage-cli.git" \
    --token="${GITHUB_TOKEN}" \
    --config-file="release-please-config.json" \
    "$@"
elif [[ "${choice}" == "gh" ]]; then
  if [[ "${FORCE}" == "true" ]]; then
    # Force release: create tag, then create release (triggers workflow)
    VERSION=$(cat version.txt)
    TAG_NAME="v${VERSION}"

    echo "Force releasing v${VERSION}..."

    # Delete old tag if exists (in case of re-release)
    git push origin ":refs/tags/${TAG_NAME}" 2>/dev/null || true

    # Create and push tag
    git tag -f "${TAG_NAME}"
    git push origin "${TAG_NAME}" --force

    # Wait for git operations to settle
    sleep 3

    # Create release using gh - this triggers the workflow via 'release: published'
    gh release create "${TAG_NAME}" \
      --title "Release ${TAG_NAME}" \
      --generate-notes \
      --target main

    echo "Release created! Binaries will be built and uploaded automatically."
  else
    release-please github-release \
      --repo-url="https://github.com/AhmedOsman101/commit-sage-cli.git" \
      --token="${GITHUB_TOKEN}" \
      --config-file="release-please-config.json" \
      "$@"
  fi
else
  release-please --help
fi
