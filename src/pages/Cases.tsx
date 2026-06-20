import { Refs, useShellLang } from '@fasl-work/caos-app-shell';

// Documented real tailings/slope failures — what satellite InSAR and the inverse-velocity method actually
// showed (and where they fell short). All claims trace to the cited, DOI-verified literature.
type Field = { en: string; es: string };
type RealCase = { title: Field; meta: Field; happened: Field; insar: Field; verdict: Field; lesson: Field; refs: string[]; verdictTone: 'ok' | 'mixed' | 'warn' };
const REAL: RealCase[] = [
  {
    title: { en: 'Brumadinho — Dam I (B1), Córrego do Feijão', es: 'Brumadinho — Presa I (B1), Córrego do Feijão' },
    meta: { en: 'Upstream tailings dam · Minas Gerais, Brazil · 25 Jan 2019 · ~270 fatalities', es: 'Presa de relaves aguas arriba · Minas Gerais, Brasil · 25 ene 2019 · ~270 víctimas' },
    happened: { en: 'An inactive upstream-raised tailings dam failed suddenly by static liquefaction, releasing ~10 Mm³ of tailings in minutes with little visible surface warning.', es: 'Una presa de relaves aguas arriba inactiva falló súbitamente por licuefacción estática, liberando ~10 Mm³ de relaves en minutos con poca advertencia superficial visible.' },
    insar: { en: 'Grebby et al. (2021) reprocessed archived Sentinel-1 with ISBAS and found a measurable accelerating deformation precursor over the failed sector in the months before collapse — a signal not flagged operationally at the time.', es: 'Grebby et al. (2021) reprocesaron Sentinel-1 archivado con ISBAS y hallaron un precursor de deformación acelerante medible sobre el sector colapsado en los meses previos — una señal no advertida operacionalmente entonces.' },
    verdict: { en: 'Retrospectively the accelerating creep fits the inverse-velocity framework, but the signal was subtle (mm-scale, advanced processing) and the liquefaction trigger was abrupt.', es: 'Retrospectivamente el creep acelerante encaja en el marco de velocidad inversa, pero la señal era sutil (escala mm, procesamiento avanzado) y el gatillo de licuefacción fue abrupto.' },
    lesson: { en: 'InSAR is a continuous screen, not a guarantee: 6–12-day, LOS-only surveillance can under-sample a fast, brittle, undrained failure. TailWatch states this on every page.', es: 'InSAR es un tamiz continuo, no una garantía: la vigilancia LOS de 6–12 días puede sub-muestrear una falla rápida, frágil y no drenada. TailWatch lo declara en cada página.' },
    refs: ['grebby2021', 'morishita2020'], verdictTone: 'warn',
  },
  {
    title: { en: 'Cadia — Northern Tailings Storage Facility', es: 'Cadia — Depósito de Relaves Norte' },
    meta: { en: 'Tailings embankment · NSW, Australia · 9 Mar 2018 · no fatalities', es: 'Terraplén de relaves · NSW, Australia · 9 mar 2018 · sin víctimas' },
    happened: { en: 'The northern embankment slumped and released tailings; the facility was evacuated and operations halted, but no one was hurt.', es: 'El terraplén norte se deslizó y liberó relaves; la instalación fue evacuada y la operación detenida, sin heridos.' },
    insar: { en: 'Carlà et al. (2019) showed Sentinel-1 captured clear precursory accelerating deformation of the embankment in the weeks before failure.', es: 'Carlà et al. (2019) mostraron que Sentinel-1 capturó una deformación precursora acelerante clara del terraplén en las semanas previas a la falla.' },
    verdict: { en: 'A success: the accelerating phase yields an inverse-velocity trend whose linear extrapolation brackets the failure date — exactly the regime the app\'s accelerating case mirrors.', es: 'Un éxito: la fase acelerante da una tendencia de velocidad inversa cuya extrapolación lineal acota la fecha de falla — justo el régimen que replica el caso acelerante de la app.' },
    lesson: { en: 'When a measurable accelerating creep phase exists, InSAR + inverse-velocity gives an actionable forecast window — the best case for the method.', es: 'Cuando existe una fase de creep acelerante medible, InSAR + velocidad inversa da una ventana de pronóstico accionable — el mejor caso del método.' },
    refs: ['carla2019', 'fukuzono1985'], verdictTone: 'ok',
  },
  {
    title: { en: 'Open-pit rock slopes — the method\'s envelope', es: 'Taludes rocosos en rajo — el rango del método' },
    meta: { en: 'Decades of pit-slope monitoring (prism / radar / InSAR)', es: 'Décadas de monitoreo de taludes de rajo (prisma / radar / InSAR)' },
    happened: { en: 'Open-pit highwalls fail in regimes from slow regressive creep to brittle progressive collapse; only some are forecastable.', es: 'Los taludes de rajo fallan en regímenes que van del creep regresivo lento al colapso progresivo frágil; sólo algunos son pronosticables.' },
    insar: { en: 'Rose & Hungr (2007) reviewed inverse-velocity across pit failures: brittle, progressive failures with a clear onset-of-acceleration are forecastable; regressive or ductile movements are not, and noisy velocity must be smoothed.', es: 'Rose & Hungr (2007) revisaron velocidad inversa en fallas de rajo: las fallas frágiles y progresivas con un inicio de aceleración claro son pronosticables; los movimientos regresivos o dúctiles no, y la velocidad ruidosa debe suavizarse.' },
    verdict: { en: 'Inverse-velocity works conditionally; Carlà et al. (2017) give the operating guidelines (velocity smoothing, threshold setting, false-alarm control).', es: 'La velocidad inversa funciona condicionalmente; Carlà et al. (2017) dan las guías operativas (suavizado de velocidad, fijación de umbrales, control de falsas alarmas).' },
    lesson: { en: 'A forecast is only as good as the failure mechanism. TailWatch\'s R² + credibility gate is a minimal version of those guidelines, and the stable-control case checks the pipeline does NOT false-alarm.', es: 'Un pronóstico vale lo que el mecanismo de falla. El filtro R² + credibilidad de TailWatch es una versión mínima de esas guías, y el caso de control estable verifica que el pipeline NO dé falsa alarma.' },
    refs: ['rosehungr2007', 'carla2017', 'cruden1987'], verdictTone: 'mixed',
  },
];
const TONE: Record<string, string> = { ok: '#3fb950', mixed: '#d29922', warn: '#f85149' };

