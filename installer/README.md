# Commit Sage Installers

This directory contains installer scripts for different platforms.

## Linux

### Interactive Installer

```bash
curl -fsSL https://raw.githubusercontent.com/AhmedOsman101/commit-sage-cli/main/installer/linux/install.sh | bash
```

The installer will:

- Ask for installation directory (default: `~/.local/bin`)
- Offer to add to PATH via shell config
- Verify installation

### Manual Installation

```bash
# Download the binary
curl -L https://github.com/AhmedOsman101/commit-sage-cli/releases/latest/download/commit-sage-linux-x64 -o commit-sage
chmod +x commit-sage

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.local/bin:$PATH"
```

## macOS

### DMG Installer

1. Download `CommitSage-x.x.x-macos-x64.dmg` or `CommitSage-x.x.x-macos-arm64.dmg` (for Apple Silicon)
2. Open the DMG
3. Drag `Commit Sage` to Applications folder
4. Add to PATH:

```bash
# For bash (~/.bash_profile) or zsh (~/.zshrc)
export PATH="/Applications/Commit Sage.app/Contents/MacOS:$PATH"
```

## Windows

### MSI Installer

1. Download `commit-sage-x.x.x-windows-x64.msi`
2. Run the installer
3. Choose installation directory
4. Optionally add to PATH

### Portable

Download the `.exe` binary and run directly.
