# Commit Sage Installers

## Windows

### Installer (recommended)
Download `commit-sage-setup.exe` and run the wizard.

- Default: `C:\Program Files\commitSage`
- Automatically adds to PATH
- Creates shortcuts

### Portable
Download `commit-sage-windows-x64.exe` and run directly.

## Linux & macOS

### Quick Install
```bash
curl -fsSL https://get.commitsage.dev | bash
```

The installer will:
- Ask for installation directory (default: `~/.local/bin`)
- Offer to add to PATH via shell config

### Manual
```bash
# Download the binary
curl -L https://github.com/AhmedOsman101/commit-sage-cli/releases/latest/download/commit-sage-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m) -o commit-sage
chmod +x commit-sage

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.local/bin:$PATH"
```
