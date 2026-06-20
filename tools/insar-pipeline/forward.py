"""High-fidelity Sentinel-1 InSAR forward model for a tailings-storage facility.

This is the data foundation of the TailWatch precompute pipeline: a physically-grounded simulator that
produces a LABELLED multi-temporal LOS-displacement stack (ascending + descending), per-epoch coherence,
and a per-pixel ground-truth class map. It is NOT a toy: every term is a real InSAR error/signal source, so
the same SBAS inversion and the same ML that would run on a real LiCSAR clip run here, and the labels let us
train + honestly benchmark the learned methods against classical baselines.

Signal model per epoch e, pixel p (unwrapped LOS displacement, mm; negative = away/subsiding):
    d_obs = proj_LOS(true 3-D motion) + APS_stratified + APS_turbulent + DEM_error(Bperp) + orbital_ramp + decorrelation_noise(coh)
True motion is assigned per ZONE with a labelled deformation regime; the projection uses the real S1 look
geometry (incidence theta, ascending/descending heading). APS_turbulent is a spatially-correlated random
field (von-Karman-like power spectrum) regenerated each epoch; coherence decays with temporal baseline and
is low over water/wet-beach. Deterministic given the seed.

Refs (verified canonical): Hanssen 2001 (radar interferometry / APS); Berardino et al. 2002 (SBAS);
Hooper et al. 2004/2007 (decorrelation); Fattahi & Amelung 2013 (DEM-error vs perpendicular baseline).

Run:  python forward.py --out artifacts/scene.h5 --seed 7
"""
from __future__ import annotations
import argparse, numpy as np, h5py
from numpy.fft import fft2, ifft2, fftfreq

# ---- geometry (Sentinel-1, C-band) -------------------------------------------------------------------
WAVELENGTH_MM = 55.46          # C-band lambda (mm)
THETA = np.deg2rad(39.0)       # incidence angle
DT_DAYS = 12                   # repeat cycle
# LOS unit vectors (East, North, Up); near-polar orbits -> ~0 north sensitivity. asc looks east, desc west.
LOS = {"asc": np.array([+np.sin(THETA), 0.02, np.cos(THETA)]),
       "desc": np.array([-np.sin(THETA), 0.02, np.cos(THETA)])}

# deformation classes (the supervised labels)
CLASSES = ["stable", "linear", "accelerating", "seasonal", "step", "decorrelated"]


def _turbulent_aps(shape, rng, amp_mm=6.0, beta=2.6):
    """Spatially-correlated tropospheric turbulence as a random field with a power-law (von-Karman-like)
    spectrum P(k) ~ k^-beta. Returned in mm of LOS delay."""
    h, w = shape
    ky = fftfreq(h)[:, None]; kx = fftfreq(w)[None, :]
    k = np.sqrt(kx * kx + ky * ky); k[0, 0] = 1e-6
    spec = k ** (-beta / 2.0)
    noise = rng.standard_normal(shape) + 1j * rng.standard_normal(shape)
    field = np.real(ifft2(fft2(noise.real) * spec))
    field -= field.mean()
    s = field.std() or 1.0
    return (field / s) * amp_mm


def _true_motion(t_days, regime, span, sev):
    """True cumulative VERTICAL ground motion (mm, negative = subsiding) for a deformation regime at day t.
    Horizontal (East) is taken as -0.45*vertical (a subsiding dam face also bulges outward)."""
    ooa, t_fail = span * 0.60, span * 1.04
    v_sec, k = 0.02 * sev, 34.0 * sev
    if regime == "stable":
        mu = 0.0
    elif regime == "linear":
        mu = -v_sec * 2.2 * t_days
    elif regime == "accelerating":           # secondary creep then alpha~2 Fukuzono tertiary blow-up
        mu = -v_sec * t_days
        if t_days > ooa:
            mu -= k * np.log((t_fail - ooa) / max(t_fail - t_days, 0.5))
    elif regime == "seasonal":
        mu = -9.0 * np.sin(2 * np.pi * t_days / 365.0)   # reversible annual breathing
    elif regime == "step":
        mu = -28.0 if t_days > span * 0.55 else 0.0
    else:                                    # decorrelated: tiny real motion, dominated by noise
        mu = -v_sec * 0.3 * t_days
    return mu, -0.45 * mu


