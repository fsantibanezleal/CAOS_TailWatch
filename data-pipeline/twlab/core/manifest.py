"""CONTRACT 2 — artifact (pipeline -> web). The manifest is the authoritative, versioned record of a baked case:
its category/regime, seed, engine+version, the shared learned-tier artifacts, the compact per-case trace pointer +
byte size, the lane/gate verdict, the CONTRACT-1 flags, and the case metrics. The web loads ONLY manifests + traces
+ the shared artifacts (the ONNX + the decimated cubes); frontend/src/lib/contract.types.ts mirrors this schema so a
drift fails the build. The committed ONNX + cubes + tw-cases.json ARE the real outputs of the heavy precompute lane;
the manifest records that provenance honestly (the scenes are SYNTHETIC Sentinel-1 sims, clearly labelled)."""
from __future__ import annotations

from typing import Any

from .. import __version__
from .trace import TRACE_SCHEMA

MANIFEST_SCHEMA = "tailwatch.manifest/v2"
INDEX_SCHEMA = "tailwatch.index/v1"

DATASET = "synthetic Sentinel-1 InSAR forward simulation (von-Kármán APS + decorrelation + DEM-error + orbital ramps)"
SPLIT = "train scenes 1-16, held-out scenes 17-20 (split by scene -> no spatial leakage)"
HONESTY = (
    "The scenes are SYNTHETIC Sentinel-1 simulations, NOT real SAR — TailWatch is didactic + decision-support, not a "
    "certified alarm. The held-out split is by scene (17-20) so no patch leaks. Real tailings-dam failures (Brumadinho "
    "2019, Cadia 2018) are documented as cautionary/forecastable analogs, not re-hosted data."
)


def shared_artifacts() -> dict:
    return {
        "models": [
            {"id": "cnn", "file": "cnn.onnx", "opset": 17, "kind": "1-D CNN per-pixel 6-class classifier"},
            {"id": "ae", "file": "ae.onnx", "opset": 17, "kind": "2-D conv autoencoder spatial anomaly"},
        ],
        "manifest": "tw-cases.json",
        "forecast_benchmark": "forecast-benchmark.json",
    }


def build_case_manifest(*, case: Any, seed: int, artifact_rel: str, trace_bytes: int,
                        gate: dict, flags: list[dict], metrics: dict) -> dict:
    return {
        "schema": MANIFEST_SCHEMA,
        "case_id": case.id,
        "category": case.category,
        "regime": case.regime,
        "real_or_synthetic": case.real_or_synthetic,
        "expected_band": case.expected_band,
        "validation_anchor": case.validation_anchor,
        "engine": {"package": "twlab", "version": __version__,
                   "model": "conv-AE (anomaly) + 1-D CNN (classifier) on 2-geometry SBAS; classical inverse-velocity baseline"},
        "dataset": DATASET,
        "split": SPLIT,
        "seed": seed,
        "shared": shared_artifacts(),
        "artifact": {"path": artifact_rel, "format": "json", "trace_schema": TRACE_SCHEMA, "bytes": trace_bytes},
        "lane": gate["lane"],
        "gate": gate,
        "flags": flags,
        "metrics": metrics,
        "honesty": HONESTY,
    }


def build_index(entries: list[dict]) -> dict:
    return {
        "schema": INDEX_SCHEMA,
        "engine_version": __version__,
        "dataset": DATASET,
        "n_cases": len(entries),
        "cases": sorted(entries, key=lambda e: e["case_id"]),
    }
