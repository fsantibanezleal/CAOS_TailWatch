"""CONTRACT 1, ingestion (raw InSAR scene -> pipeline). The *bring-your-own-scene* gate.

Declares the required schema (columns, units, ranges) of a synthetic InSAR scene descriptor and an EXPLICIT outlier
policy: a scene is ACCEPTED iff it passes; ill-formed scenes are REJECTED with a reason (never silently coerced);
plausible-but-suspicious scenes are FLAGGED (accepted; the flag travels into the manifest, e.g. a decorrelated
scene whose coherence mask will dominate). This is what lets TailWatch ingest a NEW displacement stack instead of
only replaying the baked cases. Documented in data/README.md.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from .schema import CLASSES, SceneSpec

REQUIRED_COLUMNS: tuple[str, ...] = ("scene_id", "W", "H", "n_ep", "regime")

VALID_REGIMES: frozenset[str] = frozenset(CLASSES)
W_RANGE = (32, 4096)
H_RANGE = (32, 4096)
NEP_RANGE = (3, 500)            # SBAS needs >= a handful of acquisitions
SEV_FLAG_MAX = 4.0             # severity above this is implausible => FLAG
COH_RANGE = (0.0, 1.0)


@dataclass
class ContractReport:
    accepted: list[SceneSpec]
    rejected: list[dict[str, Any]]
    flagged: list[dict[str, Any]]

    @property
    def ok(self) -> bool:
        return len(self.accepted) > 0

    def summary(self) -> str:
        return f"{len(self.accepted)} accepted, {len(self.rejected)} rejected, {len(self.flagged)} flagged"


def validate_records(raw_rows: list[dict[str, Any]]) -> ContractReport:
    """Apply CONTRACT 1 to raw scene descriptors (e.g. from a CSV). Pure; deterministic; no I/O."""
    accepted: list[SceneSpec] = []
    rejected: list[dict[str, Any]] = []
    flagged: list[dict[str, Any]] = []

    for i, row in enumerate(raw_rows):
        sid = str(row.get("scene_id", f"row{i}"))
        missing = [c for c in REQUIRED_COLUMNS if c not in row or row[c] in (None, "")]
        if missing:
            rejected.append({"row": i, "scene_id": sid, "reason": f"missing/empty columns: {missing}"})
            continue
        try:
            W = int(float(row["W"]))
            H = int(float(row["H"]))
            n_ep = int(float(row["n_ep"]))
        except (TypeError, ValueError):
            rejected.append({"row": i, "scene_id": sid, "reason": "non-numeric W/H/n_ep"})
            continue
        regime = str(row["regime"]).lower()

        bad: list[str] = []
        if not (W_RANGE[0] <= W <= W_RANGE[1]):
            bad.append(f"W={W} out of {W_RANGE}")
        if not (H_RANGE[0] <= H <= H_RANGE[1]):
            bad.append(f"H={H} out of {H_RANGE}")
        if not (NEP_RANGE[0] <= n_ep <= NEP_RANGE[1]):
            bad.append(f"n_ep={n_ep} out of {NEP_RANGE} (SBAS needs enough acquisitions)")
        if regime not in VALID_REGIMES:
            bad.append(f"regime={regime!r} not in {sorted(VALID_REGIMES)}")
        if bad:
            rejected.append({"row": i, "scene_id": sid, "reason": "; ".join(bad)})
            continue

        rec_flags: list[str] = []
        try:
            sev = float(row.get("dam_sev") or 1.0)
        except (TypeError, ValueError):
            sev = 1.0
        if not math.isfinite(sev) or sev < 0:
            rejected.append({"row": i, "scene_id": sid, "reason": f"dam_sev={sev} non-finite/negative"})
            continue
        if sev > SEV_FLAG_MAX:
            rec_flags.append(f"dam_sev={sev:g} > {SEV_FLAG_MAX:g} (implausibly large deformation)")
        if regime == "decorrelated":
            rec_flags.append("decorrelated regime, coherence mask dominates; velocity/forecast unreliable")
        coh = row.get("coherence_threshold")
        coh_t = 0.3
        if coh not in (None, ""):
            try:
                coh_t = float(coh)
                if not (COH_RANGE[0] <= coh_t <= COH_RANGE[1]):
                    rec_flags.append(f"coherence_threshold={coh_t:g} outside {COH_RANGE}")
            except (TypeError, ValueError):
                rec_flags.append(f"coherence_threshold={coh!r} non-numeric, default 0.3")

        if rec_flags:
            flagged.append({"scene_id": sid, "flags": rec_flags})
        accepted.append(SceneSpec(scene_id=sid, W=W, H=H, n_ep=n_ep, regime=regime, dam_sev=sev,
                                  coherence_threshold=coh_t, flags=tuple(rec_flags)))
    return ContractReport(accepted=accepted, rejected=rejected, flagged=flagged)
