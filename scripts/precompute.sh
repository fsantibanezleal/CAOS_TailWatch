#!/usr/bin/env bash
# Run the offline pipeline (pass-through). ./scripts/precompute.sh [case|all] [--retrain]
set -euo pipefail; cd "$(dirname "$0")/.."
VP=".venv-pipeline/bin/python"; [ -x "$VP" ] || VP=".venv-pipeline/Scripts/python.exe"
"$VP" -m twlab.pipeline "$@"
