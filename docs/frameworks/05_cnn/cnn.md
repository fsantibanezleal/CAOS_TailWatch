# Method — 1-D CNN per-pixel deformation classifier

**Provenance:** Zhang et al. 2017 (1-D CNN on raw time-series);
Anantrasirichai et al. 2018/2020 (deep learning of volcanic/ground deformation, RSE).

**What:** a 1-D convolutional network on a per-pixel **displacement time-series** → one of 6 deformation classes
(stable / linear / accelerating / seasonal / step / decorrelated). Per-pixel classification turns a velocity map
into a TYPED deformation map.

## Architecture (`science/train_models.py::CNN1D`)

```
Conv1d(1→16,7,p3) → ReLU → MaxPool(2)
Conv1d(16→32,5,p2) → ReLU → MaxPool(2)
Conv1d(32→64,3,p1) → ReLU
global-mean over time → Linear(64→6)
```
Input: a per-pixel z-normalized displacement series (length n_ep).

## Training & honest evaluation

Adam (lr 1e-3), cross-entropy, 30 epochs, seeded. Trained on per-class pixel samples from scenes 1-16; evaluated on
held-out scenes 17-20 (by-scene split → no spatial leakage). Reported: held-out **macro-F1** + the confusion matrix.

## Why it fits

Velocity (a scalar rate) cannot tell a one-off step from steady creep from acceleration — but the failure-relevant
distinction (forecastable acceleration vs reversible seasonal vs benign step) IS the type, which the CNN reads from
the temporal shape. The global-mean head keeps it length-agnostic. CAM-style temporal saliency (Selvaraju et al.
2017), which would make the class evidence auditable, is roadmap: nothing in the repo computes it yet.
