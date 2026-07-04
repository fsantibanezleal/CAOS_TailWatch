# Changelog

All notable changes to CAOS TailWatch are documented here. Versions follow `X.XX.XXX` (major.minor.patch); the
project stays in `0.x` while the scenes are synthetic (pending a real digitized published velocity series).

## [0.10.000] — 2026-07-04

### Fixed — real false-alarm control bank; degenerate forecast artifact removed (#24, deep-review critical)
- The orphan `data/derived/forecast-benchmark.json` (180 claimed trajectories but 3 unique tuples;
  no in-repo generator) is DELETED, along with its references (copy-data, data/README, manifest.py,
  docs). It solely backed the zero-false-alarm claim.
- The forecaster self-validation is extracted to a torch-free `twlab/science/forecast.py`
  (`forecast_benchmark`) so it is the single source of truth and regenerable without the training
  lane. It now runs a REAL seeded CONTROL BANK: 60 non-failing scenes (stable / linear-settling /
  seasonal, 20 seeds each) through the SAME inverse-velocity detector, reporting `falseAlarmRate`,
  `nControl` and a per-regime breakdown in the live `tw-cases.json` `forecast` block. Result:
  detect 100%, median t_f error 5.7%, **false-alarm 0% over 60 real controls** (0/20 each regime) —
  the zero-false-alarm claim is now backed by regenerable data, not an orphan.
- `rebuild_forecast.py` regenerates only that block (numpy, no torch). Experiments page renders the
  false-alarm stat + the control-bank note from the manifest. +3 guard tests (orphan gone, control
  bank present + internally consistent, forecast not degenerate). 11 Python tests + build green.

## [0.09.000] — 2026-06-21

Refactor onto the CAOS product-repo archetype (ADR-0057) — the science core is unchanged; the repo is now a real,
contract-bounded, staged offline pipeline + a frontend SPA.

### Changed
- **`tools/insar-pipeline/` → `data-pipeline/twlab/`** — the forward sim + SBAS + the conv-AE/CNN training preserved
  verbatim under `twlab/science/` (the heavy lane); the six named stages are thin wrappers over it.
- **`src/` → `frontend/src/`**; `public/{cnn,ae}.onnx` + `tw-*.bin` + `tw-cases.json` + `forecast-benchmark.json` →
  **`data/derived/`** (the canonical artifact home). `frontend/copy-data.mjs` overlays them back into `public/` at
  build (the SPA's fetch paths are unchanged).
- The default pipeline is **numpy-only**: `python -m twlab.pipeline all` rebuilds every per-case replay trace +
  manifest from the committed `tw-cases.json`. `--retrain` regenerates everything from the forward sim (torch+scipy+h5py).

### Fixed / removed
- **App design rule: the held-out ROC + confusion-matrix tabs moved out of the App.** They are cross-case aggregate
  views that do NOT react to the case selector, so per the archetype rule (every App tab reacts to the selector;
  cross-case/aggregate views belong in Benchmark) they were removed from the App — the Benchmark page already renders
  both. The App's remaining 8 tabs all react to the case selector + the picked pixel.
- **Untracked the 168 MB of synthetic `.h5` scenes** (`tools/insar-pipeline/artifacts/scenes/*.h5`) — raw/heavy data
  the archetype forbids committing; moved to `data/raw/scenes/` (git-ignored, regenerable from the forward sim). The CI
  guard now rejects `.h5`.

### Added
- **Two data contracts**: Contract 1 (`io/contract.py` — InSAR scene schema + outlier policy) and Contract 2
  (`core/manifest.py` `tailwatch.manifest/v2` + `core/trace.py` `tailwatch.trace/v1`), with a TS mirror
  (`frontend/src/lib/contract.types.ts`) that fails `tsc` on drift.
- **Cases by category** (`cases/insar_cases.py`): the 5 deformation-regime cases (failure: accel/linear/step;
  control: stable/seasonal).
- The client-side **lane gate**, two venvs + per-lane requirements, cross-platform `scripts/`, `tests/`
  (contract/manifest/smoke), CI (`ci.yml`) + `deploy-pages.yml`, a `docs/` wiki (ADR-0056), a dormant `app/` FastAPI +
  VPS templates, and the first root `README.md` + `CHANGELOG.md` + `STRUCTURE.md` + `LICENSES.md` + `ATTRIBUTION.md`.
- Verified running: ruff clean · pytest 8/8 · pipeline 5 cases · CONTRACT 2 OK · deterministic re-run ·
  `tsc + vite build` green · no h5/venv/dll leaks.
