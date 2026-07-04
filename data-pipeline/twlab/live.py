"""LIVE lane entrypoint, DORMANT for TailWatch.

The archetype's reference live lane is Pyodide running this module in the browser. TailWatch instead implements its
live lane as a small TypeScript DSP (inverse-velocity / coherence / scrubber) + onnxruntime-web running the EXPORTED
conv-AE / 1-D CNN ONNX over the committed decimated cubes, explicitly permitted by the archetype ("Pyodide +
lightweight wheels, OR a small TS engine"). That path uses the same trained models, so this Pyodide entrypoint is
present-but-dormant; the gate (core/gate.py) still classifies each case's lane."""
from __future__ import annotations


def run_trace_json(*_args, **_kwargs):  # pragma: no cover - dormant
    raise NotImplementedError(
        "TailWatch's live lane is TS DSP + onnxruntime-web (frontend/), not Pyodide. This entrypoint is dormant."
    )
