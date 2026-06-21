param([switch]$Precompute)
$ErrorActionPreference = "Stop"; Set-Location (Join-Path $PSScriptRoot "..")
$py = if ($env:PYTHON) { $env:PYTHON } else { "python" }
function Get-VenvPy($dir) { $p = Join-Path $dir "Scripts\python.exe"; if (-not (Test-Path $p)) { $p = Join-Path $dir "bin/python" }; return $p }
if (-not (Test-Path ".venv-pipeline")) { & $py -m venv .venv-pipeline }
$vp = Get-VenvPy ".venv-pipeline"; & $vp -m pip install --upgrade pip -q; & $vp -m pip install -q -r requirements.txt -r requirements-dev.txt; & $vp -m pip install -q -e .
if ($Precompute) { & $vp -m pip install -q torch==2.12.1 --index-url https://download.pytorch.org/whl/cpu; & $vp -m pip install -q -r requirements-precompute.txt }
if (-not (Test-Path ".venv")) { & $py -m venv .venv }
$vr = Get-VenvPy ".venv"; & $vr -m pip install --upgrade pip -q; & $vr -m pip install -q -r requirements.txt
Write-Host "[setup] ready. Next: ./scripts/precompute.ps1"
