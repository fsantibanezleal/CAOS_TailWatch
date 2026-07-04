# Frameworks & methods

The research made binding: every engine TailWatch depends on is pinned (`requirements-precompute.txt` /
`frontend/package.json`) and documented here. Engine cards cover what/why/install/use; method cards cover the
algorithm + its provenance.

## Engines

| Card | Pin | Lane |
|---|---|---|
| [PyTorch](01_pytorch/pytorch.md) | `torch==2.12.1` (CPU) | offline (train) |
| [ONNX / onnxruntime / onnxruntime-web](02_onnx-onnxruntime/onnx.md) | `onnx==1.22.0`, `onnxruntime==1.27.0`, `onnxruntime-web^1.27.0` | offline export + live inference |
| [SciPy + h5py + NumPy](03_scipy-h5py-numpy/scipy.md) | `scipy==1.18.0`, `h5py>=3.10`, `numpy==2.4.6` | offline (forward sim, SBAS, anomaly dilation) |

## Methods

| Card | Provenance |
|---|---|
| [Denoising conv-AE (spatial anomaly)](04_conv-ae/conv-ae.md) | Vincent et al. 2008 (denoising AE); Gong 2019 (MemAE); Bouman & Heskes 2025 |
| [1-D CNN (per-pixel classifier)](05_cnn/cnn.md) | Zhang et al. 2017 (1-D CNN); Anantrasirichai 2018/2020 |
| [2-geometry SBAS + inverse-velocity](06_sbas-inverse-velocity/sbas.md) | Berardino 2002 (SBAS); Fukuzono inverse-velocity; Carlà 2017/2019; McInnes 2018 (UMAP) |

All DOI-verified references are in `frontend/src/data/citations.ts` and surfaced in the Methodology page.
