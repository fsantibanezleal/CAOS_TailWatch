"""CONTRACT 2 (artifact) tests: a manifest points to a real trace with the recorded byte size, the lane verdict is
consistent with the gate, and the schema is the TailWatch one. Uses the committed tw-cases.json (no torch)."""
from twlab import pipeline


def test_manifest_matches_artifact_and_gate():
    m = pipeline.precompute("accel", seed=7)
    artifact = pipeline.DERIVED / m["artifact"]["path"]
    assert artifact.exists(), "manifest points to a non-existent trace"
    assert artifact.stat().st_size == m["artifact"]["bytes"], "manifest byte size drifted from the trace"
    assert m["schema"].startswith("tailwatch.manifest/")
    assert m["lane"] == m["gate"]["lane"]
    # the conv-AE/CNN forward passes are client-side + tiny => must be classified LIVE
    assert m["lane"] == "live", f"expected live lane, got {m['lane']} ({m['gate']['reasons']})"
    assert m["regime"] == "accelerating"


def test_control_case_trace():
    import json

    m = pipeline.precompute("stable", seed=7)
    trace = json.loads((pipeline.DERIVED / m["artifact"]["path"]).read_text(encoding="utf-8"))
    assert trace["regime"] == "stable"
    assert trace["cube"] == "tw-stable.bin"   # references the shared cube, does not copy it
    assert trace["real_or_synthetic"] == "synthetic"
