# Local dev: frontend dev server (+ the API only if app/ is activated). Dormant lanes are skipped.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$apiActive = (Test-Path requirements-api.txt) -and (Test-Path app/main.py) -and `
  ((Get-Content requirements-api.txt | Where-Object { $_ -notmatch '^\s*#' -and $_ -match '\S' }).Count -gt 0)
if ($apiActive) {
  $vr = Join-Path ".venv" "Scripts\python.exe"
  if (-not (Test-Path $vr)) { $vr = Join-Path ".venv" "bin/python" }
  Write-Host "[dev] app/ active -> uvicorn :8000 (background)"
  Start-Process $vr -ArgumentList "-m","uvicorn","app.main:app","--reload","--port","8000"
}

if (Test-Path frontend/package.json) {
  Set-Location frontend
  if (-not (Test-Path node_modules)) { npm install }
  node copy-data.mjs
  npm run dev
} else {
  Write-Host "[dev] no frontend/ -- web lane dormant for this product."
}
