# SciPy + h5py + NumPy

**What:** the offline forward-sim + SBAS + I/O stack.
**Why binding:** three uses, each load-bearing:

* **NumPy** (`numpy==2.4.6`) — the array/FFT workhorse: the von-Kármán APS via `numpy.fft.fft2/ifft2`, the SBAS
  least-squares decomposition, the metrics. It is also the ONLY dependency of the default (light) pipeline.
* **SciPy** (`scipy==1.18.0`) — `scipy.ndimage.grey_dilation` fills the AE anomaly map's unscored border pixels by a
  simple dilation (the per-pixel patch scoring leaves a border).
* **h5py** (`h5py>=3.10`) — reads/writes the synthetic Sentinel-1 scenes (`.h5`, 168 MB, git-ignored in `data/raw`).

**Lane:** offline only (`twlab/science/{forward,sbas,train_models}.py`). Not shipped to the browser.

## Install

`pip install scipy==1.18.0 h5py numpy==2.4.6` (via `requirements-precompute.txt` / `setup.sh --precompute`). The
light lane needs only `numpy==2.4.6` (`requirements.txt`), which is what lets a clone rebuild the replay layer + pass
the tests without torch/h5py or the scenes.

## Applying to other data

The forward sim is parameterized (W/H/n_ep/regime/severity); regenerate or extend the scene set and re-run `--retrain`.
