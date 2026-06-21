"""Stage 1 — preprocess (heavy lane): load a synthetic Sentinel-1 scene and apply the 2-geometry SBAS displacement
decomposition (ascending + descending LOS -> Up). Delegates to the preserved science
(twlab/science/train_models.scene_fields, which uses science/sbas.py). Requires numpy + h5py + scipy."""
from __future__ import annotations


def run(scene_idx: int):
    from ..science.train_models import scene_fields
    return scene_fields(scene_idx)   # -> (scene, up-cube, velocity-map)
