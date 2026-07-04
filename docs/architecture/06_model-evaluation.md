# 06 — Model evaluation

## The by-scene held-out split

Train on scenes 1-16, evaluate on **held-out scenes 17-20** — split by scene, so no patch or pixel-series leaks across
the boundary. This is the realistic ask: generalize to an unseen scene. The numbers live in `tw-cases.json.benchmark`
(`macroF1`, `aeAuc`, `velAuc`, the AE + velocity ROC curves, the confusion matrix, `heldOut`, `trainScenes`).

## Learned-vs-classical (honest)

The benchmark reports the **learned tier vs the classical baseline it is measured against**: the conv-AE anomaly AUC
and the 1-D CNN macro-F1 vs the classical per-pixel **velocity** AUC. The learned value is per-pixel TYPE
classification + a label-free spatial anomaly — NOT a fabricated win over a strong classical detector (the velocity
baseline is strong; the page says so). No fabricated numbers.

## The denoising AE (one-class)

The conv-AE trains on **NORMAL-only** velocity patches (stable / seasonal / decorrelated zones) with a denoising
objective (Vincent 2008): corrupt the input, reconstruct the clean patch. With a tight bottleneck + NORMAL-only
training it resists the identity shortcut (a plain AE reconstructs anomalies too — Bouman & Heskes 2025), so failure
patches reconstruct poorly → high anomaly.

## The forecaster self-validation

The offline Monte-Carlo forecaster benchmark (`science/train_models.py`) runs the EXACT inverse-velocity pipeline
over 40 seeded accelerating trajectories and reports detection rate, median t_f error, and the lead-time accuracy
curve — the `forecast` block in `tw-cases.json`, the numbers the current pipeline reproduces. The false-alarm
contract (a stable/seasonal/linear control must NOT trigger a finite failure-time projection) is a design requirement
that the current pipeline does not yet re-verify: the legacy `forecast-benchmark.json` that reported the
zero-false-alarm number was found degenerate and has no in-repo generator, so that number is under re-evaluation
(see issue #24).
