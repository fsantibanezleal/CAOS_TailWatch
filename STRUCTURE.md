# STRUCTURE — TailWatch on the CAOS product-repo archetype (ADR-0057)

```
CAOS_TailWatch/
├─ README.md · CHANGELOG.md (X.XX.XXX) · LICENSE · LICENSES.md · ATTRIBUTION.md · STRUCTURE.md
├─ pyproject.toml (twlab) · .env.example · .gitignore · .gitattributes · .vscode/
├─ requirements.txt (live-thin numpy) · -dev · -precompute (torch/scipy/h5py/onnx) · -gpu (dormant) · -api (dormant)
├─ data-pipeline/
│  ├─ README.md
│  └─ twlab/                       # the offline engine + staged pipeline
│     ├─ __init__.py (version) · pipeline.py (orchestrator+CLI) · registry.py (cases by CATEGORY) · live.py (dormant)
│     ├─ io/      contract.py (CONTRACT 1: InSAR scene schema) · schema.py · formats.py
│     ├─ core/    rng.py · trace.py (CONTRACT 2 trace) · manifest.py (CONTRACT 2) · gate.py (lane gate)
│     ├─ stages/  preprocess · feature_extraction · train · infer · evaluate · export — thin wrappers over science/
│     ├─ cases/   insar_cases.py (5 deformation-regime cases)
│     └─ science/ forward.py (synthetic Sentinel-1 forward sim) · sbas.py (2-geometry SBAS) · train_models.py
│                 (conv-AE + 1-D CNN training + cube/manifest export) — preserved verbatim heavy lane (ruff-excluded)
├─ data/
│  ├─ raw/scenes/ (git-ignored — the 20 synthetic .h5 scenes, 168 MB, regenerable) · examples/scenes.csv (passes CONTRACT 1)
│  ├─ derived/  cnn.onnx · ae.onnx · tw-<id>.bin (5 cubes) · tw-cases.json · forecast-benchmark.json
│  │            <case>/trace.json · manifests/<case>.json + index.json   (CONTRACT 2, committed)
│  └─ README.md (the data contract)
├─ frontend/                       # the React/Vite SPA
│  ├─ index.html · package.json · vite.config.ts · tsconfig.json · copy-data.mjs
│  ├─ public/ (CNAME · favicon; the data overlay is git-ignored)
│  └─ src/  pages/ (App/Introduction/Methodology/Implementation/Experiments/Benchmark) · dsp/forecast.ts · viz/ ·
│           lib/ort.ts (onnxruntime-web) · lib/contract.types.ts (CONTRACT-2 mirror) · data/demo.ts
├─ app/                            # OPTIONAL FastAPI backend — DORMANT (static-first)
├─ scripts/  setup · precompute · dev · smoke {.sh,.ps1} · check_artifacts.py
├─ deploy/   pages.md (default) · fasl-slug.service · domain.nginx (VPS, dormant)
├─ docs/     README · architecture/ · frameworks/ · cases/ · guides/   (the wiki, ADR-0056)
├─ tests/    test_contract · test_manifest · test_pipeline_smoke · conftest
└─ .github/workflows/  ci.yml (ruff+pytest+pipeline+check_artifacts+guards) · deploy-pages.yml
```

**The base is frozen** — edits land only in the CORE (the forward-sim/SBAS/training science in `twlab/science/`, the
DSP/viz/pages in `frontend/src/`, the cases/content), never in the structure, contracts, env, or deploy. The 168 MB
synthetic `.h5` scenes are NEVER committed (regenerable from the forward sim); only the compact derived artifacts are.
