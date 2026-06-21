# Method — 2-geometry SBAS + inverse-velocity forecasting

**Provenance:** Berardino et al. 2002 (SBAS); Fukuzono (inverse-velocity failure-time); Carlà et al. 2017/2019
(operational inverse-velocity); McInnes et al. 2018 (UMAP, for the latent scatter).

**What:** the classical baseline + the decision layer the learned tier sits on.

## 2-geometry SBAS decomposition (`science/sbas.py`)

Each LOS geometry (ascending + descending) measures only the PROJECTION of the true 3-D motion onto its look vector,
so raw ascending vs descending DISAGREE over the same dam — and that disagreement IS the horizontal signal. SBAS
inverts the small-baseline interferogram network per geometry to cumulative LOS displacement, then a 2×2 solve
decomposes the two LOS series into **Up** and **East** components (the N–S null space of near-polar orbits is stated,
not faked). Up is the cleanest failure indicator; East reveals dam-face bulging.

## Inverse-velocity forecasting (`frontend/src/dsp/forecast.ts`)

For an accelerating (tertiary-creep) trajectory the inverse velocity `1/v` falls linearly toward zero at failure
(Fukuzono): fit `1/v` vs time, project the zero-crossing → failure time `t_f` + a confidence interval, gated by an R²
threshold so noise does not trigger a projection. A steady-creep (linear) trajectory has `t_f` undefined (no
acceleration); a stable/seasonal control must NOT yield a finite `t_f` — the false-alarm guard. Feeds the tiered TARP
alarm (green/amber/red).

## Why it is the baseline, not the headline

The velocity / inverse-velocity tier is a strong, interpretable classical method (the field standard). The learned
tier's honest value is per-pixel TYPE classification + a label-free anomaly map — measured AGAINST this baseline, not
claimed to beat it everywhere. The Benchmark page reports both.
