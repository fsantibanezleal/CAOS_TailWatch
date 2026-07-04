"""Regenerate ONLY the `forecast` block of tw-cases.json (accelerating MC + false-alarm control
bank) without the torch lane. Pure numpy — reuses forecast_benchmark() so the numbers are the
single source of truth. Use when the models do not need retraining but the forecast protocol did
(issue #24).

    python -m twlab.science.rebuild_forecast
"""
from __future__ import annotations

import json
import os

from .forecast import OUT, forecast_benchmark


def main() -> None:
    path = os.path.join(OUT, "tw-cases.json")
    with open(path, encoding="utf-8") as f:
        manifest = json.load(f)
    days_list = manifest["days"]
    manifest["forecast"] = forecast_benchmark(days_list)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(manifest, f)
    fc = manifest["forecast"]
    print(f"rebuilt forecast: detect {fc['detectRate']} | medErr {fc['medErrPct']}% "
          f"| falseAlarm {fc['falseAlarmRate']} ({fc['nControl']} controls) "
          f"| regimes {fc['controlRegimes']}")
    print(f"  updated {path}")


if __name__ == "__main__":
    main()
