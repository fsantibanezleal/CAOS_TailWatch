"""Seeded determinism, the single RNG factory. A run must be a pure function of (params, seed): never use a
global/implicit RNG anywhere in the pipeline; always thread one made here."""
from __future__ import annotations

import numpy as np


def make_rng(seed: int) -> np.random.Generator:
    return np.random.default_rng(int(seed))
