"""Typed objects passed between pipeline stages — the inter-stage contract. Plain dataclasses (no heavy deps)."""
from __future__ import annotations

from dataclasses import dataclass, field

# The 6 deformation classes the 1-D CNN predicts per pixel (the frozen label order).
CLASSES = ("stable", "linear", "accelerating", "seasonal", "step", "decorrelated")
NORMAL = (0, 3, 5)        # stable, seasonal, decorrelated = "normal" for the AE
FAILURE = (1, 2, 4)       # linear, accelerating, step = the failure regimes
VEL_SCALE = 60.0          # mm/yr velocity normaliser (the browser replicates this)
PATCH = 16                # AE patch size


@dataclass(frozen=True)
class SceneSpec:
    """One validated synthetic InSAR scene descriptor (CONTRACT 1 output)."""
    scene_id: str
    W: int                       # pixels (width)
    H: int                       # pixels (height)
    n_ep: int                    # number of SAR acquisitions (epochs)
    regime: str                  # one of CLASSES (the planted dam deformation regime)
    dam_sev: float = 1.0         # deformation severity multiplier
    coherence_threshold: float = 0.3
    geometries: tuple[str, ...] = ("asc", "desc")   # the two LOS geometries (2-geometry decomposition)
    wavelength_cm: float = 5.55  # Sentinel-1 C-band
    incidence_deg: float = 39.0
    flags: tuple[str, ...] = ()


@dataclass(frozen=True)
class DeformResult:
    """The decomposed/classified output for one scene (infer/evaluate, heavy lane)."""
    scene_id: str
    regime: str
    macro_f1: float | None = None
    ae_auc: float | None = None
    vel_auc: float | None = None
    extra: dict = field(default_factory=dict)
