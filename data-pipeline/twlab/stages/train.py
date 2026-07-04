"""Stage 3, train (OFFLINE, heavy lane): fit the 1-D CNN (per-pixel 6-class classifier, Adam 1e-3, 30 ep) and the
denoising conv-AE (NORMAL-only velocity patches, Adam 1e-3, 24 ep, Vincent 2008 denoising). Trained on scenes 1-16
(held-out 17-20 -> no spatial leakage). Delegates to the preserved science. Requires torch (lazy)."""
from __future__ import annotations


def cnn():
    from ..science.train_models import train_cnn
    return train_cnn()


def conv_ae():
    from ..science.train_models import train_ae
    return train_ae()
