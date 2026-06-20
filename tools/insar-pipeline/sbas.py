"""Shared InSAR processing used by the training + artifact scripts.

Real, light SBAS-consistent steps on the forward stacks: 2-geometry LOS decomposition to Vertical (Up),
per-pixel velocity by ordinary least squares, and the velocity-significance test. (The full small-baseline
network SVD inversion is the offline heavy tier; the forward model already delivers the per-epoch
displacement a network inversion would recover, so here we run the per-pixel temporal modelling that the
classical baseline + the learned methods consume.)

Refs: Berardino et al. 2002 (SBAS); Wright et al. 2004 (3-D/decomposition).
"""
from __future__ import annotations
import numpy as np, h5py

THETA = np.deg2rad(39.0)
COS, SIN = np.cos(THETA), np.sin(THETA)


def load_scene(path):
    with h5py.File(path, "r") as f:
        d = {k: f[k][...] for k in f.keys()}
        d["classes"] = f.attrs["classes"].split(",")
        d["days"] = d["days"].astype(np.float64)
    return d


def decompose_up(asc, desc):
    """(asc + desc) / (2 cosθ) → Vertical (Up) cumulative stack (n_ep,H,W)."""
    return (asc + desc) / (2.0 * COS)


def velocity(cum, days):
    """Per-pixel OLS velocity (mm/yr) = slope of cum vs day × 365."""
    n = len(days); t = days - days.mean()
    den = (t * t).sum()
    num = (t[:, None, None] * (cum - cum.mean(0))).sum(0)
    return (num / den) * 365.0


def vel_significance(cum, days):
    """t-statistic of the OLS slope (|t| large ⇒ a significant trend, not noise)."""
    n = len(days); t = days - days.mean(); den = (t * t).sum()
    slope = (t[:, None, None] * (cum - cum.mean(0))).sum(0) / den
    intercept = cum.mean(0) - slope * days.mean()
    pred = slope[None] * days[:, None, None] + intercept[None]
    resid = cum - pred
    se = np.sqrt((resid ** 2).sum(0) / max(n - 2, 1) / den)
    return slope / (se + 1e-9)
