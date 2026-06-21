# Architecture

How TailWatch is shaped as a CAOS product-repo (ADR-0057). The science core (the forward sim + SBAS + conv-AE/CNN +
the inverse-velocity baseline) is real and SOTA-pinned; the base around it is the frozen archetype, instantiated.

| # | Doc | What |
|---|---|---|
| 01 | [overview](01_overview.md) | the repo at a glance — lanes, packages, data flow |
| 02 | [determinism-and-trace](02_determinism-and-trace.md) | seeded determinism; the compact per-case replay trace |
| 03 | [the-gate](03_the-gate.md) | the measured live-vs-precompute lane gate (client-side TS DSP + ONNX) |
| 04 | [the-live-lane](04_the-live-lane.md) | onnxruntime-web + the TS DSP (inverse-velocity / TARP) in the browser |
| 05 | [precompute-pipeline](05_precompute-pipeline.md) | the named offline stages over the preserved forward-sim science |
| 06 | [model-evaluation](06_model-evaluation.md) | the by-scene held-out split + macro-F1/AUC + the forecaster self-validation |
| 07 | [deploy](07_deploy.md) | GitHub Pages static deterministic-replay |
| 08 | [data-contracts](08_data-contracts.md) | Contract 1 (InSAR scene) + Contract 2 (artifact) |
