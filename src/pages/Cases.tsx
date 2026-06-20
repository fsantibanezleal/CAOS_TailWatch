import { useShellLang } from '@fasl-work/caos-app-shell';

const CASES: { n: number; case: string; asset: string; regime: string; geom: string; src: string; label: string }[] = [
  { n: 1, case: 'Brumadinho B1', asset: 'upstream TSF dam + beach', regime: 'pre-failure creep (nonlinear)', geom: '2 descending tracks (53 & 155), ISBAS 20 m', src: 'REAL (LiCSAR)', label: 'failure (2019)' },
  { n: 2, case: 'Chilean porphyry pit highwall', asset: 'open-pit highwall', regime: 'steady creep', geom: 'asc', src: 'REAL frame + synth overlay', label: 'mixed' },
  { n: 3, case: 'Stable bedrock / urban control', asset: 'reflector area', regime: '~0 mm/yr', geom: 'asc', src: 'REAL (EGMS) or synth', label: 'non-failure (control)' },
  { n: 4, case: 'Accelerating-creep dam → collapse', asset: 'downstream slope', regime: 'accelerating to known t_f', geom: 'desc', src: 'SYNTHETIC', label: 'failure (known t_f)' },
  { n: 5, case: 'Seasonal-beach breathing', asset: 'tailings beach', regime: 'reversible annual sinusoid', geom: 'asc', src: 'SYNTHETIC', label: 'non-failure' },
  { n: 6, case: 'Low-coherence wet beach', asset: 'active beach', regime: 'distributed creep, decorrelated', geom: 'desc', src: 'SYNTHETIC', label: 'mixed' },
  { n: 7, case: 'Distributed-subsidence waste dump', asset: 'waste dump', regime: 'broad slow subsidence', geom: 'asc', src: 'SYNTHETIC', label: 'non-failure' },
  { n: 8, case: 'Step-after-rain', asset: 'downstream slope', regime: 'post-rainfall step', geom: 'desc', src: 'SYNTHETIC (+CHIRPS)', label: 'mixed' },
  { n: 9, case: 'DEM-error-dominated decoy', asset: 'steep dam wall', regime: 'Bperp-correlated DEM error', geom: 'asc', src: 'SYNTHETIC', label: 'non-failure (artifact)' },
  { n: 10, case: 'Stratified-APS decoy (GACOS on/off)', asset: 'dam over relief', regime: 'uncorrected stratified APS', geom: 'asc', src: 'SYNTHETIC', label: 'non-failure (artifact)' },
  { n: 11, case: 'Centreline TSF, asc vs desc', asset: 'centreline dam', regime: 'true vertical + E–W via 2 tracks', geom: 'asc + desc', src: 'SYNTHETIC', label: 'mixed' },
  { n: 12, case: 'Cadia-style northern-TSF slump (analog)', asset: 'TSF dam slump', regime: 'subsidence then localized failure', geom: 'desc', src: 'SYNTHETIC analog', label: 'failure (analog)' },
];

export default function Cases() {
  const es = useShellLang() === 'es';
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Casos' : 'Cases'}</h1>
        <p className="lede">{es ? 'Una docena de casos que cubren activo × régimen de deformación × coherencia × geometría (asc/desc) × real|sintético × falla|no-falla. Cada caso sintético emite el formato LiCSBAS real y se valida contra su verdad inyectada.' : 'A dozen cases spanning asset × deformation regime × coherence × geometry (asc/desc) × real|synthetic × failure|non-failure. Each synthetic case emits the real LiCSBAS format and is validated against its injected ground truth.'}</p>
      </div>
      <section>
        <table className="cmp-table">
          <thead><tr><th>#</th><th style={{ textAlign: 'left' }}>{es ? 'Caso' : 'Case'}</th><th style={{ textAlign: 'left' }}>{es ? 'Activo' : 'Asset'}</th><th style={{ textAlign: 'left' }}>{es ? 'Régimen' : 'Regime'}</th><th>{es ? 'Geometría' : 'Geometry'}</th><th>{es ? 'Fuente' : 'Source'}</th><th>{es ? 'Etiqueta' : 'Label'}</th></tr></thead>
          <tbody>
            {CASES.map((c) => (
              <tr key={c.n}><td className="mono">{c.n}</td><td style={{ textAlign: 'left' }}><b>{c.case}</b></td><td style={{ textAlign: 'left' }}>{c.asset}</td><td style={{ textAlign: 'left' }}>{c.regime}</td><td>{c.geom}</td><td>{c.src}</td><td>{c.label}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">{es
          ? 'Honestidad de cobertura: Sentinel-1 inicia en 2014, así que Fundão/Samarco (2015) tiene poca cobertura S1 y Mount Polley (2014) es pre/temprano-S1 — documentado en límites, nunca falsificado en las pilas. Cada caso sintético lleva el badge SYNTHETIC + semilla; los casos reales se consumen como productos pre-hechos (LiCSAR/EGMS), nunca enfocamos SAR.'
          : 'Coverage honesty: Sentinel-1 starts in 2014, so Fundão/Samarco (2015) has thin S1 and Mount Polley (2014) is pre/early-S1 — documented in the limits, never faked into the stacks. Every synthetic case carries the SYNTHETIC badge + seed; real cases are consumed as pre-made products (LiCSAR/EGMS), and we never focus SAR.'}</p>
        <p className="muted small">{es ? 'El caso #4 (presa acelerando) es el que la app interactiva muestra por defecto: clic en la cresta y la velocidad inversa recupera el t_f inyectado.' : 'Case #4 (accelerating dam) is the one the interactive app shows by default: click the crest and inverse velocity recovers the injected t_f.'}</p>
      </section>
    </div>
  );
}
