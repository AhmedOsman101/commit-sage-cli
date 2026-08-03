# Commit Sage CLI

## biome (args)

> Run a biome command

```bash
unset BIOME_CONFIG_PATH &>/dev/null
unset BIOME_BINARY_PATH &>/dev/null
version="2.5.6"
pkg="@biomejs/biome@${version}"

declare -a argv
eval 'argv=(${args})'

if command -v biome &>/dev/null && [[ "$(biome --version | awk '{ print $2 }')" == "${version}" ]]; then
  biome "${argv[@]}"
elif command -v pnpm &>/dev/null; then
  pnpm dlx "${pkg}" "${argv[@]}"
elif command -v bunx &>/dev/null; then
  bunx "${pkg}" "${argv[@]}"
elif command -v bun &>/dev/null; then
  bun x "${pkg}" "${argv[@]}"
elif command -v npx &>/dev/null; then
  npx "${pkg}" "${argv[@]}"
else
  echo "Failed to run biome."
fi
```

## lint

> Lint the project

**OPTIONS**

- reporter
  - flags: --reporter
  - type: string
  - desc: Output format (default|json|json-pretty|github|summary|concise)

```bash
args=(check . ${reporter:+--reporter "${reporter}"})
$MASK biome "${args[*]}"
```

## format

> Lint and format the project

**OPTIONS**

- reporter
  - flags: --reporter
  - type: string
  - desc: Output format (default|json|json-pretty|github|summary|concise)
- unsafe
  - flags: --unsafe
  - type: boolean
  - desc: Apply unsafe fixes

```bash
args=(check --fix . ${reporter:+--reporter "${reporter}"} ${unsafe:+'--unsafe'})
$MASK biome "${args[*]}"
```

## typecheck

> Run type-checking

```bash
deno check
```

## run

> Run the CLI

```bash
deno run -A src/main.ts
```

## compile [path]

> Compiles the project at `~/.local/bin/commit-sage` or any given path

**OPTIONS**

- target
  - flags: -t --target
  - type: string
  - desc: Which target operating system to compile against.
  - choices: x86_64-unknown-linux-gnu, aarch64-unknown-linux-gnu, x86_64-pc-windows-msvc, aarch64-pc-windows-msvc, x86_64-apple-darwin, aarch64-apple-darwin

```bash
path="${path:-$HOME/.local/bin/commit-sage}"

if [[ -z "${target}" ]]; then
  deno compile -A -o "${path}" src/main.ts
else
  deno compile -A -o "${path}" ${target:+--target "${target}"} src/main.ts
fi
```

### compile dev

> Compile at `~/scripts/bin/commit-sage` (personal shortcut because I'm lazy)

```bash
$MASK compile "${SCRIPTS_DIR:-${HOME}/scripts}/bin/commit-sage"
```

### compile linux-x64 [path]

> Compile for Linux-x64 at `~/.local/bin/commit-sage` or any given path

```bash
$MASK compile --target x86_64-unknown-linux-gnu "${path}"
```

### compile linux-arm64 [path]

> Compile for Linux-arm64 at `~/.local/bin/commit-sage` or any given path

```bash
$MASK compile --target aarch64-unknown-linux-gnu "${path}"
```

### compile macos-x64 [path]

> Compile for macOS-x64 at `~/.local/bin/commit-sage` or any given path

```bash
$MASK compile --target x86_64-apple-darwin "${path}"
```

### compile macos-arm64 [path]

> Compile for macOS-arm64 at `~/.local/bin/commit-sage` or any given path

```bash
$MASK compile --target aarch64-apple-darwin "${path}"
```

### compile windows-x64 [path]

> Compile for Windows-x64 at `~/.local/bin/commit-sage` or any given path

```bash
$MASK compile --target x86_64-pc-windows-msvc "${path}"
```

### compile windows-arm64 [path]

> Compile for Windows-arm64 at `~/.local/bin/commit-sage` or any given path

```bash
$MASK compile --target aarch64-pc-windows-msvc "${path}"
```

## release

> Build the release version for all platforms

```bash
baseDir="$(git rev-parse --show-toplevel)"

mkdir -p "${baseDir}/bin" &>/dev/null

# --- Linux --- #
$MASK compile linux-x64 bin/commit-sage-linux-x64
$MASK compile linux-arm64 bin/commit-sage-linux-arm64

# --- Windows --- #
$MASK compile windows-x64 bin/commit-sage-windows-x64.exe
$MASK compile windows-arm64 bin/commit-sage-windows-arm64.exe

# --- MacOS --- #
$MASK compile macos-x64 bin/commit-sage-macos-x64
$MASK compile macos-arm64 bin/commit-sage-macos-arm64
```

### pr [args]

> Create a release PR using release-please

```bash
declare -a argv
eval 'argv=(${args})'
remote="$(git remote get-url origin)"
repoUrl="${remote/git@github.com:/https://github.com/}.git"

release-please release-pr \
  --repo-url="${repoUrl}" \
  --token="${GITHUB_TOKEN:-token-missing}" \
  --config-file="release-please-config.json" \
  "${argv[@]}"
```

### gh [args]

> Create a release PR using release-please

**OPTIONS**

- force
  - flags: -f --force
  - type: boolean
  - desc: Force release or not

```bash
declare -a argv
eval 'argv=(${args})'
remote="$(git remote get-url origin)"
repoUrl="${remote/git@github.com:/https://github.com/}.git"

if [[ "${FORCE}" == "true" ]]; then
  # Force release: create tag, then create release (triggers workflow)
  VERSION="$(cat version.txt)"
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
    --repo-url="${repoUrl}" \
    --token="${GITHUB_TOKEN:-token-missing}" \
    --config-file="release-please-config.json" \
    "${argv[@]}"
fi
```
