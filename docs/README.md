# TailWatch, documentation wiki

The navigable wiki for TailWatch (ADR-0056), authored as the product is built. TailWatch is a public, didactic
**InSAR ground-deformation monitoring + early-warning studio** for tailings dams and pit walls: a synthetic
Sentinel-1 forward simulation → a 2-geometry SBAS-consistent displacement decomposition (the small-baseline network
inversion itself is roadmap) → a 2-D convolutional **denoising autoencoder** (unsupervised spatial anomaly, its map
precomputed offline) + a 1-D **CNN** (per-pixel 6-class deformation classifier, running live in the browser via
onnxruntime-web), with the classical **inverse-velocity** (Fukuzono) failure-time forecast.

## What it is / what it is not

* **Is:** a real, interactive deformation studio, pick one of 5 regime cases (accelerating / linear / step failure;
  stable / seasonal control), watch the LOS velocity map, the Up/East decomposition, the AE anomaly + CNN class maps,
  the cumulative scrubber, the inverse-velocity 1/v forecast, and the tiered TARP alarm; the held-out benchmark + the
  Monte-Carlo forecaster self-validation are reported honestly.
* **Is not:** a certified alarm. The scenes are **synthetic Sentinel-1 simulations**, not real SAR; TailWatch is
  didactic + decision-support. Real failures (Brumadinho 2019, Cadia 2018) are documented cautionary/forecastable
  analogs, not re-hosted data. No fabricated benchmark numbers.

## Map

| Folder | What it answers |
|---|---|
| [`architecture/`](architecture/README.md) | the two data contracts, the staged offline pipeline, the lane gate, determinism, model evaluation, deploy |
| [`frameworks/`](frameworks/README.md) | the binding engines (PyTorch, ONNX/onnxruntime, SciPy, NumPy/h5py) + the method cards (conv-AE, 1-D CNN, SBAS + inverse-velocity) |
| [`cases/`](cases/README.md) | the 5 deformation-regime cases by category + the controls + the honesty |
| [`guides/`](guides/README.md) | run the pipeline, regenerate from the forward sim, bring your own scene |
| [`../data/README.md`](../data/README.md) | the data contract (Contract 1 scene schema; Contract 2 artifact layout) |

## The three lanes (at a glance)

1. **Offline (precompute, heavy)**, torch + scipy + h5py run the forward sim → SBAS → train the conv-AE + CNN and
   export ONNX + the decimated cubes. Local-only (`--retrain`); the 168 MB of scenes are git-ignored.
2. **Live (client-side)**, onnxruntime-web runs the exported CNN on the picked pixel + a TypeScript DSP
   (inverse-velocity, TARP); the AE anomaly map ships precomputed.
3. **Replay (static)**, the committed cubes + tw-cases.json; the default (numpy-only) pipeline rebuilds the traces.
