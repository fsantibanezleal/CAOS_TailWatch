# TailWatch — InSAR deformation monitoring & early-warning

> Monitor tailings dams and pit walls for ground deformation from synthetic Sentinel-1 InSAR: a 2-geometry SBAS
> displacement decomposition, a velocity map, a learned anomaly + deformation-type tier, and inverse-velocity failure
> forecasting with tiered TARP alarms. Didactic + decision-support, **not a certified safety system**. Part of the
> **[Faena](https://faena.fasl-work.com)** mining-analytics hub.

Live: **https://tailwatch.fasl-work.com**

## What it is

A real, in-browser InSAR deformation studio. A high-fidelity **synthetic Sentinel-1 forward simulation** (von-Kármán
APS + decorrelation + DEM-error + orbital ramps) feeds a **2-geometry SBAS** Up/East decomposition; a **denoising
conv-autoencoder** flags spatial anomalies (label-free) and a **1-D CNN** classifies each pixel's deformation type
(stable / linear / accelerating / seasonal / step / decorrelated), both running **live** (onnxruntime-web); the
classical **inverse-velocity** (Fukuzono) baseline projects failure time with a tiered TARP alarm.

## The six pages

- **App** — case selector (5 deformation regimes) + the reactive view set: LOS velocity, Up/East decomposition,
  AE anomaly + CNN class maps, cumulative scrubber, inverse-velocity forecast, TARP.
- **Introduction / Methodology / Implementation** — the problem, the term-by-term math (SBAS, decomposition,
  inverse-velocity, the learned tier) with figures, and the two-lane architecture.
- **Experiments** — the leakage-safe by-scene split + the forecaster Monte-Carlo self-validation.
- **Benchmark** — the held-out learned-vs-classical numbers (CNN macro-F1, AE/velocity AUC, confusion) — honest, no
  fabricated wins.

## Architecture

Instantiated from the CAOS product-repo archetype (ADR-0057): a heavy **offline engine** + a **frontend SPA**, bound
by two data contracts. See [`STRUCTURE.md`](STRUCTURE.md) and the [`docs/`](docs/README.md) wiki.

```
OFFLINE  data-pipeline/twlab/ (torch+scipy+h5py)     LIVE  frontend/src/ (browser, TypeScript)
  science/forward.py  synthetic Sentinel-1 sim          dsp/forecast.ts  inverse-velocity + TARP
  science/sbas.py     2-geometry SBAS decomposition     lib/ort.ts       onnxruntime-web (conv-AE + CNN)
  science/train_models.py  conv-AE + 1-D CNN -> ONNX    viz/             FieldMap / LatentScatter / charts
        │  --retrain regenerates the artifacts
        ▼
  data/derived/  cnn.onnx · ae.onnx · tw-<id>.bin (cubes) · tw-cases.json · forecast-benchmark.json
        │  (committed compact artifacts = the offline lane's real outputs; the 168 MB .h5 scenes stay in data/raw, git-ignored)
        ▼
  pipeline (numpy) → data/derived/<case>/trace.json + manifests/  (CONTRACT 2; copy-data overlays into frontend/public)
```

The default pipeline is **numpy-only** (rebuilds the replay layer from the committed artifacts), so a clone replays
without torch or the 168 MB scenes. Heavy work (the forward sim + torch training) is the local-only `--retrain`.

## Develop

```bash
./scripts/setup.sh            # venvs + light deps + editable pkg (numpy+ruff+pytest)   [.ps1 on Windows]
./scripts/precompute.sh       # python -m twlab.pipeline all  (rebuild the replay layer, numpy-only)
.venv-pipeline/bin/python -m pytest    # 8 passed     ·     ./scripts/smoke.sh   # CONTRACT 2 OK
./scripts/dev.sh              # cd frontend && npm install && npm run dev (vite + live ONNX + TS DSP)
cd frontend && npm run build  # tsc --noEmit && vite build (+ copy-data overlay + SPA 404.html)

# regenerate the models from the forward sim (local-only, torch+scipy+h5py):
./scripts/setup.sh --precompute && ./scripts/precompute.sh all --retrain
```

## Honesty

The scenes are **synthetic Sentinel-1 simulations**, NOT real SAR. The held-out split is by scene. Real failures
(Brumadinho 2019, Cadia 2018) are documented cautionary/forecastable analogs, not re-hosted data. The learned tier is
measured AGAINST the strong classical velocity baseline — its value is per-pixel TYPE + a label-free anomaly, not a
fabricated win. No fabricated benchmark numbers. Didactic + decision-support, not a certified alarm.

## License

Source-available for review. © Felipe Santibáñez-Leal · part of [Faena](https://faena.fasl-work.com).
