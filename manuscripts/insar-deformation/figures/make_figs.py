#!/usr/bin/env python3
"""Regenerate the figures for the TailWatch InSAR-deformation report from the COMMITTED artifacts. Three figures:

  fig-campiflegrei.pdf - the REAL Campi Flegrei case (COMET LiCSAR/LiCSBAS Sentinel-1): the line-of-sight
                         displacement map over the observation window and the crest cumulative time series.
  fig-forecast.pdf     - the classical inverse-velocity (Fukuzono) failure forecast: median forecast error vs
                         time-to-failure, on the synthetic accelerating cases and on the real Campi Flegrei case.
  fig-learned.pdf      - the learned tier: anomaly-detection ROC (autoencoder + velocity) and the six-class
                         deformation-type confusion matrix (macro-F1).

Run:  python make_figs.py     (from repo root)
Deps: matplotlib, numpy.
"""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DER = ROOT / "data" / "derived"
DATA = HERE.parent / "data"

INK = "#1a1a2e"
GRID = "#d8d8e0"

plt.rcParams.update({
    "font.family": "serif", "font.size": 9.4, "axes.edgecolor": INK,
    "axes.labelcolor": INK, "text.color": INK, "xtick.color": INK, "ytick.color": INK,
    "axes.linewidth": 0.8, "figure.dpi": 200,
})


def fig_campiflegrei():
    d = np.load(DATA / "campiflegrei.npz")
    vel = d["velmap"]
    crest = d["crest"]
    py, px = d["peak"]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.0, 3.0), gridspec_kw={"width_ratios": [1, 1.1]})
    vmax = np.nanpercentile(np.abs(vel), 98)
    im = a1.imshow(vel, cmap="RdBu_r", vmin=-vmax, vmax=vmax, origin="upper")
    a1.plot(px, py, "k+", markersize=10, markeredgewidth=1.6)
    a1.set_title("(a) LOS displacement map (mm)\nCampi Flegrei caldera, 2016-2018", fontsize=8.4)
    a1.set_xlabel("range (px)"); a1.set_ylabel("azimuth (px)")
    fig.colorbar(im, ax=a1, fraction=0.046, pad=0.02)
    ep = np.arange(len(crest))
    m = np.isfinite(crest)
    a2.plot(ep[m], crest[m], "o-", color="#1b6ca8", linewidth=1.6, markersize=3.5)
    a2.set_title("(b) crest cumulative LOS series\n(peak-deformation pixel +)", fontsize=8.4)
    a2.set_xlabel("epoch"); a2.set_ylabel("LOS displacement (mm)")
    a2.grid(True, color=GRID, linewidth=0.7)
    a2.set_axisbelow(True)
    for s in ("top", "right"):
        a2.spines[s].set_visible(False)
    fig.suptitle("Real Sentinel-1 InSAR (COMET LiCSAR + LiCSBAS), descending frame 124D",
                 fontsize=8.6, y=1.03)
    fig.tight_layout()
    fig.savefig(HERE / "fig-campiflegrei.pdf", bbox_inches="tight")
    plt.close(fig)


def fig_forecast():
    tc = json.loads((DER / "tw-cases.json").read_text(encoding="utf-8"))
    rc = json.loads((DER / "real-cf" / "trace.json").read_text(encoding="utf-8"))
    fig, ax = plt.subplots(figsize=(6.0, 3.0))
    for src, lab, col in [(tc["forecast"], "synthetic accelerating (n=180)", "#e07a3f"),
                          (rc["forecast"], "real Campi Flegrei (n=40)", "#1b6ca8")]:
        lc = src.get("leadCurve", [])
        mid = [(l.get("mid") if l.get("mid") is not None else 0.5 * (l.get("lo", 0) + l.get("hi", 0))) for l in lc]
        err = [100 * (l.get("medErr") if l.get("medErr") is not None else l.get("medAbsRelErr", 0)) for l in lc]
        ax.plot(mid, err, "o-", color=col, linewidth=1.8, markersize=5, label=lab)
    ax.set_xlabel("lead time before failure (days)")
    ax.set_ylabel("median forecast error (% of true failure time)")
    ax.set_title("Inverse-velocity (Fukuzono) failure forecast:\naccurate near failure, 100% detection",
                 fontsize=9.0)
    ax.grid(True, color=GRID, linewidth=0.7)
    ax.set_axisbelow(True)
    ax.legend(fontsize=8.0, frameon=True, facecolor="white", edgecolor=GRID, loc="upper left")
    ax.text(0.97, 0.05, "median |error|: 3.8% (synth) / 5.7% (real)", transform=ax.transAxes,
            ha="right", va="bottom", fontsize=8, style="italic", color="#555",
            bbox=dict(boxstyle="round,pad=0.3", fc="white", ec=GRID))
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    fig.tight_layout()
    fig.savefig(HERE / "fig-forecast.pdf", bbox_inches="tight")
    plt.close(fig)


def fig_learned():
    tc = json.loads((DER / "tw-cases.json").read_text(encoding="utf-8"))
    bm = tc["benchmark"]
    classes = tc["classes"]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.0, 3.1), gridspec_kw={"width_ratios": [1, 1.15]})

    # (a) ROC curves
    for key, lab, col, auc in [("aeRoc", "autoencoder anomaly", "#e07a3f", bm["aeAuc"]),
                               ("velRoc", "velocity anomaly", "#1b6ca8", bm["velAuc"])]:
        r = bm[key]
        a1.plot(r["fpr"], r["tpr"], "-", color=col, linewidth=1.8, label=f"{lab} (AUC {auc:.3f})")
    a1.plot([0, 1], [0, 1], color="#999", linewidth=0.9, linestyle="--")
    a1.set_xlabel("false-positive rate"); a1.set_ylabel("true-positive rate")
    a1.set_title("(a) anomaly detection", fontsize=8.6)
    a1.set_xlim(0, 1); a1.set_ylim(0, 1.02)
    a1.grid(True, color=GRID, linewidth=0.7)
    a1.set_axisbelow(True)
    a1.legend(fontsize=7.2, frameon=True, facecolor="white", edgecolor=GRID, loc="lower right")
    for s in ("top", "right"):
        a1.spines[s].set_visible(False)

    # (b) confusion matrix (row-normalized recall)
    C = np.array(bm["confusion"], dtype=float)
    Cn = C / C.sum(axis=1, keepdims=True).clip(min=1)
    im = a2.imshow(Cn, cmap="Blues", vmin=0, vmax=1)
    a2.set_xticks(range(len(classes))); a2.set_xticklabels(classes, rotation=40, ha="right", fontsize=6.6)
    a2.set_yticks(range(len(classes))); a2.set_yticklabels(classes, fontsize=6.6)
    for i in range(len(classes)):
        for j in range(len(classes)):
            if Cn[i, j] > 0.02:
                a2.text(j, i, f"{Cn[i,j]:.2f}", ha="center", va="center",
                        fontsize=6.0, color="white" if Cn[i, j] > 0.5 else INK)
    a2.set_title(f"(b) deformation-type confusion\n(macro-F1 {bm['macroF1']:.3f})", fontsize=8.6)
    a2.set_xlabel("predicted"); a2.set_ylabel("true")
    fig.colorbar(im, ax=a2, fraction=0.046, pad=0.02)
    fig.tight_layout()
    fig.savefig(HERE / "fig-learned.pdf", bbox_inches="tight")
    plt.close(fig)


def main():
    fig_campiflegrei()
    fig_forecast()
    fig_learned()
    print("wrote fig-campiflegrei.pdf, fig-forecast.pdf, fig-learned.pdf")


if __name__ == "__main__":
    main()
