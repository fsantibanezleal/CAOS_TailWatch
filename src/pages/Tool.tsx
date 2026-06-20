import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type uPlot from 'uplot';
import { Tabs, useShellLang } from '@fasl-work/caos-app-shell';
import { loadDemo, pctNorm, CLASS_COLORS, CLASS_EN, CLASS_ES, type Demo } from '../data/demo';
import { vik, batlow, rgbCss } from '../lib/colormap';
import { inverseVelocity, tarp } from '../dsp/forecast';
import { classifySeries } from '../lib/ort';
import { FieldMap } from '../viz/FieldMap';
import { LatentScatter } from '../viz/LatentScatter';
import { Gauge } from '../viz/Gauge';
import { UPlotChart } from '../viz/UPlotChart';
import { lineOpts } from '../viz/uplotKit';

const hexRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const ALARM_C: Record<string, string> = { green: '#3fb950', amber: '#d29922', red: '#f85149' };

export default function Tool() {
  const es = useShellLang() === 'es';
  const [demo, setDemo] = useState<Demo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { loadDemo().then(setDemo).catch((e) => setErr(String(e))); }, []);
  if (err) return <div className="page-body"><p className="tw-note">Failed to load artifacts: {err}</p></div>;
  if (!demo) return <div className="page-body"><p className="tw-hint">{es ? 'Cargando artefactos del modelo…' : 'Loading model artifacts…'}</p></div>;
  return <Workbench demo={demo} />;
}

