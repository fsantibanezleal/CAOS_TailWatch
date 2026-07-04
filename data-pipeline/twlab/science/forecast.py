"""Inverse-velocity forecaster self-validation, PURE NUMPY (no torch), so it is the single
source of truth for the tw-cases.json `forecast` block and can be regenerated in isolation
(rebuild_forecast) without the heavy training lane. Extracted from train_models.py (#24)."""
from __future__ import annotations

import os

import numpy as np

from .forward import build_scene
from .sbas import decompose_up

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "derived"))


def _inverse_velocity(cum, days):
    """Fukuzono inverse-velocity time-of-failure from a cumulative-deformation series; None if no
    accelerating trend (b >= 0 or a weak fit). The failure detector, shared by the MC + controls."""
    v = np.zeros(len(cum))  # EWMA velocity
    for k in range(1, len(cum)):
        raw = (cum[k] - cum[k - 1]) / max(days[k] - days[k - 1], 1e-6); v[k] = 0.4 * raw + 0.6 * v[k - 1]
    vmag = np.abs(v); invv = 1.0 / np.maximum(vmag, 1e-4)
    base = vmag[:max(3, int(len(vmag) * 0.4))]; mean, sd = base.mean(), base.std() + 1e-9
    ooa = -1
    for k in range(1, len(vmag) - 1):
        if vmag[k] > mean + 3 * sd and vmag[k + 1] > vmag[k]: ooa = k; break
    f0 = ooa if ooa > 0 else int(len(days) * 0.6)
    xs, ys = days[f0:], invv[f0:]
    if len(xs) < 4: return None
    A = np.polyfit(xs, ys, 1); b, a = A[0], A[1]
    pred = a + b * xs; ss = ((ys - pred) ** 2).sum(); tot = ((ys - ys.mean()) ** 2).sum() or 1e-9
    r2 = 1 - ss / tot
    if b < 0 and r2 > 0.55: return -a / b
    return None


def _crest_series(sc):
    """Crest-patch spatial mean + temporal low-pass (APS is temporally white) of a scene's up cube."""
    up = decompose_up(sc["cum_asc"], sc["cum_desc"])
    raw = up[:, 44:57, 68:92].reshape(len(sc["days"]), -1).mean(1)
    return np.convolve(np.r_[raw[0], raw[0], raw, raw[-1], raw[-1]], np.ones(5) / 5, mode="valid"), sc["days"]


def forecast_benchmark(days_list: list) -> dict:
    """Inverse-velocity forecaster self-validation. Pure numpy (no torch lane) so it is the single
    source of truth for the `forecast` block and can be regenerated in isolation (#24):

      * accelerating MC (40 seeded failing scenes) -> detectRate, median t_f error, lead-time curve;
      * CONTROL BANK (60 seeded non-failing scenes: stable / linear-settling / seasonal) through the
        SAME detector -> falseAlarmRate = controls that ever fired a finite failure time. This
        replaces the removed degenerate forecast-benchmark.json that solely backed the
        zero-false-alarm claim.
    """
    fc_pts, detected, ntraj = [], 0, 0
    span = float(days_list[-1]); true_tf = span * 1.04
    for seed in range(201, 241):
        sc = build_scene(W=160, H=120, n_ep=60, seed=seed, dam_regime="accelerating", dam_sev=1.5)
        ser, days = _crest_series(sc)
        ntraj += 1; ever = False
        k0 = int(len(days) * 0.62); k0 += (len(days) - k0) % 2
        for k in range(k0, len(days) + 1, 2):
            tf = _inverse_velocity(ser[:k], days[:k])
            if tf is None: continue
            ever = True; lead = true_tf - days[k - 1]
            if lead <= 0: continue
            fc_pts.append((lead, abs(tf - true_tf) / true_tf))
        if ever: detected += 1
    lead_curve = []
    for lo, hi in [(0, 40), (40, 80), (80, 140), (140, 260)]:
        sub = [e for (lead, e) in fc_pts if lo <= lead < hi]
        lead_curve.append(dict(lo=lo, hi=hi, n=len(sub), medErr=round(float(np.median(sub)), 4) if sub else None))

    n_ctrl, false_alarms, ctrl_by_regime = 0, 0, {}
    for reg in ["stable", "linear", "seasonal"]:
        reg_fired = 0
        for seed in range(301, 321):  # 20 seeded controls per regime, disjoint from the failing set
            sc = build_scene(W=160, H=120, n_ep=60, seed=seed, dam_regime=reg, dam_sev=1.0)
            ser, days = _crest_series(sc)
            fired = False
            k0 = int(len(days) * 0.62); k0 += (len(days) - k0) % 2
            for k in range(k0, len(days) + 1, 2):
                if _inverse_velocity(ser[:k], days[:k]) is not None:
                    fired = True; break  # any finite time-of-failure on a non-failing scene is a false alarm
            n_ctrl += 1; reg_fired += int(fired); false_alarms += int(fired)
        ctrl_by_regime[reg] = dict(n=20, falseAlarms=reg_fired)

    return dict(detectRate=round(detected / max(ntraj, 1), 3), nTraj=ntraj,
                medErrPct=round(100 * float(np.median([e for _, e in fc_pts])), 1) if fc_pts else None,
                leadCurve=lead_curve,
                falseAlarmRate=round(false_alarms / max(n_ctrl, 1), 3), nControl=n_ctrl,
                controlRegimes=ctrl_by_regime)
