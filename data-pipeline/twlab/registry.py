"""The case registry, cases grouped by CATEGORY (the deformation-regime taxonomy). The App shows ONE selected
case; Experiments/Benchmark show cross-case summaries by category (failure regimes vs control/normal)."""
from __future__ import annotations

from .cases.insar_cases import CASES, Case

_BY_ID: dict[str, Case] = {c.id: c for c in CASES}


def list_cases() -> list[Case]:
    return list(CASES)


def get_case(case_id: str) -> Case:
    if case_id not in _BY_ID:
        raise KeyError(f"unknown case: {case_id!r}. known: {sorted(_BY_ID)}")
    return _BY_ID[case_id]


def list_categories() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for c in CASES:
        out.setdefault(c.category, []).append(c.id)
    return out
