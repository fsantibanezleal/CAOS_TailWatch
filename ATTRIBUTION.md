# Attribution, methods & data

## Methods (DOI-verified, see `frontend/src/data/citations.ts`)

| Method | Reference |
|---|---|
| SBAS displacement | Berardino et al. 2002 (IEEE TGRS 40(11):2375) |
| Deep learning of ground deformation | Anantrasirichai et al. 2018/2020 (RSE; IEEE GRSL) |
| Denoising autoencoder | Vincent et al. 2008; Gong et al. 2019 (MemAE); Bouman & Heskes 2025 |
| 1-D CNN on time-series | Zhang et al. 2017 (Sensors 17(2):425) |
| Inverse-velocity failure forecasting | Fukuzono; Carlà et al. 2017/2019 |
| UMAP (latent scatter) | McInnes et al. 2018 |
| Tailings-dam case studies | Grebby et al. 2021 (Brumadinho ISBAS); Carlà et al. 2019 (Cadia) |

## Data / honesty

**Synthetic lane.** The 5 scenario cases are a high-fidelity **synthetic Sentinel-1 forward simulation**
(von-Kármán APS + decorrelation + DEM-error + orbital ramps); the SBAS decomposition and the inverse-velocity physics
are exact, but the scenes are simulated and clearly labelled. The held-out split is by scene (17-20). Real tailings-dam
failures (Brumadinho 2019, only a retrospective ISBAS precursor; Cadia 2018, a clear forecastable precursor) are
documented as cautionary/forecastable analogs, NOT re-hosted data.

**Real lane (Synthetic | Real sample selector).** The App also serves ONE real Sentinel-1 InSAR sample:
COMET LiCSAR frame `124D_04854_171313` (descending), processed with LiCSBAS over the **Campi Flegrei caldera
(Pozzuoli, Italy)**, clipped to a 64x64 px AOI over the uplift, 40 epochs (2016-2018). The **velocity, coherence,
cumulative displacement series, cumulative-vs-time and the classical inverse-velocity 1/v** are computed directly on
the real displacement; `velUp` uses the real per-pixel LOS up-vector under a single-geometry vertical-only assumption
(East/Ascending are unavailable from a descending-only frame). The **AE anomaly, CNN class and AE latent** are the
synthetic-trained ONNX applied cross-domain (model output, not verified ground truth), and the failure/collapse-time
forecast stays illustrative. Every real tab is badged accordingly in-app.

Required attribution (surfaced in the App provenance panel):
> LiCSAR contains modified Copernicus Sentinel data 2016-2021 analysed by the Centre for the Observation and
> Modelling of Earthquakes, Volcanoes and Tectonics (COMET); time series by LiCSBAS.

License: modified Copernicus Sentinel data under the Copernicus free and open license (redistribution + modification
permitted with attribution). Citations: Lazecky et al. 2020, Remote Sens. 12(15):2430, DOI 10.3390/rs12152430
(LiCSAR); Morishita et al. 2020, Remote Sens. 12(3):424, DOI 10.3390/rs12030424 (LiCSBAS).

TailWatch is didactic + decision-support, NOT a certified safety/alarm system. No fabricated benchmark numbers.
