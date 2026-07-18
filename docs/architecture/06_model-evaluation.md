# 06, Model evaluation

## The by-scene held-out split

Train on scenes 1-16, evaluate on **held-out scenes 17-20**, split by scene, so no patch or pixel-series leaks across
the boundary. This is the realistic ask: generalize to an unseen scene. The numbers live in `tw-cases.json.benchmark`
(`macroF1`, `aeAuc`, `velAuc`, the AE + velocity ROC curves, the confusion matrix, `heldOut`, `trainScenes`).

## Learned-vs-classical (honest)

The benchmark reports the **learned tier vs the classical baseline it is measured against**: the conv-AE anomaly AUC
and the 1-D CNN macro-F1 vs the classical per-pixel **velocity** AUC. The learned value is per-pixel type
classification + a label-free spatial anomaly, not a fabricated win over a strong classical detector (the velocity
baseline is strong; the page says so). No fabricated numbers.

## The denoising AE (one-class)

The conv-AE trains on **normal-only** velocity patches (stable / seasonal / decorrelated zones) with a denoising
objective (Vincent 2008): corrupt the input, reconstruct the clean patch. With a tight bottleneck + normal-only
training it resists the identity shortcut (a plain AE reconstructs anomalies too, Bouman & Heskes 2025), so failure
patches reconstruct poorly → high anomaly.

## The forecaster self-validation

The offline Monte-Carlo forecaster benchmark (`science/train_models.py`) runs the exact inverse-velocity pipeline
over 40 seeded accelerating trajectories and reports detection rate, median t_f error, and the lead-time accuracy
curve, the `forecast` block in `tw-cases.json`, the numbers the current pipeline reproduces. The false-alarm
contract (a stable/seasonal/linear control must not trigger a finite failure-time projection) is now re-verified
each run by a real seeded control bank: 60 controls (stable / linear-settling / seasonal, 20 seeds each) go through
the same inverse-velocity detector, and the fraction that ever fire a finite failure time is reported as
`falseAlarmRate` (with `nControl` and a per-regime breakdown) in the same `forecast` block. This replaces the legacy
`forecast-benchmark.json`, which was found degenerate (180 claimed trajectories, 3 unique tuples) with no in-repo
generator and has been removed (issue #24).
