#!/usr/bin/env bash

set -euo pipefail

# ---  Main script logic --- #
release-please release-pr \
  --repo-url="https://github.com/AhmedOsman101/commit-sage-cli.git" \
  --token="$GITHUB_TOKEN" \
  --release-type="simple" \
  --include-v-in-tags \
  --changelog-type="github" \
  --draft-pull-request \
  --version-file="version.txt"
