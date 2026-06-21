"""Stage 6 — export (CONTRACT 2). Two paths:

* build_replay (LIGHT, stdlib): the default pipeline path. Builds the compact per-case trace from the committed rich
  manifest (tw-cases.json), runs the lane gate, and writes the manifest. No torch/scipy/h5 — so the contract + replay
  regenerate deterministically anywhere, and CI stays fast.
* export_models (HEAVY, torch): the --retrain path. Writes cnn.onnx + ae.onnx (opset 17), the decimated per-case
  cubes (tw-<id>.bin), and the rich tw-cases.json — the artifacts the LIGHT path then consumes.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from ..core.gate import classify_lane
from ..core.manifest import build_case_manifest
from ..core.trace import build_trace
from ..io.formats import write_json

_RUN_MS = 10.0
_RUNTIMES = {"ts-dsp", "onnxruntime-web"}


def build_replay(case: Any, *, derived_dir: str, manifests_dir: str,
                 manifest_json: dict, contract_flags: list[dict], seed: int) -> dict:
    trace = build_trace(case, manifest_json=manifest_json)
    artifact_rel = f"{case.id}/trace.json"
    trace_bytes = write_json(Path(derived_dir) / artifact_rel, trace)
    gate = classify_lane(client_side=True, runtimes=_RUNTIMES, run_ms=_RUN_MS, trace_bytes=trace_bytes)
    b = manifest_json.get("benchmark", {})
    metrics = {"macroF1": b.get("macroF1", 0.0), "aeAuc": b.get("aeAuc", 0.0), "velAuc": b.get("velAuc", 0.0),
               "detectRate": manifest_json.get("forecast", {}).get("detectRate", 0.0)}
    manifest = build_case_manifest(
        case=case, seed=seed, artifact_rel=artifact_rel, trace_bytes=trace_bytes,
        gate=gate, flags=contract_flags, metrics=metrics,
    )
    write_json(Path(manifests_dir) / f"{case.id}.json", manifest)
    return manifest

# The HEAVY export (writing cnn.onnx + ae.onnx + the per-case cubes + tw-cases.json) is done by the preserved
# science orchestrator `twlab/science/train_models.py::main()` — invoked by `pipeline.retrain` — which writes those
# artifacts to data/derived/. The named export step there is `export`; this module is the LIGHT replay builder.
