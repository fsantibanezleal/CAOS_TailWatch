import { Callout, ReferenceList, useShellLang } from '@fasl-work/caos-app-shell';

const LIMITS = [
  ['LOS-only', 'InSAR sees one component of a 3-D vector; near-polar Sentinel-1 is nearly blind to N–S motion. asc+desc decomposition recovers vertical + E–W only.'],
  ['Fringe-rate ceiling = λ/2 ≈ 2.8 cm/fringe', 'Motion faster than ~2.8 cm of LOS between two acquisitions aliases and is under-measured — exactly when a failure accelerates.'],
  ['Decorrelation hides the most active surface', 'Wet/active tailings beaches lose coherence; coherence-masking removes the pixels most likely to be moving. PSI/DS help, not solve.'],
  ['APS self-deception', 'Stratified tropospheric delay over the dam relief mimics deformation (the #1 false-positive). Uncorrected velocity is never shown as truth.'],
  ['Unwrapping errors', 'Fake integer-cycle jumps at the steep toe — caught by loop-closure residue checks, not always perfectly.'],
  ['Surveillance, not a trip system', '6–12-day revisit; slow precursor creep is detectable, the final collapse instant is not InSAR-timed.'],
  ['DL methods are single-site / leakage-prone', 'Labelled experimental; split by site AND time; must beat the transparent inverse-velocity / CUSUM baselines.'],
  ['Coverage geography & epoch', 'EGMS is Europe-only, OPERA DISP-S1 is N.-America-only; Sentinel-1 starts 2014 → pre-2014 failures have no stack. Not faked.'],
  ['Synthetic ≠ real', 'Every synthetic case is badged SYNTHETIC, emits the real format, runs the real pipeline, and reports recovery vs injected truth.'],
  ['Not a certified alarm', 'TailWatch is didactic + decision-support; GISTM-grade surveillance requires the EoR’s validated, in-situ-corroborated workflow.'],
];

export default function About() {
  const es = useShellLang() === 'es';
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Acerca de TailWatch' : 'About TailWatch'}</h1>
        <p className="lede">{es ? 'Qué es, qué no es, sus límites honestos, y las fuentes.' : 'What it is, what it is not, its honest limits, and the sources.'}</p>
      </div>
      <section>
        <p>{es
          ? 'TailWatch carga series temporales InSAR (Sentinel-1) abiertas sobre presas de relaves y taludes de mina y corre desplazamiento SBAS estilo LiCSBAS para revelar deformación milimétrica, proyectar tiempos de falla por velocidad inversa y emitir alarmas TARP alineadas con GISTM. El procesamiento pesado es un pipeline offline real cuyos productos se commitean como artefactos; el shell web es una SPA estática que los reproduce (replay determinista) y corre el tier liviano en vivo.'
          : 'TailWatch loads open Sentinel-1 InSAR time-series over mine tailings dams and pit walls and runs LiCSBAS-style SBAS displacement to surface millimetric deformation, project failure times by inverse velocity, and raise GISTM-aligned TARP alarms. The heavy processing is a real offline pipeline whose products are committed as artifacts; the web shell is a static SPA that replays them (deterministic replay) and runs the light tier live.'}</p>
        <Callout variant="honest" title={es ? 'Qué NO es' : 'What it is NOT'}>
          {es
            ? 'No es un sistema de alarma certificado de seguridad crítica. Es un artefacto DIDÁCTICO + de SOPORTE DE DECISIÓN. La vigilancia de relaves de grado GISTM requiere el flujo validado y corroborado en sitio del Ingeniero de Registro (EoR). Los datos de demostración por defecto son sintéticos (etiquetados); los casos reales se consumen como productos pre-hechos, nunca enfocamos SAR.'
            : 'It is not a certified, safety-critical alarm system. It is a DIDACTIC + DECISION-SUPPORT artifact. GISTM-grade tailings surveillance requires the Engineer of Record’s (EoR) validated, in-situ-corroborated workflow. The default demonstration data are synthetic (labelled); real cases are consumed as pre-made products, and we never focus SAR.'}
        </Callout>
        <h2>{es ? 'Límites honestos' : 'Honest limits'}</h2>
        <ol>
          {LIMITS.map(([h, b], i) => <li key={i}><b>{h}.</b> {b}</li>)}
        </ol>
        <h2>{es ? 'Datos y licencias' : 'Data & licenses'}</h2>
        <p>{es
          ? 'Fuentes abiertas: COMET-LiCSAR (Sentinel-1/Copernicus), EGMS (Copernicus, solo Europa), OPERA DISP-S1 (NASA, solo Norteamérica), Copernicus DEM, GACOS, NASA Global Landslide Catalog, Global Tailings Portal, Nevada Geodetic Lab GNSS, GPM IMERG / CHIRPS. Regla de redistribución: solo se incluyen en el repo recortes pequeños de ROI de productos con licencia abierta + todos los cubos sintéticos (son nuestros); el archivo SLC y los volcados masivos son solo-enlace. Cada recorte lleva su licencia y URL de fuente.'
          : 'Open sources: COMET-LiCSAR (Sentinel-1/Copernicus), EGMS (Copernicus, Europe-only), OPERA DISP-S1 (NASA, N.-America-only), Copernicus DEM, GACOS, NASA Global Landslide Catalog, Global Tailings Portal, Nevada Geodetic Lab GNSS, GPM IMERG / CHIRPS. Redistribution rule: only small ROI clips of openly-licensed products + all synthetic cubes (they are ours) are bundled in-repo; the SLC archive and bulk dumps are link-only. Every clip carries its license and source URL.'}</p>
        <h2>{es ? 'Referencias' : 'References'}</h2>
        <ReferenceList />
      </section>
    </div>
  );
}
