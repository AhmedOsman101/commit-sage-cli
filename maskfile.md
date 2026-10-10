# Commit Sage CLI

## biome (args)

> Run a biome command

```bash
unset BIOME_CONFIG_PATH &>/dev/null
unset BIOME_BINARY_PATH &>/dev/null
version=$(
  bun -e 'import pkg from "./package.json"; process.stdout.write(pkg.devDependencies["@biomejs/biome"]);'
)
pkg="@biomejs/biome@${version}"

declare -a argv
eval 'argv=(${args})'

if command -v biome &>/dev/null && [[ "$(biome --version | awk '{ print $2 }')" == "${version}" ]]; then
  biome "${argv[@]}"
elif command -v bun &>/dev/null; then
  bun run -- biome "${argv[@]}"
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
bun check
```

## schema

> Generate or verify the `config.schema.json` from `src/lib/types/configSchema.ts`

### build

> Regenerate `config.schema.json` from `src/lib/types/configSchema.ts`

```bash
bun run scripts/build-schema.ts
```

### check

> Verify the schema is in sync instead of writing (exits non-zero on drift)

```bash
bun run scripts/build-schema.ts --check
```

## run [args]

> Run the CLI

```bash
if [[ -n "${args}" ]]; then
  declare -a argv
  eval 'argv=(${args})'
  bun run src/main.ts "${argv[@]}"
else
  bun run src/main.ts
fi
```

## compile [path]

> Compiles the project at `~/.local/bin/commit-sage` or any given path

**OPTIONS**

- target
  - flags: -t --target
  - type: string
  - desc: Which target operating system to compile against.
  - choices: linux-x64, linux-arm64, linux-x64-musl, linux-arm64-musl, windows-x64, windows-arm64, darwin-x64, darwin-arm64

```bash
path="${path:-$HOME/.local/bin/commit-sage}"

if [[ -z "${target}" ]]; then
  bun build --compile "src/main.ts" --outfile "${path}"
else
  bun build --compile ${target:+--target "bun-${target}"} "src/main.ts" --outfile "${path}"
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
$MASK compile --target linux-x64 "${path}"
```

### compile linux-arm64 [path]

> Compile for Linux-arm64 at `~/.local/bin/commit-sage` or any given path

```bash
$MASK compile --target linux-arm64 "${path}"
```

### compile linux-x64-musl [path]

> Compile for Linux-x64-musl at `~/.local/bin/commit-sage` or any given path

```bash
$MASK compile --target linux-x64-musl "${path}"
```

### compile linux-arm64-musl [path]

> Compile for Linux-arm64-musl at `~/.local/bin/commit-sage` or any given path

```bash
$MASK compile --target linux-arm64-musl "${path}"
```

### compile macos-x64 [path]

> Compile for macOS-x64 at `~/.local/bin/commit-sage` or any given path

```bash
$MASK compile --target darwin-x64 "${path}"
```

### compile macos-arm64 [path]

> Compile for macOS-arm64 at `~/.local/bin/commit-sage` or any given path

```bash
$MASK compile --target darwin-arm64 "${path}"
```

### compile windows-x64 [path]

> Compile for Windows-x64 at `~/.local/bin/commit-sage.exe` or any given path

```bash
[[ "${path}" != *".exe" ]] && path="${path}.exe"
$MASK compile --target windows-x64 "${path}"
```

### compile windows-arm64 [path]

> Compile for Windows-arm64 at `~/.local/bin/commit-sage.exe` or any given path

```bash
[[ "${path}" != *".exe" ]] && path="${path}.exe"
$MASK compile --target windows-arm64 "${path}"
```

## release

> Build the release version for all platforms

```bash
baseDir="$(git rev-parse --show-toplevel)"

mkdir -p "${baseDir}/bin" &>/dev/null

# --- Build the binaries --- #
# Drop stale binaries.
rm -f "${baseDir}"/bin/commit-sage-* &>/dev/null
for os in 'macos' 'windows'; do
  for arch in 'x64' 'arm64'; do
    ${MASK} compile "${os}-${arch}" "bin/commit-sage-${os}-${arch}"
  done
done

# Compile the Linux binaries against the glibc and musl libraries
for lib in 'gnu' 'musl'; do
  for arch in 'x64' 'arm64'; do
    if [[ "${lib}" == "gnu" ]]; then
      ${MASK} compile "linux-${arch}" "bin/commit-sage-linux-${lib}-${arch}"
    else
      ${MASK} compile "linux-${arch}-${lib}" "bin/commit-sage-linux-${lib}-${arch}"
    fi
  done
done
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