// Synthetic coverage matrix — the regimes the interactive app generates, each emitting the LiCSBAS format
// and validated against its injected ground truth.
const SYNTH: { n: number; case: Field; regime: Field; comp: string; label: Field }[] = [
  { n: 1, case: { en: 'Accelerating dam → collapse', es: 'Presa acelerando → colapso' }, regime: { en: 'tertiary creep to a known t_f', es: 'creep terciario a un t_f conocido' }, comp: 'Up / asc+desc', label: { en: 'failure', es: 'falla' } },
  { n: 2, case: { en: 'Stable bedrock (control)', es: 'Roca estable (control)' }, regime: { en: '~0 mm/yr', es: '~0 mm/yr' }, comp: 'Up', label: { en: 'non-failure', es: 'no-falla' } },
  { n: 3, case: { en: 'Seasonal beach breathing', es: 'Respiración estacional de playa' }, regime: { en: 'reversible annual sinusoid', es: 'sinusoide anual reversible' }, comp: 'Up', label: { en: 'non-failure', es: 'no-falla' } },
  { n: 4, case: { en: 'Step after rain', es: 'Escalón tras lluvia' }, regime: { en: 'one-off post-rainfall settling', es: 'asentamiento puntual post-lluvia' }, comp: 'Up', label: { en: 'mixed', es: 'mixto' } },
  { n: 5, case: { en: 'Steady linear creep', es: 'Creep lineal estable' }, regime: { en: 'constant velocity, no acceleration', es: 'velocidad constante, sin aceleración' }, comp: 'Up', label: { en: 'mixed', es: 'mixto' } },
  { n: 6, case: { en: 'East-bulging dam face', es: 'Cara de presa abombándose al este' }, regime: { en: 'vertical + horizontal (decomposed)', es: 'vertical + horizontal (descompuesto)' }, comp: 'East', label: { en: 'mixed', es: 'mixto' } },
];

