#!/usr/bin/env bash
# Local dev: frontend dev server (+ the API only if app/ is activated). Dormant lanes are skipped.
set -euo pipefail
cd "$(dirname "$0")/.."

# API lane (only if app/ is active — i.e. requirements-api.txt is non-placeholder AND app has a real main)
if [ -f requirements-api.txt ] && grep -qvE '^\s*#|^\s*$' requirements-api.txt 2>/dev/null && [ -f app/main.py ]; then
  VP=".venv/bin/python"; [ -x "$VP" ] || VP=".venv/Scripts/python.exe"
  echo "[dev] app/ active -> starting uvicorn on :8000 (background)"
  "$VP" -m uvicorn app.main:app --reload --port 8000 &
fi

# Frontend (the replay SPA)
if [ -f frontend/package.json ]; then
  cd frontend
  [ -d node_modules ] || npm install
  node copy-data.mjs
  npm run dev
else
  echo "[dev] no frontend/ — this product ships without a web surface (static/web lane dormant)."
fi
