# 01 — Regenerate the models (`--retrain`)

The heavy lane reproduces `cnn.onnx`, `ae.onnx`, the per-case cubes, and the rich `tw-cases.json` from the synthetic
forward simulation. Local-only (CI never retrains). Deterministic from the fixed seeds.

```bash
# 1) install the heavy engines (torch CPU + scipy + h5py) into .venv-pipeline
./scripts/setup.sh --precompute        # (PowerShell:  ./scripts/setup.ps1 -Precompute)

# 2) generate the 20 synthetic Sentinel-1 scenes into data/raw/scenes (von-Kármán APS + decorrelation + DEM-error)
.venv-pipeline/bin/python data-pipeline/twlab/science/forward.py   # writes data/raw/scenes/s1..s20.h5 (168 MB, git-ignored)

# 3) forward sim -> SBAS -> train conv-AE+CNN -> export ONNX + cubes + tw-cases.json -> rebuild the replay
./scripts/precompute.sh all --retrain
```

What runs (`pipeline.retrain` → `science/train_models.main`): load + 2-geometry SBAS decompose each scene
(`preprocess`), per-pixel series + velocity patches (`feature_extraction`), train the 1-D CNN (30 ep) + the denoising
conv-AE on NORMAL-only patches (24 ep) (`train`), per-pixel anomaly + class maps (`infer`), held-out (scenes 17-20)
macro-F1 + AE/velocity ROC-AUC + the inverse-velocity forecaster benchmark (`evaluate`), and write the ONNX + cubes +
tw-cases.json (`export`).

Expect the held-out macro-F1 / AUCs + the forecast detection rate to match the committed `tw-cases.json` (determinism).
CPU-fast (minutes). No GPU (see `docs/frameworks/01_pytorch`).
