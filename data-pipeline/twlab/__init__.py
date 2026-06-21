"""twlab — the offline+live engine for TailWatch (instantiated from the CAOS product-repo archetype, ADR-0057).

The CORE is real and SOTA-pinned: a high-fidelity synthetic Sentinel-1 InSAR forward simulation (von-Kármán APS,
decorrelation, DEM-error, orbital ramps) + a 2-geometry SBAS displacement decomposition feed a 2-D convolutional
denoising AUTOENCODER (unsupervised spatial anomaly) and a 1-D CNN (6-class per-pixel deformation classifier), both
trained OFFLINE and exported to ONNX for live in-browser inference; plus the classical velocity / inverse-velocity
(Fukuzono) failure-time baseline they are measured against. The base around it (the two data contracts, the staged
pipeline, the lane gate, the manifest/trace, the cases-by-category registry) is the FROZEN archetype — instantiated
here, not redesigned.
"""

__version__ = "0.09.000"  # display X.XX.XXX; PEP 440 form in pyproject.toml (0.9.0)
