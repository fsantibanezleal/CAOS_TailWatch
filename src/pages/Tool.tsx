import { useCallback, useMemo, useState } from 'react';
import type uPlot from 'uplot';
import { useShellLang } from '@fasl-work/caos-app-shell';
import { buildCube, pixelSeries, type Regime } from '../dsp/insar';
import { inverseVelocity, tarp } from '../dsp/forecast';
import { DeformationMap } from '../viz/DeformationMap';
import { UPlotChart } from '../viz/UPlotChart';
import { lineOpts } from '../viz/uplotKit';

const T = {
  en: { scen: 'Synthetic case', sev: 'Creep severity', mask: 'Coherence mask', pick: 'Click a pixel on the map to inspect its displacement history.',
    ts: 'Cumulative LOS displacement (mm) — negative = away / subsiding', iv: 'Inverse velocity 1/|v| — the linear fit projects the failure time (x-intercept)',
    alarm: 'TARP alarm', tf: 'Projected failure', incon: 'inconclusive (no credible acceleration / poor fit)', r2: 'fit R²', vel: 'LOS velocity',
    zoneLbl: 'zone', disc: 'SYNTHETIC, physics-grounded data in the real LiCSBAS sense (tertiary creep → known t_f). TailWatch is didactic + decision-support, NOT a certified safety/alarm system: InSAR is 6–12-day surveillance (it can miss the final acceleration), LOS-only, and alarm thresholds are configurable site defaults, not regulatory limits.' },
  es: { scen: 'Caso sintético', sev: 'Severidad de creep', mask: 'Máscara de coherencia', pick: 'Clic en un píxel del mapa para inspeccionar su historia de desplazamiento.',
    ts: 'Desplazamiento LOS acumulado (mm) — negativo = alejándose / hundimiento', iv: 'Velocidad inversa 1/|v| — el ajuste lineal proyecta el tiempo de falla (intercepto x)',
    alarm: 'Alarma TARP', tf: 'Falla proyectada', incon: 'no concluyente (sin aceleración creíble / ajuste pobre)', r2: 'R² del ajuste', vel: 'Velocidad LOS',
    zoneLbl: 'zona', disc: 'Datos SINTÉTICOS, físicamente fundados en el sentido LiCSBAS real (creep terciario → t_f conocido). TailWatch es didáctico + soporte de decisión, NO un sistema certificado de seguridad/alarma: InSAR es vigilancia de 6–12 días (puede perder la aceleración final), solo LOS, y los umbrales de alarma son valores por defecto configurables, no límites regulatorios.' },
};
const ALARM_C: Record<string, string> = { green: '#3fb950', amber: '#d29922', red: '#f85149' };
const CASES: { regime: Regime; en: string; es: string; expEn: string; expEs: string }[] = [
  { regime: 'accelerating', en: 'Accelerating dam → collapse', es: 'Presa acelerando → colapso', expEn: 'failure — inverse velocity recovers t_f', expEs: 'falla — la velocidad inversa recupera t_f' },
  { regime: 'stable', en: 'Stable bedrock (control)', es: 'Roca estable (control)', expEn: 'non-failure — must NOT raise a false alarm', expEs: 'no-falla — NO debe dar falsa alarma' },
  { regime: 'seasonal', en: 'Seasonal beach breathing', es: 'Respiración estacional de playa', expEn: 'reversible annual cycle — no net trend, no failure', expEs: 'ciclo anual reversible — sin tendencia neta, sin falla' },
  { regime: 'step', en: 'Step after rain', es: 'Escalón tras lluvia', expEn: 'one-off settling step — not an accelerating failure', expEs: 'escalón de asentamiento puntual — no es falla acelerante' },
  { regime: 'linear', en: 'Steady linear creep', es: 'Creep lineal estable', expEn: 'constant velocity — no acceleration, t_f undefined', expEs: 'velocidad constante — sin aceleración, t_f indefinido' },
];

