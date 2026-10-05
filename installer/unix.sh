#!/usr/bin/env bash
# Interactive installer for Commit Sage (Linux & macOS)
# Usage: curl -fsSL https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/main/installer/unix.sh | bash

set -euo pipefail

VERSION="${VERSION:-1.0.0}"
INSTALL_DIR="${INSTALL_DIR:-${HOME}/.local/bin}"
ADD_TO_PATH="${ADD_TO_PATH:-true}"
REPO_URL="https://github.com/AhmedOsman101/commit-sage-cli"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# Check for required dependencies
DOWNLOADER=""
if command -v curl >/dev/null 2>&1; then
  DOWNLOADER="curl"
elif command -v wget >/dev/null 2>&1; then
  DOWNLOADER="wget"
else
  echo "Either curl or wget is required but neither is installed" >&2
  exit 1
fi

# Detect architecture
case "$(uname -m)" in
x86_64 | amd64) ARCH="x64" ;;
arm64 | aarch64) ARCH="arm64" ;;
*)
  log_error "Unsupported architecture: $(uname -m)"
  exit 1
  ;;
esac

# Detect OS for download filename
case "$(uname -s)" in
Linux) OS="linux" ;;
Darwin) OS="macos" ;;
*)
  log_error "Unsupported OS"
  exit 1
  ;;
esac

# Detect Rosetta 2 on macOS: if the shell is running as x64 under Rosetta on an ARM Mac,
# download the native arm64 binary instead of the x64 one
if [[ "${OS}" == "macos" ]] && [[ "${ARCH}" == "x64" ]]; then
  if [[ "$(sysctl -n sysctl.proc_translated 2>/dev/null)" == "1" ]]; then
    ARCH="arm64"
  fi
fi

# Detect shell (respects SHELL, then live version vars, then bash fallback)
shell_name="$(basename "${SHELL:-}")"
case "${shell_name}" in
zsh) shell="zsh" ;;
bash) shell="bash" ;;
fish) shell="bash" ;; # fish uses bash-compatible PATH line fallback
*)
  if [[ -n "${ZSH_VERSION:-}" ]]; then
    shell="zsh"
  elif [[ -n "${BASH_VERSION:-}" ]]; then
    shell="bash"
  else
    shell="bash"
  fi
  ;;
esac

# Download function that works with both curl and wget
download_file() {
  local url="$1"
  local output="$2"

  if [[ "${DOWNLOADER}" == "curl" ]]; then
    if [[ -n "${output}" ]]; then
      curl -fSL -o "${output}" "${url}"
    else
      curl -fsSL "${url}"
    fi
  elif [[ "${DOWNLOADER}" == "wget" ]]; then
    if [[ -n "${output}" ]]; then
      wget -O "${output}" "${url}"
    else
      wget -q -O - "${url}"
    fi
  else
    return 1
  fi
}

parse_tag() {
  download_file https://api.github.com/repos/AhmedOsman101/commit-sage-cli/releases/latest 2>/dev/null |
    grep '"tag_name"' | sed -E 's/.*"v?([0-9]+\.[0-9]+\.[0-9]+).*/\1/' || true
}

# Get latest version from GitHub
get_latest_version() {
  local tag
  tag="$(parse_tag)"
  if [[ -n "${tag}" ]]; then
    echo "${tag}"
    return 0
  fi
  return 1
}

