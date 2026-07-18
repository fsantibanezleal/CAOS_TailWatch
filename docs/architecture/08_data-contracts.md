# 08, The two data contracts

The full schemas live in [`../../data/README.md`](../../data/README.md); this is the architecture-level summary.

## Contract 1, ingestion (raw InSAR scene → pipeline)

`data-pipeline/twlab/io/contract.py`. The *bring-your-own-scene* gate. `validate_records` accepts a scene descriptor
iff it satisfies the schema (`W,H ∈ [32,4096]`, `n_ep ∈ [3,500]`, `regime ∈ {stable, linear, accelerating, seasonal,
step, decorrelated}`), **rejects** with a reason otherwise (bad regime, undersized grid, too-few acquisitions,
non-numeric), and **flags** suspicious scenes (decorrelated regime; implausible severity). A committed
`data/examples/scenes.csv` passes Contract 1 (a clone-time test asserts it).

## Contract 2, artifact (pipeline → web)

`data-pipeline/twlab/core/{trace.py, manifest.py}`. Each case writes a compact `data/derived/<case>/trace.json`
(`tailwatch.trace/v1`) + a manifest `data/derived/manifests/<case>.json` (`tailwatch.manifest/v2`) recording the
category/regime, seed, engine+version, the shared ONNX + cube, the trace byte size, the lane/gate verdict, the
Contract-1 flags, and the case metrics; a flat `index.json` inventories all cases.
`frontend/src/lib/contract.types.ts` mirrors these so a drift fails `tsc`; `scripts/check_artifacts.py` (CI) enforces
that every manifest points to a real trace of the recorded byte size with a consistent lane verdict.
