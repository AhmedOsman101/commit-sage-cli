# Build Inno Setup installer for Commit Sage
# Requires Inno Setup: https://jrsoftware.org/isinfo.php

param(
    [string]$Version = "1.0.0",
    [string]$BinaryPath = "bin\commit-sage-windows-x64.exe",
    [string]$OutputPath = "release"
)

$ErrorActionPreference = "Stop"

Write-Host "Building Inno Setup installer for Commit Sage v$Version" -ForegroundColor Cyan

# Check if Inno Setup is installed
$innoSetupPath = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $innoSetupPath)) {
    $innoSetupPath = "${env:ProgramFiles}\Inno Setup 6\ISCC.exe"
}

if (-not (Test-Path $innoSetupPath)) {
    Write-Host "Inno Setup not found. Please install from: https://jrsoftware.org/isinfo.php" -ForegroundColor Red
    Write-Host "Or use chocolatey: choco install innosetup" -ForegroundColor Yellow
    exit 1
}

# Verify binary exists
if (-not (Test-Path $BinaryPath)) {
    Write-Error "Binary not found at: $BinaryPath. Run release.sh first."
}

# Create output directory
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
}

# Update version in iss file
$issContent = Get-Content "installer\windows\innosetup.iss" -Raw
$issContent = $issContent -replace 'MyAppVersion "\d+\.\d+\.\d+"', "MyAppVersion `"$Version`""
Set-Content -Path "installer\windows\innosetup.iss" -Value $issContent

# Build the installer
Write-Host "Building installer..." -ForegroundColor Green
& $innoSetupPath "installer\windows\innosetup.iss"

Write-Host "Installer created: $OutputPath\commit-sage-$Version-windows-x64.exe" -ForegroundColor Green
