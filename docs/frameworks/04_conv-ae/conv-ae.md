# Method, denoising convolutional autoencoder (spatial anomaly)

**Provenance:** Vincent et al. 2008 (denoising autoencoders); Gong et al. 2019 (memory-augmented AE for anomaly);
Bouman & Heskes 2025 (why a bottleneck alone is insufficient, a plain AE reconstructs anomalies too).

**What:** a 2-D conv-AE trained ONLY on **NORMAL** velocity patches (stable / seasonal / decorrelated zones); its
per-pixel reconstruction error is an unsupervised spatial **anomaly score** that flags deformation the velocity map
alone misses. Unsupervised + label-free: it generalizes to deformation patterns never labelled in training.

## Architecture (`science/train_models.py::ConvAE`)

```
encoder: Conv2d(1→16,3,2,1) → ReLU → Conv2d(16→32,3,2,1) → ReLU → Flatten → Linear(512→16)
decoder: Linear(16→512) → ReLU → Unflatten → ConvTranspose2d(32→16) → ReLU → ConvTranspose2d(16→1)
```
Input: a 16×16 velocity patch, normalized by `VEL_SCALE = 60 mm/yr` (the browser replicates this).

## Training (the denoising objective)

Adam (lr 1e-3), MSE, 24 epochs, seeded. **Denoising:** corrupt the input (`+0.10·randn`) and reconstruct the CLEAN
patch. With a tight 16-D bottleneck + NORMAL-only training this resists the identity shortcut, so anomalous patches
reconstruct poorly → high anomaly. The unscored border is filled by a SciPy grey-dilation. Scored by ROC-AUC over the
held-out failure-vs-normal pixels.

## Why it fits

A label-free anomaly detector complements the supervised CNN (which needs the 6 labels): it flags "something is off"
in a pattern the classifier may not have a class for, and gives the spatial extent the velocity map blurs.
