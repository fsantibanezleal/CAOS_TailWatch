"""GET-only endpoints serving the committed artifacts (read-only). No write paths."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..services import content

router = APIRouter(prefix="/api")


@router.get("/cases")
def list_cases() -> dict:
    return content.load_index()


@router.get("/cases/{case_id}/manifest")
def get_manifest(case_id: str) -> dict:
    m = content.load_manifest(case_id)
    if m is None:
        raise HTTPException(status_code=404, detail="unknown case")
    return m


@router.get("/cases/{case_id}/trace")
def get_trace(case_id: str) -> dict:
    m = content.load_manifest(case_id)
    if m is None:
        raise HTTPException(status_code=404, detail="unknown case")
    art = content.load_artifact(m["artifact"]["path"])
    if art is None:
        raise HTTPException(status_code=404, detail="missing artifact")
    return art
