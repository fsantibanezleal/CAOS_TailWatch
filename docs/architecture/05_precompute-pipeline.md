# 05, The staged precompute pipeline

`data-pipeline/twlab/stages/`, six named, seeded steps. The real science is preserved verbatim in `twlab/science/`
(the forward sim + SBAS + the conv-AE/CNN training + the cube/manifest export); the stage modules are thin wrappers
that name the steps and delegate to it, and `pipeline.retrain` runs the preserved orchestrator
(`science/train_models.main`). The science is kept verbatim because it is real research code, run only via `--retrain`.

| Stage | What it does (science function) | Deps |
|---|---|---|
| `preprocess` | load a scene + the 2-geometry SBAS Up/East decomposition + velocity (`scene_fields`) | numpy + h5py + scipy |
| `feature_extraction` | per-pixel displacement series (CNN input) + 16×16 velocity patches (AE input) (`pixel_series_dataset`, `velocity_patches`) | numpy |
| `train` | fit the 1-D CNN (30 ep) + the denoising conv-AE on normal-only patches (24 ep, Vincent 2008) (`train_cnn`, `train_ae`) | torch |
| `infer` | per-pixel AE reconstruction-error anomaly map + CNN class map (`anomaly_map`) | torch + scipy |
| `evaluate` | held-out (scenes 17-20) macro-F1 + AE/velocity ROC-AUC + the inverse-velocity forecaster benchmark (`roc` + the held-out block of `main`) | torch |
| `export` | write cnn.onnx + ae.onnx (opset 17) + the per-case cubes + the rich tw-cases.json (the cube/manifest block of `main`) | torch |

`pipeline.py` orchestrates them. The **default** invocation only runs the light replay path (`export.build_replay`)
over the committed `tw-cases.json`; `--retrain` runs the science.

## Leakage-safe by scene

The split is **by scene** (train 1-16, held-out 17-20), so no patch or pixel-series from a test scene is ever seen in
training, the realistic question is generalization to an unseen scene. The forward sim plants the kinematic
deformation regimes; the scenes are synthetic but the SBAS + the inverse-velocity physics are exact.
