"""Pipeline smoke + determinism: a case regenerates deterministically (same seed -> identical trace), run_all writes
the flat index covering every category."""
import json

from twlab import pipeline, registry


def test_case_deterministic_same_seed():
    a = pipeline.precompute("seasonal", seed=7)
    b = pipeline.precompute("seasonal", seed=7)
    assert a["artifact"]["bytes"] == b["artifact"]["bytes"]
    trace = json.loads((pipeline.DERIVED / a["artifact"]["path"]).read_text(encoding="utf-8"))
    assert trace["regime"] == "seasonal"


def test_run_all_writes_index():
    entries = pipeline.run_all(seed=42)
    # 5 synthetic regime cases + 1 real Sentinel-1 case (the Synthetic | Real Source lane)
    assert len(entries) == len(registry.list_cases()) == 6
    idx = json.loads((pipeline.MANIFESTS / "index.json").read_text(encoding="utf-8"))
    assert idx["n_cases"] == len(entries)
    assert idx["schema"].startswith("tailwatch.index/")
    cats = {e["category"] for e in idx["cases"]}
    assert cats == set(registry.list_categories())


def test_real_case_trace_carries_provenance_and_grid():
    """The real Sentinel-1 case is labelled real, carries its own (smaller) grid + real dates + provenance."""
    m = pipeline.precompute("real-cf", seed=7)
    assert m["real_or_synthetic"] == "real"
    assert "LiCSAR" in m["honesty"] and "cross-domain" in m["honesty"]
    trace = json.loads((pipeline.DERIVED / m["artifact"]["path"]).read_text(encoding="utf-8"))
    assert trace["source"] == "real"
    assert trace["cube"] == "tw-real-cf.bin"
    assert trace["grid"]["W"] == 64 and trace["grid"]["H"] == 64 and trace["grid"]["nEp"] == 40
    assert trace["provenance"]["frameId"] == "124D_04854_171313"