export default function Tool() {
  const lang = useShellLang(); const es = lang === 'es'; const t = T[lang];
  const [severity, setSeverity] = useState(1.0);
  const [maskCoh, setMaskCoh] = useState(true);
  const [regime, setRegime] = useState<Regime>('accelerating');
  const cube = useMemo(() => buildCube({ severity, seed: 7, regime }), [severity, regime]);
  const curCase = CASES.find((c) => c.regime === regime)!;
  const [sel, setSel] = useState({ x: 48, y: 27 });
  const series = useMemo(() => pixelSeries(cube, sel.x, sel.y), [cube, sel]);
  const days = useMemo(() => Array.from(cube.days), [cube]);
  const iv = useMemo(() => inverseVelocity(series, days), [series, days]);
  const velMmYr = cube.vel[sel.y * cube.W + sel.x];
  const lastDay = days[days.length - 1];
  const daysToFail = iv.tFail != null && iv.credible ? iv.tFail - lastDay : null;
  const alarm = tarp(velMmYr, daysToFail);

  const tsData = useMemo<uPlot.AlignedData>(() => [days, series], [days, series]);
  const ivData = useMemo<uPlot.AlignedData>(() => {
    const xs = iv.credible && iv.tFail != null ? [...days, iv.tFail] : days.slice();
    const ys: (number | null)[] = iv.credible && iv.tFail != null ? [...iv.invv, null] : iv.invv.slice();
    const fit = xs.map((x) => (iv.credible ? Math.max(0, iv.a + iv.b * x) : null));
    return [xs, ys, fit];
  }, [days, iv]);

  const buildTs = useCallback((w: number, h: number) => lineOpts(w, h, { label: es ? 'disp' : 'disp', color: '#58a6ff', xUnit: es ? 'día' : 'day', yUnit: 'mm', yPrec: 1 }), [es]);
  const buildIv = useCallback((w: number, h: number) => {
    const o = lineOpts(w, h, { label: '1/|v|', color: '#8b949e', xUnit: es ? 'día' : 'day', yUnit: 'd/mm', yPrec: 2 });
    o.series = [o.series[0], { ...o.series[1], label: '1/|v|', points: { show: true } }, { label: es ? 'ajuste' : 'fit', stroke: '#f778ba', width: 1.6, dash: [5, 3], points: { show: false }, value: (_u: uPlot, v: number | null) => (v == null ? '--' : v.toFixed(2)) }];
    return o;
  }, [es]);

  return (
    <div className="page-body tw-layout">
      <aside className="tw-controls">
        <div className="tw-ctl">
          <span>{t.scen}</span>
          <div className="tw-cases">{CASES.map((c) => <button key={c.regime} className={`chip ${regime === c.regime ? 'on' : ''}`} onClick={() => setRegime(c.regime)} title={es ? c.es : c.en}>{(es ? c.es : c.en).split(/[ →]/)[0]}</button>)}</div>
          <div className="muted small"><b>{es ? curCase.es : curCase.en}</b> — <i>{es ? curCase.expEs : curCase.expEn}</i></div>
        </div>
        <label className="tw-ctl">{t.sev}: {severity.toFixed(2)}<input className="range" type="range" min={0.3} max={1.6} step={0.05} value={severity} onChange={(e) => setSeverity(+e.target.value)} /></label>
        <label className="tw-ctl tw-check"><input type="checkbox" checked={maskCoh} onChange={(e) => setMaskCoh(e.target.checked)} /> {t.mask}</label>
        <div className="tw-alarm card" style={{ borderColor: ALARM_C[alarm.level] }}>
          <span className="tw-alarm-dot" style={{ background: ALARM_C[alarm.level] }} /> <b>{t.alarm}: {alarm.level.toUpperCase()}</b>
          <div className="small muted">{es ? alarm.reasonEs : alarm.reason}</div>
        </div>
        <div className="tw-read small">
          <div><span className="muted">{t.vel}:</span> <b>{velMmYr.toFixed(1)} mm/yr</b></div>
          <div><span className="muted">{t.tf}:</span> <b>{iv.credible && daysToFail != null ? `${daysToFail.toFixed(0)} d (${iv.tFailLo != null ? Math.max(0, iv.tFailLo - lastDay).toFixed(0) : '?'}–${iv.tFailHi != null ? (iv.tFailHi - lastDay).toFixed(0) : '?'} d)` : t.incon}</b></div>
          <div><span className="muted">{t.r2}:</span> <b>{iv.r2.toFixed(2)}</b> · <span className="muted">{t.zoneLbl}:</span> {(['rock', 'dam', 'beach'] as const)[cube.zone[sel.y * cube.W + sel.x]]}</div>
        </div>
      </aside>
      <div className="tw-main">
        <DeformationMap cube={cube} sel={sel} onPick={(x, y) => setSel({ x, y })} maskCoh={maskCoh} clamp={60} lang={lang} />
        <p className="hint">{t.pick}</p>
        <div className="tw-plot"><div className="tw-plot-t">{t.ts}</div><UPlotChart data={tsData} build={buildTs} height={150} /></div>
        <div className="tw-plot"><div className="tw-plot-t">{t.iv}</div><UPlotChart data={ivData} build={buildIv} height={160} /></div>
        <p className="hint tw-disc">{t.disc}</p>
      </div>
    </div>
  );
}