def build_scene(W=160, H=120, n_ep=60, seed=7, dam_regime="accelerating", dam_sev=1.0):
    """dam_regime overrides the deforming dam+crest zone's behaviour so distinct CASES can be generated
    (accelerating→collapse, stable control, seasonal, step, linear) sharing the same scene structure."""
    rng = np.random.default_rng(seed)
    days = np.arange(n_ep) * DT_DAYS
    span = float(days[-1])

    # --- terrain: a synthetic DEM (dam embankment + pit) for the stratified-APS + DEM-error terms ---
    yy, xx = np.mgrid[0:H, 0:W]
    dem = (40.0 * np.exp(-((yy - H * 0.42) ** 2) / (2 * 7.0 ** 2))             # the dam crest ridge
           + 0.04 * xx + 8.0 * np.exp(-(((xx - W * 0.5) ** 2 + (yy - H * 0.8) ** 2) / (2 * 25.0 ** 2))))

    # --- zones + per-zone deformation label + severity + coherence base ---
    zone = np.zeros((H, W), np.int64)        # class index per pixel
    sev = np.ones((H, W))
    coh0 = np.full((H, W), 0.86)             # base temporal coherence
    cy = H * 0.42
    # dam crest band: the deforming structure (accelerating in the centre, linear on the flanks)
    dam = (np.abs(yy - cy) < 7) & (xx > W * 0.18) & (xx < W * 0.82)
    zone[dam] = CLASSES.index("linear"); coh0[dam] = 0.80
    crest = dam & (xx > W * 0.36) & (xx < W * 0.64)
    zone[crest] = CLASSES.index("accelerating")
    sev[crest] = 1.0 + 0.6 * np.exp(-((xx[crest] - W * 0.5) ** 2) / (2 * (W * 0.10) ** 2))
    if dam_regime != "accelerating":          # override the dam+crest behaviour for distinct CASES
        zone[dam] = CLASSES.index(dam_regime); zone[crest] = CLASSES.index(dam_regime)
    sev[dam] *= dam_sev; sev[crest] *= dam_sev
    # wet tailings beach below: seasonal + low coherence (decorrelation)
    beach = (yy > cy + 7) & (yy < cy + 22) & (xx > W * 0.2) & (xx < W * 0.8)
    zone[beach] = CLASSES.index("seasonal"); coh0[beach] = 0.30
    pond = beach & (((xx - W * 0.5) ** 2 + (yy - (cy + 15)) ** 2) < (W * 0.10) ** 2)
    zone[pond] = CLASSES.index("decorrelated"); coh0[pond] = 0.12
    # a post-rain settling step on one downstream patch
    step = (np.abs(yy - (cy + 4)) < 3) & (xx > W * 0.62) & (xx < W * 0.78)
    zone[step] = CLASSES.index("step")
    # everything else = stable rock (already 0)

    # per-pixel deformation taper (weight) across the deforming zones
    weight = np.where(zone != 0, 0.5 + 0.5 * np.exp(-((yy - cy) ** 2) / (2 * 4.0 ** 2)), 0.0)

    # --- perpendicular-baseline sequence (for the DEM-error term) ---
    bperp = rng.uniform(-150, 150, n_ep)      # metres
    R = 6.9e8  # mm slant range (approx)

    cum = {g: np.zeros((n_ep, H, W), np.float32) for g in LOS}
    coh = np.zeros((n_ep, H, W), np.float32)
    for e in range(n_ep):
        t = float(days[e])
        # true 3-D motion fields (mm) from the labelled regimes
        mU = np.zeros((H, W)); mE = np.zeros((H, W))
        for ci, cname in enumerate(CLASSES):
            m = zone == ci
            if not m.any() or cname in ("stable", "decorrelated"):
                if cname == "decorrelated":
                    u, ee = _true_motion(t, cname, span, 1.0); mU[m] += u; mE[m] += ee
                continue
            u, ee = _true_motion(t, cname, span, 1.0)
            mU[m] += u * sev[m]; mE[m] += ee * sev[m]
        mU *= weight; mE *= weight
        # shared APS + ramp this epoch (same atmosphere seen by both geometries' acquisitions, approx)
        aps_strat = 0.05 * (dem - dem.mean()) * rng.standard_normal()      # phase-elevation, random ZTD scale
        aps_turb = _turbulent_aps((H, W), rng, amp_mm=6.0)
        ramp = (rng.uniform(-2, 2) * (xx / W - 0.5) + rng.uniform(-2, 2) * (yy / H - 0.5))
        dem_err = (bperp[e] / (R * np.sin(THETA))) * (dem - dem.mean()) * 12.0   # mm, ~Bperp-correlated
        # temporal coherence this epoch (decays with temporal baseline) -> decorrelation noise scale
        gamma = np.clip(coh0 * np.exp(-t / 900.0) + 0.05, 0.02, 0.99)
        coh[e] = gamma
        noise_scale = np.sqrt((1 - gamma ** 2) / (2 * gamma ** 2)) * (WAVELENGTH_MM / (4 * np.pi)) * 4.0
        for g, look in LOS.items():
            d_los = look[0] * mE + look[2] * mU                     # project true motion onto this LOS
            obs = d_los + aps_strat + aps_turb + ramp + dem_err + noise_scale * rng.standard_normal((H, W))
            cum[g][e] = obs.astype(np.float32)

    return dict(W=W, H=H, n_ep=n_ep, days=days.astype(np.float64), bperp=bperp,
                cum_asc=cum["asc"], cum_desc=cum["desc"], coh=coh,
                zone=zone.astype(np.int64), dem=dem.astype(np.float32), seed=seed)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="artifacts/scene.h5")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--W", type=int, default=160); ap.add_argument("--H", type=int, default=120)
    ap.add_argument("--n_ep", type=int, default=60)
    a = ap.parse_args()
    import os; os.makedirs(os.path.dirname(a.out), exist_ok=True)
    s = build_scene(a.W, a.H, a.n_ep, a.seed)
    with h5py.File(a.out, "w") as f:
        for k, v in s.items():
            if isinstance(v, np.ndarray):
                f.create_dataset(k, data=v, compression="gzip", compression_opts=4)
            else:
                f.attrs[k] = v
        f.attrs["classes"] = ",".join(CLASSES)
    print(f"wrote {a.out}: {a.n_ep} epochs {a.H}x{a.W}, classes={CLASSES}")
    # quick sanity: class pixel counts + velocity at the accelerating crest
    import collections
    cnt = collections.Counter(s["zone"].ravel().tolist())
    print("class px:", {CLASSES[i]: cnt.get(i, 0) for i in range(len(CLASSES))})


if __name__ == "__main__":
    main()
