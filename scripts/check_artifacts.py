"""Validate CONTRACT 2 on disk (the pipeline -> web artifact contract): the index references every case; each
manifest exists; each artifact exists, is non-empty, and its byte size matches the manifest; the lane matches the
gate verdict. Stdlib only (runs in CI WITHOUT installing the package). Exit non-zero on any drift.

Used by scripts/smoke.* and by .github/workflows/ci.yml — the mechanical guard that a product can't regress to
serving artifacts that don't match their manifests."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DERIVED = ROOT / "data" / "derived"
MANIFESTS = DERIVED / "manifests"


def main() -> int:
    idx_path = MANIFESTS / "index.json"
    if not idx_path.exists():
        print(f"FAIL: missing {idx_path} (run scripts/precompute.sh first)")
        return 1
    index = json.loads(idx_path.read_text(encoding="utf-8"))
    errs: list[str] = []
    for entry in index.get("cases", []):
        mp = DERIVED / entry["manifest_path"]
        if not mp.exists():
            errs.append(f"missing manifest: {mp}")
            continue
        m = json.loads(mp.read_text(encoding="utf-8"))
        art = DERIVED / m["artifact"]["path"]
        if not art.exists():
            errs.append(f"missing artifact: {art}")
            continue
        size = art.stat().st_size
        if size != m["artifact"]["bytes"]:
            errs.append(f"byte drift {art}: manifest={m['artifact']['bytes']} disk={size}")
        if size == 0:
            errs.append(f"empty artifact: {art}")
        if m.get("gate", {}).get("lane") != m.get("lane"):
            errs.append(f"lane/gate mismatch: {entry['case_id']}")
    if errs:
        print("CONTRACT 2 DRIFT:")
        for e in errs:
            print("  -", e)
        return 1
    print(f"CONTRACT 2 OK: {len(index.get('cases', []))} cases, manifests <-> artifacts consistent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
