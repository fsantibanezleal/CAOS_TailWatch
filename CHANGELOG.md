# Changelog

All notable changes to CAOS TailWatch are documented here. Versions follow `X.XX.XXX` (major.minor.patch); the
project stays in `0.x`; the App now serves both the synthetic simulator and a real Sentinel-1 InSAR sample.

## [0.11.000], 2026-07-07

### Added, Synthetic | Real Source lane on real Sentinel-1 InSAR (corrected-Faena real-artifacts-live)
- First-level `Synthetic | Real sample` source selector at the top of the App sidebar. In Real mode the
  scenario/regime knobs disable and you pick the real cube; all 8 tabs run on it (5 genuinely REAL,
  3 synthetic-model-on-real-input, badged honestly per tab).
- New offline ingest stage `twlab.science.ingest_real`: reads a LiCSBAS `cum.h5` (LOS displacement time
  series), clips a ~64x64 AOI, decimates the epochs, projects LOS to the vertical with the real per-pixel LOS
  up-vector, runs the EXISTING synthetic-trained ONNX (conv-AE + 1-D CNN + AE-encoder latent) cross-domain,
  and exports the identical `f32x8 + i16 cum` layout as `tw-real-<site>.bin` + a per-case entry in
  `tw-cases.json` (per-case grid + real `days` + `source` + `provenance`).
- Shipped real cube: COMET LiCSAR frame `124D_04854_171313` (descending), processed with LiCSBAS over the
  Campi Flegrei caldera (Pozzuoli, Italy); 64x64 px, 40 epochs, real Sentinel-1 uplift up to ~65 mm/yr.
  Attribution + DOIs surfaced in-app and in `ATTRIBUTION.md` (Lazecky et al. 2020 DOI 10.3390/rs12152430;
  Morishita et al. 2020 DOI 10.3390/rs12030424).
- Schema: per-case grid (`W`/`H`/`nEp`/`days`) + `source` + `provenance` in the trace/manifest; per-case
  honesty note in the manifest. `classifySeries` resamples any series to the CNN's fixed length 60.

### Changed
- Version drift fixed: the App footer string now reads `0.11.000` (was `0.10.000`, one patch behind).

## [0.10.001], 2026-07-04

### Changed
- Content standards (ADR-0067): removed every em-dash from tracked content (replaced with commas, or
  "n/a" in table cells). No behaviour change. Added `scripts/check_content_standards.py` + wired it
  into the CI `guards` job so the repo cannot regress on em-dashes or emojis.

## [0.10.000], 2026-07-04

### Fixed, real false-alarm control bank; degenerate forecast artifact removed (#24, deep-review critical)
- The orphan `data/derived/forecast-benchmark.json` (180 claimed trajectories but 3 unique tuples;
  no in-repo generator) is DELETED, along with its references (copy-data, data/README, manifest.py,
  docs). It solely backed the zero-false-alarm claim.
- The forecaster self-validation is extracted to a torch-free `twlab/science/forecast.py`
  (`forecast_benchmark`) so it is the single source of truth and regenerable without the training
  lane. It now runs a REAL seeded CONTROL BANK: 60 non-failing scenes (stable / linear-settling /
  seasonal, 20 seeds each) through the SAME inverse-velocity detector, reporting `falseAlarmRate`,
  `nControl` and a per-regime breakdown in the live `tw-cases.json` `forecast` block. Result:
  detect 100%, median t_f error 5.7%, **false-alarm 0% over 60 real controls** (0/20 each regime) , 
  the zero-false-alarm claim is now backed by regenerable data, not an orphan.
- `rebuild_forecast.py` regenerates only that block (numpy, no torch). Experiments page renders the
  false-alarm stat + the control-bank note from the manifest. +3 guard tests (orphan gone, control
  bank present + internally consistent, forecast not degenerate). 11 Python tests + build green.

## [0.09.000], 2026-06-21

Refactor onto the CAOS product-repo archetype (ADR-0057), the science core is unchanged; the repo is now a real,
contract-bounded, staged offline pipeline + a frontend SPA.

### Changed
- **`tools/insar-pipeline/` → `data-pipeline/twlab/`**, the forward sim + SBAS + the conv-AE/CNN training preserved
  verbatim under `twlab/science/` (the heavy lane); the six named stages are thin wrappers over it.
- **`src/` → `frontend/src/`**; `public/{cnn,ae}.onnx` + `tw-*.bin` + `tw-cases.json` + `forecast-benchmark.json` →
  **`data/derived/`** (the canonical artifact home). `frontend/copy-data.mjs` overlays them back into `public/` at
  build (the SPA's fetch paths are unchanged).
- The default pipeline is **numpy-only**: `python -m twlab.pipeline all` rebuilds every per-case replay trace +
  manifest from the committed `tw-cases.json`. `--retrain` regenerates everything from the forward sim (torch+scipy+h5py).

### Fixed / removed
- **App design rule: the held-out ROC + confusion-matrix tabs moved out of the App.** They are cross-case aggregate
  views that do NOT react to the case selector, so per the archetype rule (every App tab reacts to the selector;
  cross-case/aggregate views belong in Benchmark) they were removed from the App, the Benchmark page already renders
  both. The App's remaining 8 tabs all react to the case selector + the picked pixel.
- **Untracked the 168 MB of synthetic `.h5` scenes** (`tools/insar-pipeline/artifacts/scenes/*.h5`), raw/heavy data
  the archetype forbids committing; moved to `data/raw/scenes/` (git-ignored, regenerable from the forward sim). The CI
  guard now rejects `.h5`.

### Added
- **Two data contracts**: Contract 1 (`io/contract.py`, InSAR scene schema + outlier policy) and Contract 2
  (`core/manifest.py` `tailwatch.manifest/v2` + `core/trace.py` `tailwatch.trace/v1`), with a TS mirror
  (`frontend/src/lib/contract.types.ts`) that fails `tsc` on drift.
- **Cases by category** (`cases/insar_cases.py`): the 5 deformation-regime cases (failure: accel/linear/step;
  control: stable/seasonal).
- The client-side **lane gate**, two venvs + per-lane requirements, cross-platform `scripts/`, `tests/`
  (contract/manifest/smoke), CI (`ci.yml`) + `deploy-pages.yml`, a `docs/` wiki (ADR-0056), a dormant `app/` FastAPI +
  VPS templates, and the first root `README.md` + `CHANGELOG.md` + `STRUCTURE.md` + `LICENSES.md` + `ATTRIBUTION.md`.
- Verified running: ruff clean · pytest 8/8 · pipeline 5 cases · CONTRACT 2 OK · deterministic re-run ·
  `tsc + vite build` green · no h5/venv/dll leaks.
