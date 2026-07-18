# 03, The lane gate

`core/gate.py::classify_lane` is the **measured** decision of whether a case runs live in the browser or is replayed
(ADR-0054). For TailWatch the SIR-template's "Pyodide-safe wheels" become **client-side runtimes**: the live lane is
`onnxruntime-web` (the exported conv-AE / 1-D CNN) + a TypeScript DSP (`ts-dsp`: inverse-velocity, coherence, the
cumulative scrubber, TARP).

A case is classified **live** iff:

1. it is **client-side** (no server needed), and
2. its runtimes ⊆ `{ts-dsp, onnxruntime-web}` (the deployed client set), and
3. a single forward pass fits the interaction budget (`run_ms ≤ 1500`), and
4. its per-case manifest/trace is small (`trace_bytes ≤ 256 KB`), the cube is the separate lazy-loaded replay payload.

A conv-AE patch pass + a 1-D CNN series pass are **milliseconds**, and the traces reference (not copy) the cube, so
**every** TailWatch case passes the gate. The verdict + the deterministic budgets are stamped into each manifest;
`scripts/check_artifacts.py` (CI) fails if a manifest's `lane` disagrees with its `gate.lane`, a measured verdict
rather than an asserted one.
