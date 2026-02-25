# Build NSIS installer for Commit Sage
# Requires NSIS: https://nsis.sourceforge.io/

param(
    [string]$BinaryPath = "bin\commit-sage-windows-x64.exe",
    [string]$OutputPath = "release"
)

$ErrorActionPreference = "Stop"

Write-Host "Building NSIS installer for Commit Sage" -ForegroundColor Cyan

# Check if NSIS is installed
$nsisPath = Get-Command makensis -ErrorAction SilentlyContinue
if (-not $nsisPath) {
    Write-Host "NSIS not found. Installing via Chocolatey..." -ForegroundColor Yellow
    choco install nsis -y
}

# Verify binary exists
if (-not (Test-Path $BinaryPath)) {
    Write-Error "Binary not found at: $BinaryPath. Run release.sh first."
}

# Create output directory
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
}

# Build the installer
Write-Host "Building installer..." -ForegroundColor Green
makensis "installer\windows\commit-sage.nsi"

Write-Host "Installer created in $OutputPath\" -ForegroundColor Green
Get-ChildItem $OutputPath -Filter *.exe
