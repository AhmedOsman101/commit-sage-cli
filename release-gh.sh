#!/usr/bin/env bash

set -euo pipefail

# ---  Main script logic --- #
choice=$1
shift

if [[ "${choice}" == "pr" ]]; then
  release-please release-pr \
    --repo-url="https://github.com/AhmedOsman101/commit-sage-cli.git" \
    --token="$GITHUB_TOKEN" \
    --config-file="release-please-config.json" \
    "$@"
elif [[ "${choice}" == "gh" ]]; then
  release-please github-release \
    --repo-url="https://github.com/AhmedOsman101/commit-sage-cli.git" \
    --token="$GITHUB_TOKEN" \
    --config-file="release-please-config.json" \
    "$@"
else
  release-please --help
fi
