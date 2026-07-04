"""The measured live-vs-precompute GATE (ADR-0054), adapted for TailWatch's client-side lane.

TailWatch runs its live inference ENTIRELY in the browser, onnxruntime-web executes the trained conv-AE + 1-D CNN
ONNX models over the committed decimated cubes, and a TypeScript DSP does the inverse-velocity forecast, so the
"live wheels" of the SIR template become "client-side runtimes". A case runs LIVE iff it is client-side AND its
runtimes are a subset of the deployed set AND a single forward pass + its replay cube are within budget; otherwise it
is PRECOMPUTE. The conv-AE/CNN forward passes are milliseconds; the cubes are committed (lazy-loaded per case). The
verdict + budgets go into the manifest; CI fails on mislabeling. A MEASUREMENT, never a hand-wave."""
from __future__ import annotations

LIVE_RUNTIMES: set[str] = {"ts-dsp", "onnxruntime-web"}
RUN_MS_GATE = 1500.0
TRACE_BYTES_GATE = 256 * 1024   # the per-case manifest/trace stays small; the cube is the separate replay payload


def classify_lane(*, client_side: bool, runtimes: set[str], run_ms: float, trace_bytes: int) -> dict:
    reasons: list[str] = []
    live = True
    if not client_side:
        live = False
        reasons.append("not client-side (needs a server)")
    extra = set(runtimes) - LIVE_RUNTIMES
    if extra:
        live = False
        reasons.append(f"runtimes not in the deployed client set: {sorted(extra)}")
    if run_ms > RUN_MS_GATE:
        live = False
        reasons.append(f"runtime exceeds the {RUN_MS_GATE:.0f}ms budget")
    if trace_bytes > TRACE_BYTES_GATE:
        live = False
        reasons.append(f"trace_bytes {trace_bytes} > {TRACE_BYTES_GATE}")
    return {
        "lane": "live" if live else "precompute",
        "client_side": client_side,
        "runtimes": sorted(runtimes),
        "trace_bytes": trace_bytes,
        "run_ms_budget": RUN_MS_GATE,
        "trace_bytes_budget": TRACE_BYTES_GATE,
        "reasons": reasons,
    }
