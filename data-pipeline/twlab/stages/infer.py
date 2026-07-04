"""Stage 4, infer (heavy lane): run the trained models over a scene, the conv-AE per-pixel reconstruction-error
anomaly map + the 1-D CNN per-pixel class map (the offline mirror of the in-browser onnxruntime-web path).
Delegates to the preserved science. Requires torch + scipy (lazy)."""
from __future__ import annotations


def anomaly_map(ae_net, vel):
    from ..science.train_models import anomaly_map as _am
    return _am(ae_net, vel)
