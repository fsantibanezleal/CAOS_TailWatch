"""Standard-format readers/writers. EXAMPLE: CSV in (params), JSON out (compact committed artifact). A real product
adds the formats its domain demands here (parquet/npz/.vtk/.vtu/.h5/GeoTIFF) — never a bespoke ad-hoc format."""
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any


def read_csv_rows(path: str | Path) -> list[dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_json(path: str | Path, obj: Any) -> int:
    """Write compact JSON; return the byte size (used by the gate + manifest)."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(obj, separators=(",", ":"), ensure_ascii=False)
    encoded = data.encode("utf-8")
    p.write_bytes(encoded)
    return len(encoded)


def read_json(path: str | Path) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))