# Add to PATH
add_to_path() {
  local shell_config=""

  case "${shell}" in
  zsh) shell_config="${HOME}/.zshrc" ;;
  bash)
    if [[ "$(uname -s)" == "Darwin" ]]; then
      shell_config="${HOME}/.bash_profile"
    else
      shell_config="${HOME}/.bashrc"
    fi
    ;;
  *) log_warn "Shell not supported" ;;
  esac

  # ponytail: minimal dedup — exact INSTALL_DIR string only; PATH export uses INSTALL_DIR
  local path_line="export PATH=\"${INSTALL_DIR}:\$PATH\""

  # Skip when the dir is already effective (covers orchestrator setups where
  # PATH comes from sourced modules, not the rc file itself) or when the rc
  # file already sources it — but never when neither is true.
  if [[ ":${PATH}:" == *":${INSTALL_DIR}:"* ]]; then
    log_info "PATH already includes ${INSTALL_DIR}"
    return 0
  fi
  if grep -Fq "${INSTALL_DIR}" "${shell_config}" 2>/dev/null; then
    log_info "PATH already configured in ${shell_config}"
    return 0
  fi

  printf "\n# --- Commit Sage --- #\n%s" "${path_line}" >>"${shell_config}"

  log_info "Added ${INSTALL_DIR} to PATH in ${shell_config}\n    ${path_line}\n"
  log_warn "Please restart your terminal or run: source ${shell_config}"
}

# Main
main() {
  echo -e "${GREEN}Commit Sage Installer${NC}"
  echo "=========================="

  # Get version if not set (fallback to version.txt if offline/API fails)
  if [[ "${VERSION}" == "1.0.0" ]]; then
    log_info "Fetching latest version..."
    fetched="$(get_latest_version || true)"
    if [[ -n "${fetched}" ]]; then
      VERSION="${fetched}"
    else
      log_warn "Could not fetch latest version from GitHub API; using ${VERSION}"
    fi
  fi

  log_info "Version: ${VERSION}"
  log_info "Architecture: ${ARCH}"

  # Ask for installation directory (skip prompt when piped via curl | bash)
  if [[ "${INSTALL_DIR}" == "${HOME}/.local/bin" ]] && [[ -t 0 ]]; then
    echo -n "Installation directory [${INSTALL_DIR}]: "
    if read -r input_dir 2>/dev/null; then
      if [[ -n "${input_dir}" ]]; then
        INSTALL_DIR="${input_dir}"
      fi
    fi
  elif [[ ! -t 0 ]]; then
    log_info "Non-interactive install — using ${INSTALL_DIR}"
  fi

  # Create install directory
  mkdir -p "${INSTALL_DIR}"

  # Download binary
  local url="${REPO_URL}/releases/download/v${VERSION}/commit-sage-${OS}-${ARCH}"

  log_info "Downloading Commit Sage v${VERSION} for ${OS}-${ARCH}..."
  download_file "${url}" "${INSTALL_DIR}/commit-sage" || {
    log_error "Failed to download binary. Please check the version."
    exit 1
  }
  chmod +x "${INSTALL_DIR}/commit-sage"

  # Ask about PATH (skip when non-interactive or forced ADD_TO_PATH=true)
  if ! "${ADD_TO_PATH}" && [[ -t 0 ]]; then
    echo -n "Add to PATH? [Y/n]: "
    if read -r add_path 2>/dev/null; then
      if [[ "${add_path}" =~ ^[Nn] ]]; then
        ADD_TO_PATH="false"
      else
        ADD_TO_PATH="true"
      fi
    else
      log_info "Non-interactive — leaving ADD_TO_PATH=${ADD_TO_PATH}"
    fi
  elif ! "${ADD_TO_PATH}" && [[ ! -t 0 ]]; then
    log_info "Non-interactive — leaving ADD_TO_PATH=${ADD_TO_PATH}"
  fi

  "${ADD_TO_PATH}" && add_to_path

  # Verify installation — prefer direct path, fall back to PATH binary
  local verify_bin="${INSTALL_DIR}/commit-sage"
  if [[ -x "${verify_bin}" ]]; then
    if "${verify_bin}" --version >/dev/null 2>&1; then
      log_info "Installation successful! $("${verify_bin}" --version 2>&1 | head -n 1)"
    else
      log_error "Installed binary failed: ${verify_bin} --version exited non-zero"
      exit 1
    fi
    if ! command -v commit-sage >/dev/null 2>&1; then
      log_warn "'commit-sage' not yet on PATH — try: ${verify_bin}"
      log_warn "Restart your shell or run: source ~/.bashrc (or ~/.zshrc)"
    fi
  else
    log_error "Binary not found at ${verify_bin}"
    exit 1
  fi
}

main "$@"
