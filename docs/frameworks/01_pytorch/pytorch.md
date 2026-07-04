# PyTorch (`torch==2.12.1`, CPU)

**What:** trains the 1-D CNN classifier + the denoising conv-AE and exports them to ONNX.
**Why binding:** the learned tier (per-pixel deformation TYPE + a label-free spatial anomaly) is the SOTA core the
classical velocity baseline is measured against. Training is modest (a small CNN + conv-AE over patches from 16
synthetic scenes, minutes on CPU), no GPU.

**Lane:** offline only (`twlab/science/train_models.py`, named by `stages/{train,infer,evaluate,export}`). Never
shipped to the browser.

## Install

```
pip install torch==2.12.1 --index-url https://download.pytorch.org/whl/cpu
```
(or `./scripts/setup.sh --precompute`). Also needs scipy + h5py + the 168 MB scenes in `data/raw/scenes/`.

## Usage

```
./scripts/precompute.sh all --retrain   # forward sim -> SBAS -> train conv-AE+CNN -> export ONNX + cubes + tw-cases.json
```

`train_cnn` / `train_ae` seed `torch.manual_seed(0)`; `export` calls `torch.onnx.export(..., opset_version=17,
dynamo=False, dynamic_axes={0:'n'})`.

## Applying to other data

Re-run `--retrain` after regenerating or extending the scene set (more regimes / severities). The CNN input is a
per-pixel displacement series; the AE input is a 16×16 velocity patch, nothing is plant-specific.
