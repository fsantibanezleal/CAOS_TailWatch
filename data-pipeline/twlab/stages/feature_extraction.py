"""Stage 2, feature_extraction (heavy lane): build the two learned-tier inputs, per-pixel displacement
time-series (the 1-D CNN's input) and 16x16 velocity patches (the conv-AE's input). Delegates to the preserved
science (twlab/science/train_models). NumPy."""
from __future__ import annotations


def pixel_series(idxs, per_class: int = 1100):
    from ..science.train_models import pixel_series_dataset
    return pixel_series_dataset(idxs, per_class=per_class)


def velocity_patches(vel, stride: int = 4):
    from ..science.train_models import velocity_patches as _vp
    return _vp(vel, stride=stride)
