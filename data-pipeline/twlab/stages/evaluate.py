"""Stage 5, evaluate (the TEST stage, heavy lane): held-out (scenes 17-20) macro-F1 for the CNN, ROC/AUC for the
AE anomaly + the classical velocity baseline it beats, and the offline inverse-velocity forecaster benchmark
(detection rate / median t_f error / lead-time curve). Leakage-safe by the by-scene split. The full held-out
evaluation + the per-case cube + manifest assembly is the preserved orchestrator
(twlab/science/train_models.main); `roc` is the shared metric. Requires torch + scipy (lazy)."""
from __future__ import annotations


def roc(scores, pos):
    from ..science.train_models import roc as _roc
    return _roc(scores, pos)
