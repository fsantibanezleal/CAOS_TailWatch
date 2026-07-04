# data-pipeline/, the offline engine (`twlab`)

The staged, seeded, contract-bounded offline pipeline for TailWatch (ADR-0057). Install editable from the repo root
(`pip install -e .`); run with `python -m twlab.pipeline`.

```
twlab/
├─ __init__.py            # __version__ = "0.09.000"
├─ pipeline.py            # orchestrator + CLI (light replay by default; --retrain runs the heavy science)
├─ registry.py            # cases grouped by CATEGORY (failure regimes / control-normal)
├─ live.py                # Pyodide live-lane entrypoint, DORMANT (TailWatch's live lane is TS DSP + onnxruntime-web)
├─ io/      contract.py (CONTRACT 1: InSAR scene schema + outlier policy) · schema.py · formats.py
├─ core/    rng.py · trace.py (CONTRACT 2 tailwatch.trace/v1) · manifest.py (tailwatch.manifest/v2) · gate.py
├─ stages/  preprocess · feature_extraction · train · infer · evaluate · export, thin wrappers over the science
├─ cases/   insar_cases.py (the 5 deformation-regime cases)
└─ science/ forward.py (synthetic Sentinel-1 forward sim) · sbas.py (2-geometry SBAS decomposition) ·
            train_models.py (the conv-AE + 1-D CNN training + the cube/manifest export), the preserved verbatim
            heavy lane (ruff-excluded; run only via --retrain)
```

**Two lanes:**

* **Default (light, numpy/stdlib)**, `python -m twlab.pipeline all` rebuilds every per-case replay trace +
  manifest from the committed `tw-cases.json`. No torch, no 168 MB scenes, a clone replays.
* **Heavy (`--retrain`)**, `pipeline all --retrain` runs the preserved science (`science/train_models.main`):
  forward sim → SBAS → train the conv-AE + 1-D CNN → export `cnn.onnx`/`ae.onnx` + the per-case cubes +
  `tw-cases.json`. Needs the `--precompute` setup (torch + scipy + h5py) + the scenes in `data/raw/scenes/`. See
  `docs/guides/01_precompute-pipeline.md`. The named stages map to the science functions (scene_fields=preprocess,
  pixel_series_dataset/velocity_patches=feature_extraction, train_cnn/train_ae=train, anomaly_map=infer,
  the held-out ROC/F1=evaluate, the cube+tw-cases.json write=export).
