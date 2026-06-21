# Attribution — methods & data

## Methods (DOI-verified — see `frontend/src/data/citations.ts`)

| Method | Reference |
|---|---|
| SBAS displacement | Berardino et al. 2002 (IEEE TGRS 40(11):2375) |
| Deep learning of ground deformation | Anantrasirichai et al. 2018/2020 (RSE; IEEE GRSL) |
| Denoising autoencoder | Vincent et al. 2008; Gong et al. 2019 (MemAE); Bouman & Heskes 2025 |
| 1-D CNN on time-series | Zhang et al. 2017 (Sensors 17(2):425) |
| Grad-CAM saliency | Selvaraju et al. 2017 |
| Inverse-velocity failure forecasting | Fukuzono; Carlà et al. 2017/2019 |
| UMAP (latent scatter) | McInnes et al. 2018 |
| Tailings-dam case studies | Grebby et al. 2021 (Brumadinho ISBAS); Carlà et al. 2019 (Cadia) |

## Data / honesty

TailWatch uses **no real SAR data**. The scenes are a high-fidelity **synthetic Sentinel-1 forward simulation**
(von-Kármán APS + decorrelation + DEM-error + orbital ramps); the SBAS decomposition and the inverse-velocity physics
are exact, but the scenes are simulated and clearly labelled. The held-out split is by scene (17-20). Real tailings-dam
failures (Brumadinho 2019 — only a retrospective ISBAS precursor; Cadia 2018 — a clear forecastable precursor) are
documented as cautionary/forecastable analogs, NOT re-hosted data. TailWatch is didactic + decision-support, NOT a
certified safety/alarm system. No fabricated benchmark numbers.
