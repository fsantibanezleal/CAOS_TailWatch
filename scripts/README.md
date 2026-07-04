# scripts/, environment + pipeline orchestration (cross-platform)

Local scripts so **anyone** can configure the env and run the flow. Provide every script in BOTH `*.sh`
(macOS/Linux/Git-Bash) and `*.ps1` (Windows PowerShell, since Felipe runs PS).

## How to populate

| Script | What it must do |
|---|---|
| `setup.sh` / `setup.ps1` | create `.venv`, upgrade pip, install `requirements.txt -r requirements-dev.txt -r requirements-precompute.txt`; print the next commands. GPU/API lanes installed only on demand. |
| `precompute.sh` / `precompute.ps1` | run the staged pipeline: `python -m productlab.pipeline "$@"` (all cases, or one). |
| `fetch-data.sh` / `fetch-data.ps1` | (optional) stage raw inputs into `data/raw/` (gitignored). Never commit raw. |
| `serve-api.sh` / `serve-api.ps1` | (optional, only if `api/` is active) `uvicorn api.main:app --reload`. |

Rules: idempotent; detect `.venv/bin/python` vs `.venv/Scripts/python.exe`; never use global Python/Node.
Pin nothing here, versions live in `requirements-*.txt`.
