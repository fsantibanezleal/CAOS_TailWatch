"""CONTRACT 1 (ingestion) tests: good InSAR scene descriptors validate; ill-formed scenes are rejected with a
reason; decorrelated / extreme-severity scenes are flagged; the committed example passes."""
from twlab.io.contract import validate_records


def test_good_scene_accepted():
    rep = validate_records([
        {"scene_id": "s17", "W": 160, "H": 120, "n_ep": 60, "regime": "accelerating", "dam_sev": 1.5},
    ])
    assert rep.ok and len(rep.accepted) == 1 and not rep.rejected
    assert rep.accepted[0].regime == "accelerating"


def test_bad_scenes_rejected_not_coerced():
    rows = [
        {"scene_id": "r", "W": 160, "H": 120, "n_ep": 60, "regime": "landslide"},   # bad regime
        {"scene_id": "w", "W": 8, "H": 120, "n_ep": 60, "regime": "stable"},          # W too small
        {"scene_id": "n", "W": 160, "H": 120, "n_ep": 2, "regime": "stable"},          # too few acquisitions
        {"scene_id": "x", "W": "wide", "H": 120, "n_ep": 60, "regime": "stable"},      # non-numeric
        {"scene_id": "m", "W": 160, "H": 120, "regime": "stable"},                     # missing n_ep
    ]
    rep = validate_records(rows)
    assert len(rep.accepted) == 0
    assert len(rep.rejected) == len(rows)
    assert all("reason" in r for r in rep.rejected)


def test_flagged_but_accepted():
    rep = validate_records([
        {"scene_id": "d", "W": 160, "H": 120, "n_ep": 60, "regime": "decorrelated", "dam_sev": 5.0},
    ])
    assert rep.ok and rep.flagged
    flags = " ".join(rep.flagged[0]["flags"])
    assert "decorrelated" in flags and "implausibly large" in flags


def test_committed_example_passes_contract():
    from pathlib import Path

    from twlab.io.formats import read_csv_rows

    csv = Path(__file__).resolve().parents[1] / "data" / "examples" / "scenes.csv"
    rep = validate_records(read_csv_rows(csv))
    assert rep.ok and not rep.rejected, f"example scenes.csv should pass Contract 1: {rep.summary()}"
