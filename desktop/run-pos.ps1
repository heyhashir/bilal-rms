$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$remoteUrl = $env:BILAL_RMS_REMOTE_URL
if ([string]::IsNullOrWhiteSpace($remoteUrl)) {
  $remoteUrl = Read-Host "Enter the live Hostinger app URL (for example https://your-domain.example)"
}

if ([string]::IsNullOrWhiteSpace($remoteUrl)) {
  throw "BILAL_RMS_REMOTE_URL is required."
}

$env:BILAL_RMS_REMOTE_URL = $remoteUrl

Write-Host "Building Bilal RMS for the Windows desktop POS..."
npm run build

Write-Host "Starting the Electron-based POS desktop app..."
npm run desktop:install
npm run desktop:start
