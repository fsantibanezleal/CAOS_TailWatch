# Changelog

All notable changes to CAOS TailWatch are documented here. Versions follow `X.XX.XXX` (major.minor.patch); the
project stays in `0.x`; the App now serves both the synthetic simulator and a real Sentinel-1 InSAR sample.

## [0.14.001] · 2026-09-26

### Fixed

- Three Spanish lines in the architecture text: "una demo" (the noun is feminine), and "se ejecuta"
  and "ejecuta" where the text had the calque "corre" (a July fix that had waited on
  `task/text-quality-pass2`).
- No em-dash in the files the content guard does not scan: `.gitignore`, the dormant deploy templates
  and the shell scripts.

## [0.14.000] · 2026-08-01

### Fixed - the rail was painted over by the footer, and the docs routes clipped

`align-items: start` let both grid columns grow to their content, so the rail ran past the shell bottom and
its lowest control was drawn OVER by the footer: hit-testing the coherence-mask checkbox returned
`FOOTER.site-footer`. Rows are sized by the ROW now and the rail scrolls itself. Prose routes get their own
scroll (floor v2); previously `/introduction`, `/methodology`, `/experiments` and `/benchmark` clipped with
nothing able to scroll.

### Changed - tabs regularized per ADR-0071

Eight flat tabs are now THREE groups on one 45px row (Maps, Pixel, Learned), sub-views revealed on hover.

### Added - ADR-0070 focus mode, with the caldera caveat on screen

A full-viewport view of the selected AOI: the velocity field as the stage, click any pixel to recompute the
series and the inverse-velocity fit live, and the Fukuzono verdict NAMED on the stage. When the terminal fit
does not support a projection the badge says so instead of printing a date, and the wording keeps "where the
line extrapolates for this pixel" distinct from "a prediction of failure for the site".

The real lane's provenance caveat is in the RAIL, not on a docs page: the Sentinel-1 cube is the Campi
Flegrei volcanic caldera, NOT a tailings facility. It demonstrates the identical InSAR workflow on real
data, and a tailings reading does not transfer. That is the first thing a viewer of this screen needs.

**A bug caught by looking rather than by a passing check:** the focus view read its time axis from
`CaseInfo.days`, which is optional and empty for most cases, so the inverse-velocity fit had no time axis
and the badge sat on "Loading" forever while the map rendered perfectly. `days` now comes from `gridOf()`,
exactly as the App does.

## [0.13.000] · 2026-07-30

### Fixed
- **Version coherence.** Every version source in this repo now declares the same number. They had drifted
  apart (0.12.002), which `conventions/versioning.md` forbids: `VERSION`, the manifests, the CHANGELOG and the
  git tag are required to move together on every release.
- A line-wide sweep on 2026-07-30 found 79 tags across 9 CAOS repos pointing at commits declaring a
  different version, plus 13 repos whose working tree was internally incoherent. The cause is one habit: a
  release gets merged, tagged and deployed while the version files stay where they were. The cost is not
  cosmetic, since a product footer reads its version from a manifest, so a deployed app reported a version
  older than the release it was running.
- This is a MINOR bump rather than a patch: it puts the whole repo onto one clean number regardless of
  development stage, so the numbering is in order from here rather than carrying the drift forward.
- Historical tags are left untouched. A published tag is the accurate record of a release that happened, so
  drift is fixed by moving the files forward, never by rewriting or deleting a tag.
- Guarded going forward by `tools/version-audit/check_version_coherence.py` in CAOS_MANAGE.

## [0.12.002], 2026-07-11

### Fixed
- App crash on Real -> Synthetic source switch (reported live): switching back from a real case blanked the whole
  app with `Cannot read properties of undefined (reading 'toFixed')`. Root cause: `pickCase` resets the case id,
  pixel and epoch synchronously, but the loaded case data `cd` was only cleared in an effect AFTER the next
  render, so one render indexed the OLD case's arrays (real grid) with the NEW case's grid indices; the sidebar
  readouts (`cd.coh[i]`, `velField[i]`, `anomN.norm[i]`) hit undefined and the crash happened OUTSIDE the
  per-panel boundary, unmounting the root. Three-part fix:
  1. `pickCase` now clears `cd` synchronously, so no render ever sees stale arrays against new indices.
  2. Every indexed readout is null-safe (`cd?.coh[i] ?? 0` etc.), the RotorVitals NaN-guard lesson applied to
     out-of-range indexing.
  3. The whole Workbench is wrapped in a page-level PanelBoundary, so any future render crash degrades to an
     inline message instead of a blank page.
  Reproduced with a Playwright harness (real -> synthetic blanked the body), re-run after the fix: full synthetic
  view restored, 0 console errors.

## [0.12.001], 2026-07-11

### Fixed
- Reference integrity: `mirmaz2022` conflated two papers. Its title was "Classification of ground deformation
  using sentinel-1 persistent scatterer interferometry time series" (GIScience & Remote Sensing 59(1)), but the
  attached DOI 10.5194/isprs-archives-XLIII-B3-2022-307-2022 resolves to a DIFFERENT paper. Corrected the title,
  authors and venue to match the DOI: Mirmazloumi et al. (2022), "InSAR deformation time series classification
  using a convolutional neural network", ISPRS Archives XLIII-B3-2022, 307-312.
- Honesty vs the engine (Methodology, Decision tab): the tab stated as current behavior that the CNN class map
  and the AE anomaly map "audit the alarm" (de-prioritise seasonal/decorrelated velocity alarms, raise silent AE
  anomalies). The engine `tarp()` computes the alarm ONLY from velocity and projected days-to-failure and ignores
  class/anomaly. Reworded to state the truth (the maps are shown alongside the alarm, they do not modify it) and
  labelled the fusion as planned/not-implemented, rather than silently wiring an unvalidated safety behavior.

### Added
- Per-panel error boundary (`viz/PanelBoundary.tsx`, mirroring the RotorVitals reference): a crash inside one
  method tab now renders a small inline message instead of unmounting the whole App to a blank page; keyed by
  source + case + tab so it resets when the datum changes.

## [0.12.000], 2026-07-09

### Added, the NOVEL beyond-SOTA proposal: split-conformal prediction intervals on t_f
- `twlab.science.forecast.conformal_tf`: split-conformal prediction intervals (Vovk et al. 2005) on the
  inverse-velocity failure time, calibrated PER LEAD-TIME bucket on the Monte-Carlo bank and validated on a
  DISJOINT held-out set. Standard practice (Fukuzono 1985) reports a point t_f; the SOTA adds a bootstrap band
  (Carla et al. 2017); this adds a distribution-free interval with a finite-sample coverage guarantee. Baked
  into the `forecast.conformal` block (nominal 0.9, mean measured coverage 0.892 within +-5%; q widens with
  lead-time: 4.5% near failure to 24.7% far out). Honest: calibration is synthetic; on real data it is a prior.
- Frontend `dsp/forecast.ts conformalInterval` + the IV tab shows the conformal interval (or an honest
  fallback); Experiments page renders the coverage table + the beyond-SOTA framing; Vovk 2005 cited.
- The failure forecast now runs on a coherence-masked patch mean around the pixel (standard InSAR practice),
  so the inverse-velocity fit is credible on a deforming area, and the dead `credible` expression is removed.

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
