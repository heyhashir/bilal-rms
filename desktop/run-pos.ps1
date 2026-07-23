$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Building frontend and backend for the local POS runtime..."
npm run build:client
npm run build:server

Write-Host "Starting the Bilal RMS server for the POS terminal..."
$job = Start-Job -ScriptBlock {
  param($path)
  Set-Location $path
  npm run start
} -ArgumentList $root

Start-Sleep -Seconds 5

Write-Host "Opening POS terminal in the default browser..."
Start-Process "http://localhost:5000/pos"

Write-Host "Server job started with Id $($job.Id). Use 'Receive-Job -Id $($job.Id) -Keep' to inspect logs."
