"""Load the committed CONTRACT-2 artifacts read-only (index, manifests, traces). Path-traversal guarded."""
from __future__ import annotations

import json
from pathlib import Path

from ..config import REPO_ROOT, Settings


def _derived() -> Path:
    return (REPO_ROOT / Settings().data_dir).resolve()


def load_index() -> dict:
    p = _derived() / "manifests" / "index.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {"cases": []}


def load_manifest(case_id: str) -> dict | None:
    p = _derived() / "manifests" / f"{case_id}.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def load_artifact(rel: str) -> dict | None:
    p = (_derived() / rel).resolve()
    if not str(p).startswith(str(_derived())):  # path-traversal guard
        return None
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None
