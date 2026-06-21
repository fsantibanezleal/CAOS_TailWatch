"""The named pipeline stages — FROZEN names/signatures, REWORK bodies. Order: preprocess -> feature_extraction ->
train -> infer -> evaluate -> export. Each stage is deterministic, typed, seeded, and independently testable."""