function Workbench({ demo }: { demo: Demo }) {
  const lang = useShellLang(); const es = lang === 'es';
  const CLS = es ? CLASS_ES : CLASS_EN;
  const [sel, setSel] = useState({ x: 80, y: 50 });
  const [maskCoh, setMaskCoh] = useState(true);
  const [epoch, setEpoch] = useState(59);
  const [cnnProbs, setCnnProbs] = useState<number[] | null>(null);

  // live CNN inference on the selected pixel's series (onnxruntime-web)
  useEffect(() => {
    let alive = true;
    classifySeries(demo.series(sel.x, sel.y)).then((p) => { if (alive) setCnnProbs(p); }).catch(() => setCnnProbs(null));
    return () => { alive = false; };
  }, [demo, sel]);

  const { W, H, days, nEp } = demo;
  const i = sel.y * W + sel.x;
  const series = demo.series(sel.x, sel.y);
  const vel = demo.vel[i];
  const iv = inverseVelocity(series, days);
  const lastDay = days[days.length - 1];
  const daysToFail = iv.tFail != null && iv.credible ? iv.tFail - lastDay : null;
  const alarm = tarp(vel, daysToFail);
  const cohN = pctNorm(demo.coh);
  const anomN = useMemo(() => pctNorm(demo.anomaly), [demo]);
  const cnnClass = cnnProbs ? cnnProbs.indexOf(Math.max(...cnnProbs)) : Math.round(demo.classMap[i]);

  // ---- colour functions per map ----
  const velColor = useCallback((k: number) => vik(demo.vel[k], 60), [demo]);
  const anomColor = useCallback((k: number) => batlow(anomN.norm[k]), [anomN]);
  const classColor = useCallback((k: number) => hexRgb(CLASS_COLORS[Math.round(demo.classMap[k])] || '#888'), [demo]);
  const cohColor = useCallback((k: number) => batlow(cohN.norm[k]), [cohN]);
  const cumColor = useCallback((k: number) => vik(demo.cumUp[epoch * W * H + k] / demo.cumScale, 80), [demo, epoch, W, H]);
  const lowCoh = useCallback((k: number) => demo.coh[k] < 0.4, [demo]);

  // ---- uPlot builds ----
  const tsData = useMemo<uPlot.AlignedData>(() => [Array.from(days), series], [days, series]);
  const buildTs = useCallback((w: number, h: number) => lineOpts(w, h, { label: es ? 'disp' : 'disp', color: '#58a6ff', xUnit: es ? 'día' : 'day', yUnit: 'mm', yPrec: 1 }), [es]);
  const ivData = useMemo<uPlot.AlignedData>(() => {
    const xs = iv.credible && iv.tFail != null ? [...days, iv.tFail] : Array.from(days);
    const ys: (number | null)[] = iv.credible && iv.tFail != null ? [...iv.invv, null] : iv.invv.slice();
    const fit = xs.map((x) => (iv.credible ? Math.max(0, iv.a + iv.b * x) : null));
    return [xs, ys, fit];
  }, [days, iv]);
  const buildIv = useCallback((w: number, h: number) => {
    const o = lineOpts(w, h, { label: '1/|v|', color: '#8b949e', xUnit: es ? 'día' : 'day', yUnit: 'd/mm', yPrec: 2 });
    o.series = [o.series[0], { ...o.series[1], points: { show: true } }, { label: es ? 'ajuste' : 'fit', stroke: '#f778ba', width: 1.6, dash: [5, 3], points: { show: false }, value: (_u: uPlot, v: number | null) => (v == null ? '--' : v.toFixed(2)) }];
    return o;
  }, [es]);
  const b = demo.benchmark;
  const rocData = useMemo<uPlot.AlignedData>(() => {
    // align AE + classical onto a shared FPR grid (step interpolation)
    const grid = Array.from({ length: 51 }, (_, k) => k / 50);
    const interp = (c: { fpr: number[]; tpr: number[] }) => grid.map((g) => { let t = 0; for (let k = 0; k < c.fpr.length; k++) if (c.fpr[k] <= g) t = c.tpr[k]; return t; });
    return [grid, interp(b.aeRoc), interp(b.velRoc), grid];
  }, [b]);
  const buildRoc = useCallback((w: number, h: number) => {
    const o = lineOpts(w, h, { label: 'AE', color: '#bc8cff', xUnit: 'FPR', yUnit: 'TPR', xPrec: 2, yPrec: 2, yRange: [0, 1] });
    o.series = [o.series[0], { ...o.series[1], label: `AE (AUC ${b.aeAuc})` },
      { label: `|v| (AUC ${b.velAuc})`, stroke: '#58a6ff', width: 1.6, points: { show: false }, value: (_u: uPlot, v: number | null) => (v == null ? '--' : v.toFixed(2)) },
      { label: es ? 'azar' : 'chance', stroke: '#6e7681', width: 1, dash: [3, 3], points: { show: false }, value: () => '' }];
    return o;
  }, [b, es]);

  // ---- tabs ----
  const mapReadVel = (x: number, y: number, k: number) => `${x},${y} · ${demo.vel[k].toFixed(1)} mm/yr · coh ${demo.coh[k].toFixed(2)}`;
  const tabs = [
    { id: 'vel', label: es ? 'Velocidad LOS' : 'LOS velocity', content: (
      <Panel t={es ? 'Velocidad de deformación LOS (mm/yr) — el baseline clásico' : 'LOS deformation velocity (mm/yr) — the classical baseline'}>
        <FieldMap W={W} H={H} colorAt={velColor} sel={sel} onPick={(x, y) => setSel({ x, y })} mask={maskCoh ? lowCoh : undefined} readout={mapReadVel} />
        <Cbar lo={es ? '← alejándose/hundimiento' : '← away/subsiding'} hi={es ? 'acercándose/alza →' : 'toward/uplift →'} ramp={[rgbCss(vik(-60, 60)), rgbCss(vik(0, 60)), rgbCss(vik(60, 60))]} unit="mm/yr ±60" />
      </Panel>) },
    { id: 'anom', label: es ? 'Anomalía (AE)' : 'Anomaly (AE)', content: (
      <Panel t={es ? 'Mapa de anomalía — error de reconstrucción del autoencoder convolucional (no supervisado)' : 'Anomaly map — convolutional-autoencoder reconstruction error (unsupervised)'}>
        <FieldMap W={W} H={H} colorAt={anomColor} sel={sel} onPick={(x, y) => setSel({ x, y })} readout={(x, y, k) => `${x},${y} · ${es ? 'anomalía' : 'anomaly'} ${anomN.norm[k].toFixed(2)}`} />
        <Cbar lo={es ? 'normal' : 'normal'} hi={es ? 'anómalo' : 'anomalous'} ramp={[rgbCss(batlow(0)), rgbCss(batlow(0.5)), rgbCss(batlow(1))]} unit={es ? 'percentil' : 'percentile'} />
        <p className="tw-note">{es ? 'El AE se entrena solo en parches normales; lo que reconstruye mal es anómalo. AUC held-out ' + b.aeAuc + ' vs |v| clásico ' + b.velAuc + ' — honesto: el clásico es fuerte cuando la falla tiene firma de velocidad.' : 'The AE trains on normal patches only; what it reconstructs poorly is anomalous. Held-out AUC ' + b.aeAuc + ' vs classical |v| ' + b.velAuc + ' — honest: the classical baseline is strong when failure has a velocity signature.'}</p>
      </Panel>) },
    { id: 'class', label: es ? 'Clase (CNN)' : 'Class (CNN)', content: (
      <Panel t={es ? 'Mapa de clase de deformación — clasificador CNN 1-D por píxel (6 clases)' : 'Deformation-class map — 1-D CNN per-pixel classifier (6 classes)'}>
        <FieldMap W={W} H={H} colorAt={classColor} sel={sel} onPick={(x, y) => setSel({ x, y })} readout={(x, y, k) => `${x},${y} · ${CLS[Math.round(demo.classMap[k])]}`} />
        <div className="tw-classlegend">{CLS.map((c, ci) => <span key={ci}><span className="dot" style={{ background: CLASS_COLORS[ci] }} />{c}</span>)}</div>
        <p className="tw-note">{es ? 'La velocidad da magnitud; el CNN da el TIPO de deformación — capacidad que el baseline no tiene. macro-F1 held-out ' + b.macroF1 + '.' : 'Velocity gives magnitude; the CNN gives the deformation TYPE — capability the baseline lacks. Held-out macro-F1 ' + b.macroF1 + '.'}</p>
      </Panel>) },
    { id: 'lat', label: es ? 'Espacio latente' : 'Latent space', content: (
      <Panel t={es ? 'Espacio latente del AE (UMAP) — la representación aprendida, coloreada por clase' : 'AE latent space (UMAP) — the learned representation, coloured by class'}>
        <LatentScatter pts={demo.latent} names={CLS} />
        <div className="tw-classlegend">{CLS.map((c, ci) => <span key={ci}><span className="dot" style={{ background: CLASS_COLORS[ci] }} />{c}</span>)}</div>
      </Panel>) },
    { id: 'series', label: es ? 'Serie + ajuste' : 'Series + fit', content: (
      <Panel t={es ? 'Desplazamiento LOS acumulado (mm) del píxel seleccionado — negativo = hundimiento' : 'Cumulative LOS displacement (mm) at the selected pixel — negative = subsiding'}>
        <UPlotChart data={tsData} build={buildTs} height={200} />
        <p className="tw-hint">{es ? 'Clic en cualquier mapa para inspeccionar otro píxel.' : 'Click any map to inspect another pixel.'}</p>
      </Panel>) },
    { id: 'iv', label: es ? 'Velocidad inversa' : 'Inverse velocity', content: (
      <Panel t={es ? 'Velocidad inversa 1/|v| (Fukuzono) — el ajuste lineal proyecta el tiempo de falla' : 'Inverse velocity 1/|v| (Fukuzono) — the linear fit projects the failure time'}>
        <UPlotChart data={ivData} build={buildIv} height={200} />
      </Panel>) },
    { id: 'coh', label: es ? 'Coherencia' : 'Coherence', content: (
      <Panel t={es ? 'Coherencia temporal media — calidad interferométrica (baja en agua/playa)' : 'Mean temporal coherence — interferometric quality (low over water/beach)'}>
        <FieldMap W={W} H={H} colorAt={cohColor} sel={sel} onPick={(x, y) => setSel({ x, y })} readout={(x, y, k) => `${x},${y} · coh ${demo.coh[k].toFixed(2)}`} />
        <Cbar lo={es ? 'incoherente' : 'incoherent'} hi={es ? 'coherente' : 'coherent'} ramp={[rgbCss(batlow(0)), rgbCss(batlow(0.5)), rgbCss(batlow(1))]} unit="0–1" />
      </Panel>) },
    { id: 'cum', label: es ? 'Acumulado (tiempo)' : 'Cumulative (time)', content: (
      <Panel t={es ? `Desplazamiento acumulado en la época ${epoch + 1}/${nEp} (día ${days[epoch].toFixed(0)})` : `Cumulative displacement at epoch ${epoch + 1}/${nEp} (day ${days[epoch].toFixed(0)})`}>
        <FieldMap W={W} H={H} colorAt={cumColor} sel={sel} onPick={(x, y) => setSel({ x, y })} mask={maskCoh ? lowCoh : undefined} readout={(x, y, k) => `${x},${y} · ${(demo.cumUp[epoch * W * H + k] / demo.cumScale).toFixed(1)} mm`} />
        <input className="range" type="range" min={0} max={nEp - 1} value={epoch} onChange={(e) => setEpoch(+e.target.value)} style={{ width: '100%', marginTop: '0.4rem' }} />
        <Cbar lo={es ? '← hundimiento' : '← subsiding'} hi={es ? 'alza →' : 'uplift →'} ramp={[rgbCss(vik(-80, 80)), rgbCss(vik(0, 80)), rgbCss(vik(80, 80))]} unit="mm ±80" />
      </Panel>) },
    { id: 'roc', label: es ? 'Benchmark ROC' : 'ROC benchmark', content: (
      <Panel t={es ? 'Detección de falla en escenas HELD-OUT — aprendido (AE) vs clásico (|velocidad|)' : 'Failure detection on HELD-OUT scenes — learned (AE) vs classical (|velocity|)'}>
        <UPlotChart data={rocData} build={buildRoc} height={300} />
        <p className="tw-note">{es ? `Honesto: en escenas no vistas el baseline |v| (AUC ${b.velAuc}) supera al AE (AUC ${b.aeAuc}) porque las fallas simuladas tienen firma de velocidad. El valor aprendido es la clasificación de tipo + la detección sin etiquetas.` : `Honest: on unseen scenes the |v| baseline (AUC ${b.velAuc}) beats the AE (AUC ${b.aeAuc}) because the simulated failures carry a velocity signature. The learned value is the type classification + label-free detection.`}</p>
      </Panel>) },
    { id: 'conf', label: es ? 'Matriz de confusión' : 'Confusion matrix', content: (
      <Panel t={es ? `Matriz de confusión del CNN (held-out, ${b.heldOut.length} escenas) — macro-F1 ${b.macroF1}` : `CNN confusion matrix (held-out, ${b.heldOut.length} scenes) — macro-F1 ${b.macroF1}`}>
        <Confusion m={b.confusion} names={CLS} />
      </Panel>) },
  ];

  return (
    <div className="page-body tw-layout">
      <aside className="tw-side">
        <div className="tw-diag" data-alarm={alarm.level}>
          <div className="tw-diag-top"><strong>TARP {alarm.level.toUpperCase()}</strong><span className="tw-hint">{es ? alarm.reasonEs : alarm.reason}</span></div>
          <Gauge title={es ? 'Velocidad |LOS| (mm/yr)' : '|LOS| velocity (mm/yr)'} value={Math.abs(vel)} max={120}
            zones={[{ upTo: 30, color: '#3fb950' }, { upTo: 60, color: '#58a6ff' }, { upTo: 100, color: '#d29922' }, { upTo: 120, color: '#f85149' }]} />
        </div>
        <div className="tw-diag">
          <div className="tw-read">
            <span className="k">{es ? 'Píxel' : 'Pixel'}</span><span className="v">{sel.x},{sel.y}</span>
            <span className="k">{es ? 'Velocidad' : 'Velocity'}</span><span className="v">{vel.toFixed(1)} mm/yr</span>
            <span className="k">{es ? 'Clase (CNN)' : 'Class (CNN)'}</span><span className="v" style={{ color: ALARM_C[alarm.level] }}>{CLS[cnnClass]}{cnnProbs ? ` ${(Math.max(...cnnProbs) * 100).toFixed(0)}%` : ''}</span>
            <span className="k">{es ? 'Anomalía' : 'Anomaly'}</span><span className="v">{anomN.norm[i].toFixed(2)}</span>
            <span className="k">{es ? 'Coherencia' : 'Coherence'}</span><span className="v">{demo.coh[i].toFixed(2)}</span>
            <span className="k">{es ? 'Falla proy.' : 'Proj. failure'}</span><span className="v">{iv.credible && daysToFail != null ? `${daysToFail.toFixed(0)} d` : '—'}</span>
          </div>
        </div>
        <label className="tw-ctl tw-check"><input type="checkbox" checked={maskCoh} onChange={(e) => setMaskCoh(e.target.checked)} /> {es ? 'Máscara de coherencia' : 'Coherence mask'}</label>
        <p className="tw-note">{es ? 'Datos SINTÉTICOS físicamente fundados (formato LiCSBAS); modelos entrenados offline, inferencia ONNX en vivo. NO es un sistema de alarma certificado.' : 'SYNTHETIC physics-grounded data (LiCSBAS format); models trained offline, live ONNX inference. NOT a certified alarm system.'}</p>
      </aside>
      <div className="tw-main"><Tabs tabs={tabs} ariaLabel="methods" /></div>
    </div>
  );
}

