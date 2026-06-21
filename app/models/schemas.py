"""Read-only DTOs mirroring CONTRACT 2 (the manifest). Pydantic v2. The web's contract.types.ts is the canonical
mirror; these are the server-side echo for typed responses when the backend is active."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ArtifactRef(BaseModel):
    path: str
    format: str
    trace_schema: str
    bytes: int


class CaseManifest(BaseModel):
    schema_: str = Field(alias="schema")
    case_id: str
    category: str
    artifact: ArtifactRef
    lane: str

    model_config = {"populate_by_name": True}
