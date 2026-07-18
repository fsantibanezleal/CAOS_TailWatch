# 01, Overview

TailWatch is split into a heavy **offline engine** (`data-pipeline/twlab/`) and a **frontend SPA** (`frontend/`),
bound by two data contracts. The committed compact artifacts under `data/derived/` are the offline engine's real
outputs and the SPA's replay payload.

```
forward sim (science/forward.py) ──► 20 synthetic Sentinel-1 scenes (.h5, data/raw, git-ignored, 168 MB)
                                          │
2-geometry SBAS (science/sbas.py) ───────►├─► Up/East displacement decomposition + velocity
                                          │
conv-AE + 1-D CNN (science/train_models) ►├─► cnn.onnx, ae.onnx                          ┐
held-out eval + forecaster benchmark ────►├─► tw-cases.json (rich manifest + benchmark  │ data/derived/
decimated per-case cubes ────────────────┴─► tw-<id>.bin (5 cases)     + false-alarm bank) │ (committed)
per-case replay (pipeline, numpy) ──(CONTRACT 2: core/manifest.py)─► data/derived/<case>/trace.json + manifests/
                                          │
frontend (copy-data.mjs overlays data/derived) ──► onnxruntime-web + TS DSP run live in the browser
```

## Packages

* **`data-pipeline/twlab/`**, the offline engine: `io/` (contracts, formats), `core/` (rng, trace, manifest, gate),
  `stages/` (the named pipeline, thin wrappers over the science), `cases/` + `registry.py` (the 5 regime cases by
  category), `science/` (the preserved verbatim forward-sim + SBAS + conv-AE/CNN training, the heavy lane),
  `pipeline.py` (orchestrator + CLI), `live.py` (dormant Pyodide).
* **`frontend/`**, the React/Vite SPA: `src/dsp/forecast.ts` (inverse-velocity + TARP), `src/lib/ort.ts`
  (onnxruntime-web), `src/viz/` (FieldMap / LatentScatter / charts), `src/pages/` (the 6 standard pages),
  `src/lib/contract.types.ts` (the Contract-2 mirror).
* **`app/`**, a dormant FastAPI backend (TailWatch is static-first).

## The two lanes

* **Default (numpy-only):** `python -m twlab.pipeline all` rebuilds every per-case replay trace + manifest from the
  committed `tw-cases.json`, no torch, no 168 MB scenes. A clone replays immediately; this is what CI + Pages run.
* **Heavy (`--retrain`):** runs the preserved `science/train_models.main` (forward sim → SBAS → train → export ONNX +
  cubes + tw-cases.json) over `data/raw/scenes/` (torch + scipy + h5py). Local-only.
