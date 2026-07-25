$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$terminalProcesses = [System.Collections.Generic.List[System.Diagnostics.Process]]::new()
$cleanedUp = $false

function Start-ProjectTerminal {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Command
  )

  $terminalCommand = @"
Set-Location -LiteralPath '$rootDir'
`$Host.UI.RawUI.WindowTitle = '$Title'
$Command
"@

  $process = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoLogo",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-NoExit",
    "-Command",
    $terminalCommand
  ) -PassThru

  $terminalProcesses.Add($process)
}

function Stop-ProcessTree {
  param([int]$ProcessId)

  if (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) {
    & taskkill.exe /PID $ProcessId /T /F *> $null
  }
}

function Stop-AllProjectProcesses {
  if ($script:cleanedUp) {
    return
  }

  $script:cleanedUp = $true
  Write-Host "Stopping Bilal RMS local services..." -ForegroundColor Yellow

  foreach ($process in $terminalProcesses) {
    Stop-ProcessTree -ProcessId $process.Id
  }

  Push-Location $rootDir
  try {
    & docker.exe compose stop mariadb *> $null
  } finally {
    Pop-Location
  }

  Write-Host "All Bilal RMS local services stopped."
}

try {
  Start-ProjectTerminal -Title "Bilal RMS - Database" -Command "docker compose up mariadb"
  Start-ProjectTerminal -Title "Bilal RMS - Backend" -Command "npm run db:prepare; if (`$LASTEXITCODE -eq 0) { npm run dev:server }"
  Start-ProjectTerminal -Title "Bilal RMS - Frontend" -Command "npm run dev -- --host 127.0.0.1"

  Write-Host "Bilal RMS local services are starting in separate terminals." -ForegroundColor Green
  Write-Host "Frontend: http://127.0.0.1:3000"
  Write-Host "Backend:  http://127.0.0.1:5000"
  Write-Host "Press Ctrl+C in this terminal to stop the database, backend, and frontend."

  while ($true) {
    Start-Sleep -Seconds 1
  }
} finally {
  Stop-AllProjectProcesses
}
