# Smoke: validate the CONTRACT 2 artifacts on disk (index -> manifests -> artifacts consistent). A real product
# extends this with an HTTP/static check of the built site.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$py = Join-Path ".venv-pipeline" "Scripts\python.exe"
if (-not (Test-Path $py)) { $py = Join-Path ".venv-pipeline" "bin/python" }
if (-not (Test-Path $py)) { $py = if ($env:PYTHON) { $env:PYTHON } else { "python" } }
& $py scripts/check_artifacts.py
