# Cases — taxonomy & coverage matrix

`data-pipeline/twlab/cases/insar_cases.py` defines 5 cases across 2 categories — the deformation regimes a
tailings-dam monitor must DISTINGUISH. The App shows one selected case; Experiments/Benchmark show cross-case
summaries by category. Each case maps to a committed cube (`tw-<id>.bin`) and the SPA's `tw-cases.json`. All scenes
are **synthetic Sentinel-1 simulations** (clearly labelled); the validation anchors point at the real documented
failures the regime emulates.

| Category | Case (regime) | What it exercises | Validation anchor |
|---|---|---|---|
| **failure deformation (forecastable / must detect)** | `accel` (accelerating) | tertiary creep → inverse-velocity 1/v → finite failure time; AE + CNN flag it | Cadia 2018 (forecastable precursor — Carlà 2019) |
| | `linear` (linear) | steady creep, constant velocity, t_f undefined — detected, not forecastable | open-pit steady creep (Rose & Hungr 2007) |
| | `step` (step) | one-off settling after a trigger — labelled step, no sustained acceleration | post-rain settling step |
| **control / normal (must NOT false-alarm)** | `stable` (stable) | bedrock, no net deformation → GREEN, inconclusive forecast | stable bedrock (negative control) |
| | `seasonal` (seasonal) | reversible annual breathing → oscillating series, no net failure | reversible seasonal cycle |

## The controls (must NOT false-alarm)

`stable` (bedrock) and `seasonal` (reversible breathing) are the false-alarm guards: the monitor must return GREEN /
inconclusive, NOT a finite failure-time projection. The quantified false-alarm rate over the stable/seasonal/linear
controls is under re-evaluation (issue #24: the legacy artifact that reported it is degenerate and non-regenerable);
the current forecaster self-validation covers the accelerating bank only (detection rate + t_f accuracy, the
`forecast` block in `tw-cases.json`).

## Honesty / roadmap

* The scenes are **synthetic Sentinel-1 simulations**, NOT real SAR. TailWatch is didactic + decision-support, not a
  certified alarm. CWRU-style "we used N real datasets" is not claimed.
* Real failures (Brumadinho 2019 — only a retrospective ISBAS precursor; Cadia 2018 — clearly forecastable) are
  documented analogs, not re-hosted data.
* Roadmap: a MapLibre/deck.gl geo-basemap + a real digitized published velocity series as a second benchmark target —
  visual/rigor polish, documented in the Experiments page.

See [`../architecture/06_model-evaluation.md`](../architecture/06_model-evaluation.md) for the held-out split + the
benchmark + the forecaster self-validation, and the per-case `data/derived/manifests/<case>.json` for the numbers.
