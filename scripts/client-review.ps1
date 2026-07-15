[CmdletBinding()]
param(
  [string]$RepoUrl = "https://github.com/MuhammadHashir19/bilal-rms.git",
  [string]$Branch = "docs/professional-readme",
  [string]$InstallPath = (Join-Path $HOME "BilalRmsReview"),
  [int]$Port = 5000
)

$ErrorActionPreference = "Stop"

function Invoke-Checked {
  param(
    [string]$Command,
    [string[]]$Arguments
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "The command failed with exit code ${LASTEXITCODE}: $Command $($Arguments -join ' ')"
  }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker Desktop is required. Install Docker Desktop, start it, and run this script again."
}

try {
  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop is installed but its engine is not running. Start Docker Desktop and run this script again."
  }
} catch {
  throw $_
}

$resolvedInstallPath = [System.IO.Path]::GetFullPath($InstallPath)
$parentPath = Split-Path -Parent $resolvedInstallPath

New-Item -ItemType Directory -Force -Path $parentPath | Out-Null

if (-not (Test-Path (Join-Path $resolvedInstallPath "compose.yaml"))) {
  if (Test-Path $resolvedInstallPath) {
    $existingItems = Get-ChildItem -Force $resolvedInstallPath
    if ($existingItems.Count -gt 0) {
      throw "The install folder is not empty and does not contain compose.yaml: $resolvedInstallPath"
    }
  } else {
    New-Item -ItemType Directory -Force -Path $resolvedInstallPath | Out-Null
  }

  $mount = "type=bind,source=$parentPath,destination=/work"
  $folderName = Split-Path -Leaf $resolvedInstallPath
  Write-Host "Downloading Bilal RMS from $RepoUrl ($Branch)..." -ForegroundColor Cyan
  Invoke-Checked "docker" @(
    "run", "--rm",
    "--mount", $mount,
    "alpine/git", "clone", "--depth", "1", "--branch", $Branch,
    $RepoUrl, "/work/$folderName"
  )
}

Push-Location $resolvedInstallPath
try {
  $env:BILAL_RMS_PORT = "$Port"
  Write-Host "Building and starting Bilal RMS..." -ForegroundColor Cyan
  Invoke-Checked "docker" @("compose", "up", "--build", "-d")

  $url = "http://localhost:$Port"
  $healthy = $false
  for ($attempt = 1; $attempt -le 60; $attempt += 1) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri "$url/api/v1/health" -TimeoutSec 3
      if ($response.StatusCode -eq 200) {
        $healthy = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  if (-not $healthy) {
    docker compose logs --tail 100 app
    throw "Bilal RMS did not become healthy within the expected startup time."
  }

  Write-Host "Bilal RMS is ready at $url" -ForegroundColor Green
  Write-Host "Admin email: admin@bilalgarments.pk" -ForegroundColor Yellow
  Write-Host "Admin password: admin123" -ForegroundColor Yellow
  Start-Process $url
} finally {
  Remove-Item Env:BILAL_RMS_PORT -ErrorAction SilentlyContinue
  Pop-Location
}
