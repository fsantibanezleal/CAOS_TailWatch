"""Guard for the forecast false-alarm control bank (#24).

The old forecast-benchmark.json was degenerate (180 claimed trajectories, 3 unique tuples) with no
in-repo generator, and solely backed the zero-false-alarm claim. It is removed. The forecast block
in tw-cases.json must now carry a REAL control bank (falseAlarmRate over non-failing scenes) that
the numpy-only forecast module regenerates.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_orphan_benchmark_artifact_is_gone():
    assert not (ROOT / "data" / "derived" / "forecast-benchmark.json").exists(), \
        "the degenerate forecast-benchmark.json must not be committed"


def test_forecast_block_has_control_bank():
    art = ROOT / "data" / "derived" / "tw-cases.json"
    if not art.exists():
        import pytest
        pytest.skip("manifest not baked in this environment")
    fc = json.loads(art.read_text(encoding="utf-8"))["forecast"]
    assert "falseAlarmRate" in fc and 0.0 <= fc["falseAlarmRate"] <= 1.0
    assert fc.get("nControl", 0) >= 40, "need a real control bank, not a token"
    regs = fc.get("controlRegimes", {})
    assert set(regs) >= {"stable", "linear", "seasonal"}, "controls must span non-failing regimes"
    # internal consistency: the reported rate matches the per-regime counts
    total = sum(r["n"] for r in regs.values())
    fired = sum(r["falseAlarms"] for r in regs.values())
    assert total == fc["nControl"]
    assert abs(fired / total - fc["falseAlarmRate"]) < 1e-6


def test_forecast_is_not_degenerate():
    """The old artifact had 3 unique tuples over 180 trajectories; the live block reports a real MC."""
    art = ROOT / "data" / "derived" / "tw-cases.json"
    if not art.exists():
        import pytest
        pytest.skip("manifest not baked in this environment")
    fc = json.loads(art.read_text(encoding="utf-8"))["forecast"]
    assert fc["nTraj"] == 40  # the current accelerating MC, not the phantom 180
    assert fc["medErrPct"] is not None and fc["medErrPct"] > 0