function Panel({ t, children }: { t: string; children: ReactNode }) {
  return <div className="tw-plot"><div className="tw-plot-t">{t}</div>{children}</div>;
}
function Cbar({ lo, hi, ramp, unit }: { lo: string; hi: string; ramp: string[]; unit: string }) {
  return <div className="tw-legend"><span>{lo}</span><span className="tw-cbar" style={{ background: `linear-gradient(90deg, ${ramp.join(', ')})` }} /><span>{hi}</span><span className="tw-legend-u muted">{unit}</span></div>;
}
function Confusion({ m, names }: { m: number[][]; names: string[] }) {
  const rowSums = m.map((r) => r.reduce((a, b) => a + b, 0) || 1);
  return (
    <table className="cmp-table">
      <thead><tr><th className="lo">{'true \\ pred'}</th>{names.map((n, i) => <th key={i}>{n.split(' ')[0]}</th>)}</tr></thead>
      <tbody>{m.map((row, r) => (
        <tr key={r}><th className="lo">{names[r]}</th>{row.map((v, c) => { const f = v / rowSums[r]; return <td key={c} style={{ background: `color-mix(in oklab, var(--color-accent) ${Math.round(f * 70)}%, transparent)`, fontWeight: r === c ? 700 : 400 }}>{v}</td>; })}</tr>
      ))}</tbody>
    </table>
  );
}
