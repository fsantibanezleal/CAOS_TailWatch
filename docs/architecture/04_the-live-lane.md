# 04 — The live lane (client-side)

TailWatch's live lane is **onnxruntime-web + a small TypeScript DSP**, not Pyodide. The archetype permits either
("Pyodide + lightweight wheels, OR a small TS engine") — TailWatch uses the same exported models the offline lane
trained, so the live lane is faithful, not a toy.

## Inference (`frontend/src/lib/ort.ts`)

```ts
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';
ort.env.wasm.numThreads = 1;   // GitHub Pages has no COOP/COEP for threaded WASM
```

* `cnn.onnx` — a per-pixel displacement time-series → 6-class deformation label (click a pixel → its class).
* `ae.onnx` — a 16×16 velocity patch → reconstruction; the error is the unsupervised spatial anomaly score.

The cubes (`tw-<id>.bin`) carry the precomputed AE-anomaly + CNN-class maps for the whole scene (first paint); the
live ONNX runs on demand for an interactively-picked pixel/patch, matching the offline maps.

## DSP (`frontend/src/dsp/forecast.ts`)

`velocitySeries` (smoothed velocity), `inverseVelocity` (the Fukuzono 1/v fit → failure-time `t_f` + CI + an R² gate),
and `tarp` (the tiered GISTM-aligned alarm: green/amber/red from velocity + days-to-fail). Pure TypeScript, the same
inverse-velocity the offline forecaster benchmark uses.

## Live-vs-offline parity (the thing to guard)

The browser path must reproduce the offline maps: the velocity normaliser (`VEL_SCALE = 60 mm/yr`) and the patch
size (16) are shared between `science/train_models.py` and the cube packer, so the in-browser anomaly/class read the
same scale the held-out evaluation measured. The onnxruntime-web npm version and the `wasmPaths` CDN are pinned to the
same version (1.27).
