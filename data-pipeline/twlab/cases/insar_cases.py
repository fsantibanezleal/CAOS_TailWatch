"""TailWatch cases spanning CATEGORIES (the deformation-regime taxonomy a tailings-dam monitor must distinguish).
The App shows ONE selected case; Experiments/Benchmark show cross-case summaries by category. The 5 cases mirror the
committed cubes (tw-<id>.bin) and the SPA's tw-cases.json. All scenes are SYNTHETIC Sentinel-1 simulations (clearly
labelled); the validation anchors point at the real documented failures the regime emulates."""
from __future__ import annotations

from dataclasses import dataclass

FAILURE = "failure deformation (forecastable / must detect)"
CONTROL = "control / normal (must NOT false-alarm)"


@dataclass(frozen=True)
class Case:
    id: str                       # matches the cube file tw-<id>.bin
    category: str
    regime: str                   # one of the 6 CNN classes
    expected_band: str
    validation_anchor: str
    real_or_synthetic: str = "synthetic"


CASES: list[Case] = [
    Case("accel", FAILURE, "accelerating",
         "tertiary creep: inverse-velocity 1/v -> finite failure time; AE flags the crest anomaly, CNN labels accelerating",
         "Cadia 2018 (a clear forecastable precursor, Carlà 2019)"),
    Case("linear", FAILURE, "linear",
         "steady creep: constant velocity, t_f undefined (no acceleration), detected but not forecastable",
         "open-pit slope steady creep (Rose & Hungr 2007)"),
    Case("step", FAILURE, "step",
         "one-off settling after a trigger (e.g. rain), a step the CNN labels step, no sustained acceleration",
         "post-rain settling step"),
    Case("stable", CONTROL, "stable",
         "bedrock control: no net deformation -> GREEN, inconclusive forecast; the monitor must NOT false-alarm",
         "stable bedrock (negative control)"),
    Case("seasonal", CONTROL, "seasonal",
         "reversible annual breathing (beach/thermal) -> oscillating series, no net failure; CNN labels seasonal",
         "reversible seasonal beach cycle"),
]
