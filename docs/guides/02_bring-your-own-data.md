# 02 — Bring your own InSAR scene

TailWatch is not limited to the 5 baked cases — Contract 1 is the gate that lets it ingest a NEW displacement scene.

## 1. Describe the scene (Contract 1)

A scene needs: `scene_id`, `W`, `H` (px, [32,4096]), `n_ep` (acquisitions, [3,500]), `regime` ∈ {stable, linear,
accelerating, seasonal, step, decorrelated}, optional `dam_sev` / `coherence_threshold`. See `data/examples/scenes.csv`
for passing rows.

```python
from twlab.io.contract import validate_records
rep = validate_records([{ "scene_id": "mine", "W": 160, "H": 120, "n_ep": 60,
                          "regime": "accelerating", "dam_sev": 1.5 }])
print(rep.summary())   # accepted / rejected (with reason) / flagged
```

A bad regime / undersized grid / too-few acquisitions / non-numeric is **rejected with a reason**; a `decorrelated`
regime or an implausible severity is **flagged** (accepted; the coherence mask dominates, velocity/forecast
unreliable). The forward sim (`science/forward.py`) generates a conforming scene from these parameters.

## 2. Evaluate it

Offline: feed the scene through `--retrain` (or the named stages) to get the SBAS decomposition, the CNN class map +
AE anomaly map, and the inverse-velocity forecast. Live: the browser's TS DSP runs the inverse-velocity + TARP, and
onnxruntime-web runs the CNN/AE per picked pixel/patch. The honesty caveat stands — the scenes are synthetic; this is
didactic + decision-support, not a certified alarm (see `docs/cases/README.md`).
