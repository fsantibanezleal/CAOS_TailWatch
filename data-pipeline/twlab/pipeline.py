"""The offline pipeline orchestrator + CLI (ADR-0057). Per case it applies CONTRACT 1, builds the compact per-case
trace from the committed rich manifest (tw-cases.json), runs the lane gate, and writes the manifest + a flat index
(CONTRACT 2). The committed ONNX + cubes + tw-cases.json ARE the heavy lane's real outputs, so the DEFAULT path is
light (stdlib, no torch) and deterministic. `--retrain` regenerates those artifacts from the synthetic forward
simulation (torch + scipy + h5py) — see stages/.

    python -m twlab.pipeline                 # rebuild all replay traces + manifests from the committed manifest
    python -m twlab.pipeline accel           # one case
    python -m twlab.pipeline all --retrain   # forward-sim -> SBAS -> train conv-AE+CNN -> export ONNX/cubes, then rebuild
"""
from __future__ import annotations

import argparse
from pathlib import Path

from . import registry
from .core.manifest import build_index
from .io.contract import validate_records
from .io.formats import read_json, write_json
from .stages import export

REPO_ROOT = Path(__file__).resolve().parents[2]
DERIVED = REPO_ROOT / "data" / "derived"
MANIFESTS = DERIVED / "manifests"
RAW_SCENES = REPO_ROOT / "data" / "raw" / "scenes"

STAGES = ("preprocess", "feature_extraction", "train", "infer", "evaluate", "export")


def _load_manifest() -> dict:
    p = DERIVED / "tw-cases.json"
    if not p.exists():
        raise SystemExit(
            f"missing committed artifact {p}. tw-cases.json is the heavy lane's rich output — run "
            f"`python -m twlab.pipeline all --retrain` to regenerate it, or restore the committed copy."
        )
    return read_json(p)


def _contract_flags(manifest_json: dict) -> list[dict]:
    """Apply CONTRACT 1 to the 5 cases' scene descriptors — proves the ingestion gate, carries flags."""
    W, H, n_ep = manifest_json.get("W", 160), manifest_json.get("H", 120), manifest_json.get("nEp", 60)
    rows = [{"scene_id": c.id, "W": W, "H": H, "n_ep": n_ep, "regime": c.regime} for c in registry.list_cases()]
    return validate_records(rows).flagged


def precompute(case_id: str, seed: int = 42,
               manifest_json: dict | None = None, flags: list[dict] | None = None) -> dict:
    case = registry.get_case(case_id)
    mj = manifest_json if manifest_json is not None else _load_manifest()
    return export.build_replay(
        case, derived_dir=str(DERIVED), manifests_dir=str(MANIFESTS),
        manifest_json=mj, contract_flags=(flags if flags is not None else _contract_flags(mj)), seed=seed,
    )


def retrain(seed: int = 42) -> None:
    """HEAVY lane: regenerate the ONNX models + cubes + tw-cases.json from the synthetic forward simulation. The
    real science is preserved verbatim in twlab/science/ (forward sim + SBAS + the conv-AE/CNN training + the cube/
    manifest export); the named steps map to its functions (scene_fields=preprocess, pixel_series_dataset/
    velocity_patches=feature_extraction, train_cnn/train_ae=train, anomaly_map=infer, the held-out ROC/F1=evaluate,
    the cube+tw-cases.json write=export). Needs torch + scipy + h5py + the scenes in data/raw/scenes."""
    if not RAW_SCENES.exists():
        raise SystemExit(f"raw scenes not found in {RAW_SCENES}. Generate them with the forward sim first "
                         f"(twlab/science/forward.py) — see docs/guides/01_precompute-pipeline.md.")
    from .science import train_models
    print(f"[retrain] forward sim + SBAS + conv-AE/CNN train over {RAW_SCENES} ...", flush=True)
    train_models.main()
    print(f"[retrain] wrote ONNX + cubes + tw-cases.json -> {DERIVED}", flush=True)


def run_all(seed: int = 42) -> list[dict]:
    mj = _load_manifest()
    flags = _contract_flags(mj)
    entries = []
    for c in registry.list_cases():
        precompute(c.id, seed=seed, manifest_json=mj, flags=flags)
        entries.append({"case_id": c.id, "category": c.category, "regime": c.regime,
                        "manifest_path": f"manifests/{c.id}.json"})
    write_json(MANIFESTS / "index.json", build_index(entries))
    return entries


def main() -> None:
    ap = argparse.ArgumentParser(prog="twlab.pipeline")
    ap.add_argument("case", nargs="?", default="all", help="a case id, or 'all'")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--retrain", action="store_true",
                    help="regenerate the ONNX/cubes/tw-cases.json from the synthetic forward sim (torch + scipy + h5py)")
    args = ap.parse_args()
    if args.retrain:
        retrain(args.seed)
    if args.case == "all":
        entries = run_all(args.seed)
        print(f"precomputed {len(entries)} cases -> {DERIVED}")
        for e in entries:
            print(f"  {e['case_id']:10s} [{e['category']}]")
        print(f"index -> {MANIFESTS / 'index.json'}")
    else:
        m = precompute(args.case, args.seed)
        print(f"precomputed {args.case}: lane={m['lane']} bytes={m['artifact']['bytes']} "
              f"metrics={m['metrics']} -> {DERIVED / m['artifact']['path']}")


if __name__ == "__main__":
    main()
