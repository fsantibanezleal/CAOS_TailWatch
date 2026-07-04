# 04 — The live lane (client-side)

TailWatch's live lane is **onnxruntime-web + a small TypeScript DSP**, not Pyodide. The archetype permits either
("Pyodide + lightweight wheels, OR a small TS engine") — TailWatch uses the same exported models the offline lane
trained, so the live lane is faithful, not a toy.

## Inference (`frontend/src/lib/ort.ts`)

```ts
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
ort.env.wasm.numThreads = 1;   // GitHub Pages has no COOP/COEP for threaded WASM
```

* `cnn.onnx` — a per-pixel displacement time-series → 6-class deformation label (click a pixel → its class). Runs
  live on every picked pixel.
* `ae.onnx` — a 16×16 velocity patch → reconstruction; the error is the unsupervised spatial anomaly score. The
  model ships exported and `reconstructPatch` exists in `ort.ts`, but no component calls it yet: the anomaly values
  the App shows come from the precomputed map (a live AE patch inspector is roadmap).

The cubes (`tw-<id>.bin`) carry the precomputed AE-anomaly + CNN-class maps for the whole scene (first paint); the
live CNN runs on demand for an interactively-picked pixel, matching the offline class map.

## DSP (`frontend/src/dsp/forecast.ts`)

`velocitySeries` (smoothed velocity), `inverseVelocity` (the Fukuzono 1/v fit → failure-time `t_f` + CI + an R² gate),
and `tarp` (the tiered GISTM-aligned alarm: green/amber/red from velocity + days-to-fail). Pure TypeScript, the same
inverse-velocity the offline forecaster benchmark uses.

## Live-vs-offline parity (the thing to guard)

The browser path must reproduce the offline maps: the velocity normaliser (`VEL_SCALE = 60 mm/yr`) and the patch
size (16) are shared between `science/train_models.py` and the cube packer, so the in-browser anomaly/class read the
same scale the held-out evaluation measured. The onnxruntime-web npm package (`^1.27.0`) and the `wasmPaths` CDN
(pinned `1.20.1` in `ort.ts`) are currently pinned independently; keeping them on the same version is the guard to
maintain.
