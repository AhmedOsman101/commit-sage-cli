#!/bin/bash
# Interactive installer for Commit Sage (Linux)
# Usage: curl -fsSL https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/main/installer/linux/install.sh | bash

set -euo pipefail

VERSION="${VERSION:-1.0.0}"
INSTALL_DIR="${INSTALL_DIR:-${HOME}/.local/bin}"
ADD_TO_PATH="${ADD_TO_PATH:-yes}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Detect architecture
detect_arch() {
  case "$(uname -m)" in
  x86_64) echo "x86_64" ;;
  aarch64 | arm64) echo "arm64" ;;
  *)
    log_error "Unsupported architecture: $(uname -m)"
    exit 1
    ;;
  esac
}

# Detect OS for download filename
detect_os() {
  case "$(uname -s)" in
  Linux) echo "linux" ;;
  Darwin) echo "macos" ;;
  *)
    log_error "Unsupported OS"
    exit 1
    ;;
  esac
}

# Detect shell
detect_shell() {
  if [[ -n "${ZSH_VERSION:-}" ]]; then
    echo "zsh"
  elif [[ -n "${BASH_VERSION:-}" ]]; then
    echo "bash"
  else
    echo "bash"
  fi
}

# Get latest version from GitHub
get_latest_version() {
  curl -s https://api.github.com/repos/AhmedOsman101/commit-sage-cli/releases/latest |
    grep '"tag_name"' | sed 's/.*v\([0-9.]*\).*/\1/'
}

# Download binary
download_binary() {
  local arch=$1
  local os=$2
  local url="https://github.com/AhmedOsman101/commit-sage-cli/releases/download/v${VERSION}/commit-sage-${os}-x64"

  if [[ "${arch}" == "arm64" ]]; then
    url="https://github.com/AhmedOsman101/commit-sage-cli/releases/download/v${VERSION}/commit-sage-${os}-arm64"
  fi

  log_info "Downloading Commit Sage v${VERSION} for ${os}-${arch}..."
  curl -fsSL "${url}" -o "${INSTALL_DIR}/commit-sage" || {
    log_error "Failed to download binary. Please check the version."
    exit 1
  }
  chmod +x "${INSTALL_DIR}/commit-sage"
}

# Add to PATH
add_to_path() {
  local shell=$1
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
  esac

  local path_line="export PATH=\"\$HOME/.local/bin:\$PATH\""

  if grep -q "${INSTALL_DIR}" "${shell_config}" 2>/dev/null; then
    log_info "PATH already configured in ${shell_config}"
    return 0
  fi

  printf "\n# --- Commit Sage --- #\n%s" "${path_line}" >>"${shell_config}"

  log_info "Added ${INSTALL_DIR} to PATH in ${shell_config}"
  log_warn "Please restart your terminal or run: source ${shell_config}"
}

# Main
main() {
  echo -e "${GREEN}Commit Sage Installer${NC}"
  echo "=========================="

  # Get version if not set
  if [[ "${VERSION}" == "1.0.0" ]]; then
    log_info "Fetching latest version..."
    VERSION="$(get_latest_version)" || true
  fi

  log_info "Version: ${VERSION}"
  log_info "Architecture: $(detect_arch)"

  # Ask for installation directory
  if [[ "${INSTALL_DIR}" == "${HOME}/.local/bin" ]]; then
    echo -n "Installation directory [${INSTALL_DIR}]: "
    read -r input_dir
    if [[ -n "${input_dir}" ]]; then
      INSTALL_DIR="${input_dir}"
    fi
  fi

  # Create install directory
  mkdir -p "${INSTALL_DIR}"

  # Download binary
  download_binary "$(detect_arch)" "$(detect_os)"

  # Ask about PATH
  if [[ "${ADD_TO_PATH}" != "yes" ]]; then
    echo -n "Add to PATH? [Y/n]: "
    read -r add_path
    if [[ "${add_path}" =~ ^[Nn] ]]; then
      ADD_TO_PATH="no"
    fi
  fi

  if [[ "${ADD_TO_PATH}" == "yes" ]]; then
    add_to_path "$(detect_shell)"
  fi

  # Verify installation
  if [[ "${INSTALL_DIR}" == "${HOME}/.local/bin" ]] || [[ ":${PATH}:" == *":${INSTALL_DIR}:"* ]]; then
    if command -v commit-sage &>/dev/null; then
      log_info "Installation successful!"
      commit-sage --version || true
    else
      log_warn "Installation complete but 'commit-sage' not found in PATH"
      log_info "Try: ${INSTALL_DIR}/commit-sage"
    fi
  else
    log_info "Installation complete!"
    log_info "Binary location: ${INSTALL_DIR}/commit-sage"
  fi
}

main "$@"
