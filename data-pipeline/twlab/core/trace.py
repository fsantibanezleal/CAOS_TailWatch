"""The compact per-case TRACE = the web-replay artifact. Part of CONTRACT 2: its shape is mirrored by
frontend/src/lib/contract.types.ts, so a drift fails the web build. Each trace is built deterministically from the
committed rich manifest (tw-cases.json, the heavy lane's real output), it references the shared decimated cube
(tw-<id>.bin) and the global held-out benchmark + forecast, never copying them."""
from __future__ import annotations

from typing import Any

TRACE_SCHEMA = "tailwatch.trace/v1"


def build_trace(case: Any, *, manifest_json: dict) -> dict:
    cm = next((c for c in manifest_json.get("cases", []) if c["id"] == case.id), None)
    if cm is None:
        raise KeyError(f"case {case.id!r} not found in tw-cases.json")
    bench = manifest_json.get("benchmark", {})
    # per-case grid override (real cubes are a different size / epoch count than the synthetic global grid)
    grid = {"W": cm.get("W", manifest_json.get("W")), "H": cm.get("H", manifest_json.get("H")),
            "nEp": cm.get("nEp", manifest_json.get("nEp"))}
    return {
        "schema": TRACE_SCHEMA,
        "case_id": case.id,
        "category": case.category,
        "regime": case.regime,
        "real_or_synthetic": case.real_or_synthetic,
        "source": cm.get("source", "synthetic"),
        "provenance": cm.get("provenance"),
        "expected_band": case.expected_band,
        "labels": {"en": cm.get("en"), "es": cm.get("es")},
        "latent": cm.get("latent"),
        "cube": f"tw-{case.id}.bin",
        "grid": grid,
        # the global held-out numbers this case is evaluated within (referenced, not recomputed)
        "benchmark": {"macroF1": bench.get("macroF1"), "aeAuc": bench.get("aeAuc"), "velAuc": bench.get("velAuc"),
                      "heldOut": bench.get("heldOut"), "trainScenes": bench.get("trainScenes")},
        "forecast": manifest_json.get("forecast"),
    }
