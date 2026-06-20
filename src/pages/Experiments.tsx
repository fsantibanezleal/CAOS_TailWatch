import { Refs, useShellLang } from '@fasl-work/caos-app-shell';
import bench from '../data/forecast-benchmark.json';

// Theme-aware bar chart: median |t_f error| vs lead time (days before failure). Bars ordered far → near, so
// the eye reads the inverse-velocity hallmark directly: the forecast is wide far out and tightens at failure.
function LeadChart({ es }: { es: boolean }) {
  const buckets = [...bench.accel.leadCurve].filter((b) => b.n > 0).reverse(); // far (left) → near (right)
  const W = 560, H = 250, padL = 46, padB = 54, padT = 16, padR = 14;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxErr = Math.max(...buckets.map((b) => (b.medAbsRelErr ?? 0) * 100), 18);
  const bw = plotW / buckets.length;
  const yOf = (pct: number) => padT + plotH * (1 - pct / maxErr);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: 'block', margin: '0.4rem 0', font: '12px var(--font-sans, sans-serif)' }} role="img"
      aria-label={es ? 'Error mediano del t_f vs adelanto' : 'Median t_f error vs lead time'}>
      {[0, 5, 10, 15].map((g) => (<g key={g}>
        <line x1={padL} y1={yOf(g)} x2={W - padR} y2={yOf(g)} stroke="var(--color-border)" strokeWidth="1" />
        <text x={padL - 6} y={yOf(g) + 4} textAnchor="end" fill="var(--color-fg-subtle)">{g}%</text>
      </g>))}
      {buckets.map((b, i) => {
        const pct = (b.medAbsRelErr ?? 0) * 100;
        const x = padL + i * bw + bw * 0.18, w = bw * 0.64, y = yOf(pct);
        const near = i === buckets.length - 1;
        return (<g key={b.lo}>
          <rect x={x} y={y} width={w} height={padT + plotH - y} rx="3" fill={near ? '#3fb950' : 'var(--color-accent)'} opacity={near ? 1 : 0.55} />
          <text x={x + w / 2} y={y - 5} textAnchor="middle" fill="var(--color-fg)" fontWeight="600">{pct.toFixed(1)}%</text>
          <text x={x + w / 2} y={H - padB + 18} textAnchor="middle" fill="var(--color-fg-subtle)">{b.lo}–{b.hi} d</text>
          <text x={x + w / 2} y={H - padB + 33} textAnchor="middle" fill="var(--color-fg-subtle)" fontSize="10">n={b.n}</text>
        </g>);
      })}
      <text x={padL} y={H - 6} fill="var(--color-fg-subtle)">{es ? '◄ lejos de la falla' : '◄ far from failure'}</text>
      <text x={W - padR} y={H - 6} textAnchor="end" fill="#3fb950" fontWeight="600">{es ? 'cerca de la falla ►' : 'near failure ►'}</text>
    </svg>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return <div className="tw-stat"><div className="tw-stat-v">{v}</div><div className="tw-stat-l">{l}</div></div>;
}

