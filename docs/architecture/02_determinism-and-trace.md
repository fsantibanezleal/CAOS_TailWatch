# 02 — Determinism & the replay trace

## Determinism

Every run is a pure function of `(case, seed)`. The forward sim + training are seeded (`torch.manual_seed(0);
np.random.seed(0)` + a seeded PRNG in the scene generator; `no Date.now / Math.random`), and the light pipeline reads
the committed `tw-cases.json`, so re-running the default pipeline produces **byte-identical** traces + manifests (the
CI determinism guard) — no wall-clock in any committed artifact.

## The compact trace (`tailwatch.trace/v1`)

`core/trace.py` builds one small JSON per case from the committed rich manifest (`tw-cases.json`). It **references**
the shared decimated cube (`tw-<id>.bin`) and the global held-out benchmark + forecast, never copying them — so each
trace stays tiny. The payload carries the case's regime + labels + latent point + the grid (W/H/nEp) + the global
held-out `macroF1/aeAuc/velAuc` slice + the forecaster summary (detection rate / median t_f error / lead-time curve).

The frontend mirrors this shape in `frontend/src/lib/contract.types.ts` (`CaseTrace` / `ForecastSummary`), so a drift
between the Python trace and the TS reader **fails `tsc`**.

## The cube (`tw-<id>.bin`)

The replay payload per case is a decimated cube: eight float32 H×W maps (velocity Up/East/Asc/Desc, AE anomaly, CNN
class, coherence, zone) then an int16 cumulative-Up cube — ~2.9 MB, committed, lazy-loaded so only the selected case
is fetched. It is the heavy lane's real output; the trace + manifest record its provenance.
