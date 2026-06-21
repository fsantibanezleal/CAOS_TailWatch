#!/usr/bin/env bash
# Smoke: validate the CONTRACT 2 artifacts on disk (index -> manifests -> artifacts consistent). A real product
# extends this with an HTTP/static check of the built site (canonical routes/assets return 200 + non-empty).
set -euo pipefail
cd "$(dirname "$0")/.."
PY=".venv-pipeline/bin/python"; [ -x "$PY" ] || PY=".venv-pipeline/Scripts/python.exe"
[ -x "$PY" ] || PY="${PYTHON:-python}"
"$PY" scripts/check_artifacts.py