export default function Experiments() {
  const es = useShellLang() === 'es';
  const a = bench.accel;
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Experimentos' : 'Experiments'}</h1>
        <p className="lede">{es ? 'Cómo medimos honestamente si el método funciona — una auto-validación Monte-Carlo que corre el MISMO pipeline de la app sobre cientos de trayectorias sintéticas con verdad de terreno conocida, midiendo recuperación de t_f, dependencia del adelanto, y tasa de falsa alarma en los controles.' : 'How we honestly measure whether the method works — a Monte-Carlo self-validation that runs the SAME app pipeline over hundreds of synthetic trajectories with known ground truth, measuring t_f recovery, lead-time dependence, and the false-alarm rate on the controls.'}</p>
      </div>

      <section>
        <h2>{es ? 'Diseño' : 'Design'}</h2>
        <p>{es
          ? <>El benchmark (reproducible con <span className="mono">npm run benchmark</span>, determinista por semilla) genera {bench.grid.seeds} semillas × {bench.grid.severities.length} severidades por régimen y emite el formato LiCSBAS, así que el motor de descomposición/inversión/velocidad-inversa/TARP que corre en vivo es el mismo que se evalúa. Sobre la presa acelerante medimos la recuperación del t_f inyectado a varios adelantos (truncando la serie); sobre los controles (roca estable, respiración estacional, creep lineal) medimos cuántas veces el pronosticador declara falsamente una falla.</>
          : <>The benchmark (reproducible with <span className="mono">npm run benchmark</span>, seed-deterministic) generates {bench.grid.seeds} seeds × {bench.grid.severities.length} severities per regime and emits the LiCSBAS format, so the decomposition / inversion / inverse-velocity / TARP engine evaluated is the one that runs live. On the accelerating dam we measure recovery of the injected t_f at several lead times (truncating the series); on the controls (stable rock, seasonal breathing, linear creep) we measure how often the forecaster falsely declares a failure.</>}</p>
      </section>

      <section>
        <h2>{es ? 'Resultados de auto-validación' : 'Self-validation results'}</h2>
        <div className="tw-stats">
          <Stat v={`${(a.detectRate * 100).toFixed(0)}%`} l={es ? `detección de falla (n=${a.nTrajectories})` : `failure detection (n=${a.nTrajectories})`} />
          <Stat v={`${a.medAbsRelErrTfPct}%`} l={es ? 'error mediano de t_f' : 'median t_f error'} />
          <Stat v={'0 / 540'} l={es ? 'falsas alarmas (controles)' : 'false alarms (controls)'} />
          <Stat v={`${(a.alphaAccuracy20 * 100).toFixed(0)}%`} l={es ? 'RUL dentro de ±20% (todos los adelantos)' : 'RUL within ±20% (all leads)'} />
        </div>
        <p>{es
          ? <>El pronosticador <b>detecta el 100% de las fallas</b> y recupera el día de falla a un <b>{a.medAbsRelErrTfPct}% mediano</b>. Pero la exactitud <b>depende del adelanto</b> — el sello distintivo de la velocidad inversa: lejos de la falla el ajuste 1/v apenas se curva y la proyección es ancha; cerca de la falla se aprieta. Por eso la exactitud de RUL agregada sobre TODOS los adelantos es sólo {(a.alphaAccuracy20 * 100).toFixed(0)}% — domesticada por los pronósticos tempranos, que no deben creerse.</>
          : <>The forecaster <b>detects 100% of failures</b> and recovers the failure day to a <b>{a.medAbsRelErrTfPct}% median</b>. But accuracy is <b>lead-time-dependent</b> — the inverse-velocity hallmark: far from failure the 1/v fit barely curves and the projection is wide; near failure it tightens. That is why RUL accuracy aggregated over ALL lead times is only {(a.alphaAccuracy20 * 100).toFixed(0)}% — dominated by the early forecasts, which should not be trusted.</>}</p>
        <LeadChart es={es} />
        <p className="muted small">{es ? 'Error mediano de la fecha de falla proyectada vs. el t_f inyectado, por banda de adelanto. La barra verde (más reciente al colapso) cae a ~0.6% — un pronóstico accionable sólo emerge a medida que la falla se acerca.' : 'Median error of the projected failure date vs the injected t_f, by lead-time band. The green bar (closest to collapse) falls to ~0.6% — an actionable forecast only emerges as failure approaches.'}</p>

        <h3>{es ? 'Tasa de falsa alarma (controles)' : 'False-alarm rate (controls)'}</h3>
        <table className="cmp-table">
          <thead><tr><th style={{ textAlign: 'left' }}>{es ? 'Régimen de control' : 'Control regime'}</th><th>n</th><th>{es ? 'Falsas alarmas' : 'False alarms'}</th><th>{es ? 'Tasa' : 'Rate'}</th></tr></thead>
          <tbody>
            {bench.controls.map((c) => (
              <tr key={c.regime}><td style={{ textAlign: 'left' }}>{c.regime}</td><td className="mono">{c.n}</td><td className="mono">{Math.round(c.falseAlarmRate * c.n)}</td><td className="mono">{(c.falseAlarmRate * 100).toFixed(0)}%</td></tr>
            ))}
          </tbody>
        </table>
        <p>{es
          ? 'Cero falsas alarmas en los tres controles (540 corridas): la compuerta de credibilidad (pendiente 1/v negativa Y R² > 0.55) no declara una falla sobre movimiento no acelerante — ni el creep lineal constante, ni la respiración estacional reversible, ni la roca estable. Esa es la propiedad de seguridad crítica: un monitor que grita lobo es peor que ninguno.'
          : 'Zero false alarms across all three controls (540 runs): the credibility gate (negative 1/v slope AND R² > 0.55) does not declare a failure on non-accelerating motion — not constant linear creep, not reversible seasonal breathing, not stable rock. That is the critical safety property: a monitor that cries wolf is worse than none.'}</p>
        <p className="muted small">{es ? 'Esto es auto-validación SINTÉTICA — la habilidad del método sobre el modelo, no una prueba de campo. Es complementaria a las fallas reales documentadas (Brumadinho, Cadia, taludes de rajo) en la página de Casos, donde el método se confronta con precursores publicados.' : 'This is SYNTHETIC self-validation — the method\'s skill on the model, not a field trial. It complements the documented real failures (Brumadinho, Cadia, open-pit slopes) on the Cases page, where the method is confronted with published precursors.'}</p>
        <Refs ids={['fukuzono1985', 'carla2017', 'rosehungr2007']} label="Refs" />
      </section>
    </div>
  );
}
