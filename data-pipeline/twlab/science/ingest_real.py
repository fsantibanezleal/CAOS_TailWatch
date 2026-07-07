"""Ingest a REAL LiCSBAS time-series (cum.h5) into the App's cube format (the Synthetic | Real Source lane).

This is the heavy-lane counterpart of the synthetic cube export in ``train_models.py``: instead of a forward
simulation it reads a real Sentinel-1 InSAR displacement stack produced by LiCSBAS (COMET LiCSAR frame), clips a
small AOI over the documented deformation, decimates the epochs, projects the line-of-sight (LOS) displacement to
the vertical, runs the SAME committed synthetic-trained ONNX models cross-domain (conv-AE anomaly + 1-D CNN class +
AE latent), and writes the identical ``f32x8 + i16 cum`` layout as ``tw-real-<site>.bin`` plus a per-case entry in
``tw-cases.json`` (with a per-case grid + real ``days`` + ``source`` + ``provenance``).

Honesty (mirrored in the App per-mode banner):
  REAL   : velDesc (real LOS velocity), coherence (coh_avg), the cumulative series, cumulative-vs-time, and the
           classical inverse-velocity 1/v curve are computed directly on the real displacement.
  vertical assumption : velUp / cumUp use the real per-pixel LOS unit vector (U.geo) under a single-geometry
           vertical-only assumption (this descending-only frame cannot resolve East, so velEast/velAsc are left
           unavailable and the App restricts the component selector to Up + Descending LOS for the real case).
  cross-domain (synthetic-model on real input) : the AE anomaly map, the CNN class map, the AE latent, and the
           derived ``zone`` come from the synthetic-trained ONNX applied to real data; they are model output, not
           verified ground truth. The failure/collapse-time forecast stays illustrative.

Source + license (redistribution of a small modified clip is permitted WITH attribution):
  LiCSAR contains modified Copernicus Sentinel data, analysed by COMET; LiCSBAS by Morishita et al. The exact
  frame/AOI/dates/DOIs/attribution are recorded in the emitted provenance JSON and echoed in the App.

Run (needs onnx + onnxruntime + numpy + scipy + h5py in .venv-pipeline; the cum.h5 is NOT committed, it is read
from a local path):

    python -m twlab.science.ingest_real /path/to/TS_.../cum.h5
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[3]
DERIVED = REPO_ROOT / "data" / "derived"
MODELS = DERIVED  # ae.onnx + cnn.onnx live in data/derived (copied to the SPA by copy-data.mjs)

# --- the shared frozen constants the browser replicates (kept in sync with io/schema.py + train_models.py) ---
VEL_SCALE = 60.0
PATCH = 16
CUMSCALE = 10.0
CNN_LEN = 60           # the committed cnn.onnx fixes the series length to 60; we resample to it
CLASSES = ["stable", "linear", "accelerating", "seasonal", "step", "decorrelated"]

# --- the chosen real product: COMET LiCSAR frame 124D_04854_171313, processed with LiCSBAS ---
#     descending track 124, over the Campi Flegrei caldera (Pozzuoli, Italy), the LiCSBAS tutorial sample.
SITE_ID = "real-cf"
FRAME_ID = "124D_04854_171313"
SITE = "Campi Flegrei caldera (Pozzuoli, Italy)"
GEOMETRY = "descending (single geometry)"
# AOI clip chosen offline to maximise coherent land coverage while capturing the uplift bullseye (Solfatara/Pozzuoli)
CLIP_Y0, CLIP_X0, CLIP_SIZE = 20, 86, 64
N_EPOCHS = 40          # decimate the real 67 acquisitions to 40 (uniform in index), keeping the real dates

ATTRIBUTION = (
    "LiCSAR contains modified Copernicus Sentinel data 2016-2021 analysed by the Centre for the Observation and "
    "Modelling of Earthquakes, Volcanoes and Tectonics (COMET); time series by LiCSBAS (Morishita et al. 2020)."
)
CITATIONS = [
    "Lazecky et al. 2020, Remote Sens. 12(15):2430, DOI 10.3390/rs12152430 (LiCSAR)",
    "Morishita et al. 2020, Remote Sens. 12(3):424, DOI 10.3390/rs12030424 (LiCSBAS)",
]
LICENSE = "modified Copernicus Sentinel data, Copernicus free and open license (redistribution + modification permitted with attribution)"


def _ort_session(path: Path):
    import onnxruntime as ort
    return ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])


def _encoder_session():
    """Extract the AE encoder subgraph (input patch -> 16-D bottleneck) so we can embed real patches."""
    import onnx
    import onnxruntime as ort

    tmp = DERIVED / "_ae_encoder_tmp.onnx"
    onnx.utils.extract_model(str(MODELS / "ae.onnx"), str(tmp), ["patch"], ["/enc/enc.5/Gemm_output_0"])
    sess = ort.InferenceSession(str(tmp), providers=["CPUExecutionProvider"])
    tmp.unlink(missing_ok=True)
    return sess


def _velocity_patches(field: np.ndarray, stride: int):
    """(field / VEL_SCALE) 16x16 patches + their centre pixel, mirroring train_models.velocity_patches."""
    H, W = field.shape
    v = (field / VEL_SCALE).astype(np.float32)
    patches, centers = [], []
    for y in range(0, H - PATCH + 1, stride):
        for x in range(0, W - PATCH + 1, stride):
            patches.append(v[y:y + PATCH, x:x + PATCH])
            centers.append((y + PATCH // 2, x + PATCH // 2))
    return np.asarray(patches, np.float32)[:, None], centers


def _anomaly_map(ae, field: np.ndarray) -> np.ndarray:
    """Per-pixel AE reconstruction error over the velocity field (synthetic-trained model, cross-domain)."""
    from scipy.ndimage import grey_dilation

    H, W = field.shape
    P, centers = _velocity_patches(field, stride=2)
    rec = ae.run(None, {"patch": P})[0]
    err = ((rec - P) ** 2).mean((1, 2, 3))
    amap = np.zeros((H, W)); cnt = np.zeros((H, W))
    for e, (cy, cx) in zip(err, centers):
        amap[cy, cx] += e; cnt[cy, cx] += 1
    amap = np.where(cnt > 0, amap / np.maximum(cnt, 1), 0.0)
    m = amap.copy()
    for _ in range(PATCH // 2):
        d = grey_dilation(m, size=3); m = np.where(m > 0, m, d)
    return m.astype(np.float32)


def _resample_to(rows: np.ndarray, n: int) -> np.ndarray:
    """Linear-resample each row (N, L) to length n along axis 1 (the CNN needs a fixed length)."""
    L = rows.shape[1]
    if L == n:
        return rows.astype(np.float32)
    xo = np.linspace(0.0, 1.0, L)
    xn = np.linspace(0.0, 1.0, n)
    out = np.empty((rows.shape[0], n), np.float32)
    for i in range(rows.shape[0]):
        out[i] = np.interp(xn, xo, rows[i])
    return out


def _class_map(cnn, cum_up: np.ndarray) -> np.ndarray:
    """1-D CNN per-pixel class over the (resampled, standardised) cumulative-Up series (cross-domain)."""
    nEp, H, W = cum_up.shape
    series = cum_up.reshape(nEp, -1).T                     # (HW, nEp)
    series = _resample_to(series, CNN_LEN)                 # (HW, 60)
    mu = series.mean(1, keepdims=True); sd = series.std(1, keepdims=True) + 1e-6
    x = ((series - mu) / sd)[:, None].astype(np.float32)   # (HW, 1, 60)
    logits = cnn.run(None, {"series": x})[0]
    return logits.argmax(1).reshape(H, W).astype(np.float32)


def _latent_2d(enc, field: np.ndarray, class_map: np.ndarray) -> list[dict]:
    """Embed real velocity patches through the AE encoder, then project 16-D -> 2-D by PCA (numpy SVD)."""
    P, centers = _velocity_patches(field, stride=6)
    lat = enc.run(None, {"patch": P})[0]                   # (N, 16)
    lat = lat - lat.mean(0, keepdims=True)
    _, _, vt = np.linalg.svd(lat, full_matrices=False)
    emb = lat @ vt[:2].T                                   # (N, 2)
    return [
        {"x": round(float(emb[k, 0]), 3), "y": round(float(emb[k, 1]), 3), "cls": int(class_map[cy, cx])}
        for k, (cy, cx) in enumerate(centers)
    ]


def _read_licsbas(cum_h5: Path) -> dict:
    import h5py

    with h5py.File(cum_h5, "r") as f:
        d = {
            "cum": f["cum"][...].astype(np.float64),       # (n_im, H, W) cumulative LOS displacement (mm)
            "imdates": f["imdates"][...].astype(np.int64),  # (n_im,) yyyymmdd
            "coh_avg": f["coh_avg"][...].astype(np.float64),
            "vel": f["vel"][...].astype(np.float64),        # (H, W) LOS velocity (mm/yr)
            "U": f["U.geo"][...].astype(np.float64),        # up-component of the LOS unit vector
            "corner_lat": float(f["corner_lat"][()]),
            "corner_lon": float(f["corner_lon"][()]),
            "post_lat": float(f["post_lat"][()]),
            "post_lon": float(f["post_lon"][()]),
        }
    return d


def _days_from_imdates(imdates: np.ndarray) -> list[float]:
    import datetime as dt

    def _d(v: int) -> dt.date:
        s = str(int(v))
        return dt.date(int(s[:4]), int(s[4:6]), int(s[6:8]))

    d0 = _d(imdates[0])
    return [float((_d(v) - d0).days) for v in imdates]


def main(argv: list[str] | None = None) -> None:
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv:
        raise SystemExit(
            "usage: python -m twlab.science.ingest_real <path-to-cum.h5>\n"
            "  cum.h5 = a LiCSBAS time-series (the tutorial sample: frame 124D_04854_171313, Campi Flegrei):\n"
            "  https://raw.githubusercontent.com/wiki/yumorishita/LiCSBAS/sample/LiCSBAS_sample_CF.tar.gz"
        )
    cum_h5 = Path(argv[0]).expanduser().resolve()
    if not cum_h5.exists():
        raise SystemExit(f"cum.h5 not found: {cum_h5}")

    raw = _read_licsbas(cum_h5)
    y0, x0, S = CLIP_Y0, CLIP_X0, CLIP_SIZE

    # --- epoch decimation (keep the real, irregular acquisition dates) ---
    n_im = raw["cum"].shape[0]
    ep_idx = np.unique(np.linspace(0, n_im - 1, N_EPOCHS).round().astype(int))
    imdates = raw["imdates"][ep_idx]
    days = _days_from_imdates(imdates)

    # --- AOI clip ---
    cum_los = raw["cum"][ep_idx, y0:y0 + S, x0:x0 + S]      # (nEp, S, S) LOS mm
    vel_los = raw["vel"][y0:y0 + S, x0:x0 + S]              # (S, S) LOS mm/yr (real)
    U = raw["U"][y0:y0 + S, x0:x0 + S]                      # (S, S) LOS up-component
    coh = np.nan_to_num(raw["coh_avg"][y0:y0 + S, x0:x0 + S], nan=0.0)

    # low-coherence / masked pixels have NaN displacement -> treat as no motion (the coherence mask greys them)
    Usafe = np.where(np.abs(U) > 0.2, U, np.nan)
    cum_up = np.nan_to_num(cum_los / Usafe, nan=0.0)        # vertical (single-geometry assumption)
    velUp = np.nan_to_num(vel_los / Usafe, nan=0.0).astype(np.float32)
    velDesc = np.nan_to_num(vel_los, nan=0.0).astype(np.float32)  # real descending LOS velocity
    velEast = np.zeros_like(velUp)                          # unavailable from a single geometry
    velAsc = np.zeros_like(velUp)                           # unavailable (no ascending frame)

    # re-reference the cumulative Up so the first epoch is zero (a stable temporal baseline for the series/scrubber)
    cum_up = (cum_up - cum_up[0:1]).astype(np.float64)

    # --- the synthetic-trained ONNX, run cross-domain on the real input ---
    ae = _ort_session(MODELS / "ae.onnx")
    cnn = _ort_session(MODELS / "cnn.onnx")
    enc = _encoder_session()
    anomaly = _anomaly_map(ae, velUp)
    class_map = _class_map(cnn, cum_up.astype(np.float32))
    zone = class_map.copy()                                 # derived, not ground truth
    latent = _latent_2d(enc, velUp, class_map)

    # --- write the cube in the identical f32x8 + i16 cum layout ---
    maps = [velUp, velEast, velAsc, velDesc, anomaly, class_map, coh.astype(np.float32), zone]
    buf = b"".join(np.ascontiguousarray(mm, np.float32).ravel().tobytes() for mm in maps)
    buf += np.clip(cum_up * CUMSCALE, -32760, 32760).astype(np.int16).ravel().tobytes()
    out_bin = DERIVED / f"tw-{SITE_ID}.bin"
    out_bin.write_bytes(buf)

    # --- provenance (committed; the cum.h5 itself is NOT committed) ---
    lat0 = raw["corner_lat"] + y0 * raw["post_lat"]
    lon0 = raw["corner_lon"] + x0 * raw["post_lon"]
    lat1 = raw["corner_lat"] + (y0 + S) * raw["post_lat"]
    lon1 = raw["corner_lon"] + (x0 + S) * raw["post_lon"]
    provenance = {
        "source": "COMET LiCSAR + LiCSBAS (real Sentinel-1 InSAR)",
        "frameId": FRAME_ID,
        "site": SITE,
        "geometry": GEOMETRY,
        "dates": f"{int(imdates[0])} to {int(imdates[-1])}",
        "nEpochsUsed": int(len(ep_idx)),
        "nEpochsAvailable": int(n_im),
        "aoiPixels": {"y0": y0, "x0": x0, "size": S},
        "aoiBBox": {"latMin": round(min(lat0, lat1), 4), "latMax": round(max(lat0, lat1), 4),
                    "lonMin": round(min(lon0, lon1), 4), "lonMax": round(max(lon0, lon1), 4)},
        "postDeg": {"lat": raw["post_lat"], "lon": raw["post_lon"]},
        "license": LICENSE,
        "attribution": ATTRIBUTION,
        "citations": CITATIONS,
        "cumH5Sha256": hashlib.sha256(cum_h5.read_bytes()).hexdigest(),
        "honesty": {
            "real": ["velocity (descending LOS)", "coherence (coh_avg)", "cumulative series", "cumulative-vs-time",
                     "inverse-velocity 1/v (classical)"],
            "verticalAssumption": ["velUp and cumUp use the real LOS up-vector under a single-geometry vertical-only "
                                   "assumption; East/Ascending are unavailable from this descending-only frame"],
            "crossDomain": ["AE anomaly", "CNN class", "AE latent", "zone (derived)"],
            "syntheticOnly": ["failure / collapse-time forecast stays illustrative"],
        },
    }
    (DERIVED / f"tw-{SITE_ID}.provenance.json").write_text(json.dumps(provenance, indent=2), encoding="utf-8")

    # --- append / replace the case entry in tw-cases.json ---
    manifest_path = DERIVED / "tw-cases.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    case_entry = {
        "id": SITE_ID,
        "en": "Real Sentinel-1: Campi Flegrei caldera",
        "es": "Sentinel-1 real: caldera Campi Flegrei",
        "regime": "accelerating",
        "latent": latent,
        "source": "real",
        "W": S, "H": S, "nEp": int(len(ep_idx)), "days": days,
        "components": ["up", "desc"],
        "provenance": provenance,
    }
    manifest["cases"] = [c for c in manifest.get("cases", []) if c.get("id") != SITE_ID] + [case_entry]
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    print(f"[ingest_real] wrote {out_bin.name} ({out_bin.stat().st_size // 1024} KB), "
          f"grid {S}x{S} x {len(ep_idx)} ep, days {days[0]:.0f}..{days[-1]:.0f}")
    print(f"[ingest_real] frame {FRAME_ID} ({SITE}); velUp {velUp.min():.1f}..{velUp.max():.1f} mm/yr; "
          f"coh mean {coh[coh > 0].mean():.2f}; class mix "
          f"{ {CLASSES[int(k)]: int((class_map == k).sum()) for k in np.unique(class_map)} }")


if __name__ == "__main__":
    main()