function Card({ c, es }: { c: RealCase; es: boolean }) {
  const F = (f: Field) => (es ? f.es : f.en);
  const rows: [string, Field][] = [
    [es ? 'Qué pasó' : 'What happened', c.happened],
    [es ? 'Qué mostró InSAR' : 'What InSAR showed', c.insar],
    [es ? 'Veredicto velocidad inversa' : 'Inverse-velocity verdict', c.verdict],
    [es ? 'Lección para TailWatch' : 'Lesson for TailWatch', c.lesson],
  ];
  return (
    <div className="tw-case-card" style={{ borderLeftColor: TONE[c.verdictTone] }}>
      <h3>{F(c.title)}</h3>
      <p className="muted small tw-case-meta">{F(c.meta)}</p>
      <div className="tw-case-grid">
        {rows.map(([k, v]) => (<div key={k}><span className="tw-case-k">{k}</span><p>{F(v)}</p></div>))}
      </div>
      <Refs ids={c.refs} label="Refs" />
    </div>
  );
}

export default function Cases() {
  const es = useShellLang() === 'es';
  const F = (f: Field) => (es ? f.es : f.en);
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Casos' : 'Cases'}</h1>
        <p className="lede">{es ? 'Primero, qué mostró realmente el InSAR satelital en fallas de relaves/taludes documentadas — incluido dónde el método NO advirtió. Luego, los regímenes sintéticos que la app genera para cubrir el espacio falla / no-falla.' : 'First, what satellite InSAR actually showed on documented tailings/slope failures — including where the method did NOT warn. Then the synthetic regimes the app generates to span the failure / non-failure space.'}</p>
      </div>

      <section>
        <h2>{es ? 'Fallas reales documentadas' : 'Documented real failures'}</h2>
        <p>{es ? 'Tres referencias acotan lo que InSAR + velocidad inversa puede y no puede hacer: una falla súbita por licuefacción con precursor sólo retrospectivo, una falla con precursor claro y pronosticable, y el rango operativo del método en taludes de rajo. Nunca enfocamos SAR ni re-alojamos productos: estos casos se consumen como hechos citados.' : 'Three references bound what InSAR + inverse-velocity can and cannot do: a sudden liquefaction failure with only a retrospective precursor, a failure with a clear forecastable precursor, and the method\'s operating envelope on open-pit slopes. We never focus SAR nor re-host products: these cases are consumed as cited facts.'}</p>
        {REAL.map((c) => <Card key={c.title.en} c={c} es={es} />)}
      </section>

      <section>
        <h2>{es ? 'Matriz de cobertura sintética' : 'Synthetic coverage matrix'}</h2>
        <p>{es ? 'La app interactiva genera estos regímenes (cada uno emite el formato LiCSBAS y se valida contra su verdad inyectada). El caso acelerante es el de defecto: clic en la cresta y la velocidad inversa recupera el t_f; el control estable verifica la ausencia de falsa alarma.' : 'The interactive app generates these regimes (each emits the LiCSBAS format and is validated against its injected ground truth). The accelerating case is the default: click the crest and inverse velocity recovers t_f; the stable control verifies the absence of a false alarm.'}</p>
        <table className="cmp-table">
          <thead><tr><th>#</th><th style={{ textAlign: 'left' }}>{es ? 'Caso' : 'Case'}</th><th style={{ textAlign: 'left' }}>{es ? 'Régimen' : 'Regime'}</th><th>{es ? 'Componente' : 'Component'}</th><th>{es ? 'Etiqueta' : 'Label'}</th></tr></thead>
          <tbody>
            {SYNTH.map((c) => (
              <tr key={c.n}><td className="mono">{c.n}</td><td style={{ textAlign: 'left' }}><b>{F(c.case)}</b></td><td style={{ textAlign: 'left' }}>{F(c.regime)}</td><td>{c.comp}</td><td>{F(c.label)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">{es ? 'Honestidad de cobertura: Sentinel-1 inicia en 2014, así que Fundão/Samarco (2015) tiene poca cobertura S1 y Mount Polley (2014) es pre/temprano-S1 — se documentan en los límites, nunca se falsifican en las pilas. Cada caso sintético lleva el badge SYNTHETIC + semilla.' : 'Coverage honesty: Sentinel-1 starts in 2014, so Fundão/Samarco (2015) has thin S1 and Mount Polley (2014) is pre/early-S1 — documented in the limits, never faked into the stacks. Every synthetic case carries the SYNTHETIC badge + seed.'}</p>
      </section>
    </div>
  );
}
