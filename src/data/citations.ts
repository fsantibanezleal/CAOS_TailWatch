import { type Citation } from '@fasl-work/caos-app-shell';

// DOI-verified references (from the deep-research + adversarial-validation pass). Corrected DOIs only.
export const CITATIONS: Citation[] = [
  { id: 'hanssen2001', label: 'Hanssen 2001', citation: 'Hanssen, R.F. (2001). Radar Interferometry: Data Interpretation and Error Analysis. Kluwer.', doi: '10.1007/0-306-47633-9' },
  { id: 'berardino2002', label: 'Berardino et al. 2002', citation: 'Berardino, P., Fornaro, G., Lanari, R., Sansosti, E. (2002). A new algorithm for surface deformation monitoring based on small baseline differential SAR interferograms (SBAS). IEEE TGRS 40(11), 2375–2383.', doi: '10.1109/TGRS.2002.803792' },
  { id: 'ferretti2001', label: 'Ferretti et al. 2001', citation: 'Ferretti, A., Prati, C., Rocca, F. (2001). Permanent scatterers in SAR interferometry. IEEE TGRS 39(1), 8–20.', doi: '10.1109/36.898661' },
  { id: 'morishita2020', label: 'Morishita et al. 2020', citation: 'Morishita, Y. et al. (2020). LiCSBAS: An open-source InSAR time-series analysis package integrated with the LiCSAR automated Sentinel-1 InSAR processor. Remote Sensing 12(3), 424.', doi: '10.3390/rs12030424' },
  { id: 'yu2018gacos', label: 'Yu et al. 2018', citation: 'Yu, C., Li, Z., Penna, N.T., Crippa, P. (2018). Generic atmospheric correction model for InSAR observations (GACOS). JGR Solid Earth 123, 9202–9222.', doi: '10.1029/2017JB015305' },
  { id: 'chen2001snaphu', label: 'Chen & Zebker 2001', citation: 'Chen, C.W., Zebker, H.A. (2001). Two-dimensional phase unwrapping with use of statistical models for cost functions (SNAPHU). JOSA A 18(2), 338–351.', doi: '10.1364/JOSAA.18.000338' },
  { id: 'wright2004', label: 'Wright et al. 2004', citation: 'Wright, T.J., Parsons, B.E., Lu, Z. (2004). Toward mapping surface deformation in three dimensions using InSAR. GRL 31, L01607.', doi: '10.1029/2003GL018827' },
  { id: 'fukuzono1985', label: 'Fukuzono 1985', citation: 'Fukuzono, T. (1985). A new method for predicting the failure time of a slope (inverse velocity). J. Japan Landslide Soc. 22(2), 8–13.', doi: '10.3313/jls1964.22.2_8' },
  { id: 'voight1988', label: 'Voight 1988', citation: 'Voight, B. (1988). A method for prediction of volcanic eruptions. Nature 332, 125–130.', doi: '10.1038/332125a0' },
  { id: 'rosehungr2007', label: 'Rose & Hungr 2007', citation: 'Rose, N.D., Hungr, O. (2007). Forecasting potential rock slope failure in open pit mines using the inverse-velocity method. Int. J. Rock Mech. Min. Sci. 44(2), 308–320.', doi: '10.1016/j.ijrmms.2006.07.014' },
  { id: 'carla2017', label: 'Carlà et al. 2017', citation: 'Carlà, T., Intrieri, E., Di Traglia, F., Nolesini, T., Gigli, G., Casagli, N. (2017). Guidelines on the use of inverse velocity method as a tool for setting alarm thresholds and forecasting landslides. Landslides 14, 517–534.', doi: '10.1007/s10346-016-0731-5' },
  { id: 'cruden1987', label: 'Cruden & Masoumzadeh 1987', citation: 'Cruden, D.M., Masoumzadeh, S. (1987). Accelerating creep of the slopes of a coal mine. Rock Mech. Rock Eng. 20(2), 123–135.', doi: '10.1007/BF01410043' },
  { id: 'grebby2021', label: 'Grebby et al. 2021', citation: 'Grebby, S., Sowter, A., Gluyas, J., Toll, D., Gee, D., Athab, A., Girindran, R. (2021). Advanced analysis of satellite data reveals ground deformation precursors to the Brumadinho Tailings Dam collapse. Communications Earth & Environment 2, 2.', doi: '10.1038/s43247-020-00079-2' },
  { id: 'carla2019', label: 'Carlà et al. 2019', citation: 'Carlà, T. et al. (2019). Perspectives on the prediction of catastrophic slope failures from satellite InSAR (Cadia). Scientific Reports 9, 14137.', doi: '10.1038/s41598-019-50792-y' },
  { id: 'crameri2018', label: 'Crameri 2018', citation: 'Crameri, F. (2018). Scientific colour maps. Zenodo.', doi: '10.5281/zenodo.1243862' },
  { id: 'okada1985', label: 'Okada 1985', citation: 'Okada, Y. (1985). Surface deformation due to shear and tensile faults in a half-space. BSSA 75(4), 1135–1154.', doi: '10.1785/BSSA0750041135' },
];
