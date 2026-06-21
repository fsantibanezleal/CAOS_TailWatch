import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type uPlot from 'uplot';
import { Tabs, useShellLang } from '@fasl-work/caos-app-shell';
import { loadManifest, loadCase, velOf, seriesAt, pctNorm, CLASS_COLORS, CLASS_EN, CLASS_ES, COMP_EN, COMP_ES, type Manifest, type CaseData, type Component } from '../data/demo';
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
const COMPS: Component[] = ['up', 'east', 'asc', 'desc'];

export default function Tool() {
  const es = useShellLang() === 'es';
  const [m, setM] = useState<Manifest | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { loadManifest().then(setM).catch((e) => setErr(String(e))); }, []);
  if (err) return <div className="page-body"><p className="tw-note">Failed to load artifacts: {err}</p></div>;
  if (!m) return <div className="page-body"><p className="tw-hint">{es ? 'Cargando artefactos del modelo…' : 'Loading model artifacts…'}</p></div>;
  return <Workbench m={m} />;
}

function Workbench({ m }: { m: Manifest }) {
  const lang = useShellLang(); const es = lang === 'es';
  const CLS = es ? CLASS_ES : CLASS_EN; const COMP = es ? COMP_ES : COMP_EN;
  const [caseId, setCaseId] = useState(m.cases[0].id);
  const [comp, setComp] = useState<Component>('up');
  const [cd, setCd] = useState<CaseData | null>(null);
  const [sel, setSel] = useState({ x: 80, y: 50 });
  const [maskCoh, setMaskCoh] = useState(true);
  const [epoch, setEpoch] = useState(m.nEp - 1);
  const [cnnProbs, setCnnProbs] = useState<number[] | null>(null);

  useEffect(() => { let a = true; setCd(null); loadCase(m, caseId).then((d) => { if (a) setCd(d); }); return () => { a = false; }; }, [m, caseId]);
  useEffect(() => {
    if (!cd) return; let a = true;
    classifySeries(seriesAt(m, cd, sel.x, sel.y)).then((p) => { if (a) setCnnProbs(p); }).catch(() => setCnnProbs(null));
    return () => { a = false; };
  }, [m, cd, sel]);

  const { W, H, days, nEp } = m;
  const i = sel.y * W + sel.x;
  const caseInfo = m.cases.find((c) => c.id === caseId)!;
  const series = useMemo(() => (cd ? seriesAt(m, cd, sel.x, sel.y) : []), [m, cd, sel]);
  const velField = cd ? velOf(cd, comp) : null;
  const vel = velField ? velField[i] : 0;
  const velUp = cd ? cd.velUp[i] : 0;
  const iv = useMemo(() => (series.length ? inverseVelocity(series, days) : null), [series, days]);
  const lastDay = days[days.length - 1];
  const daysToFail = iv && iv.tFail != null && iv.credible ? iv.tFail - lastDay : null;
  const alarm = tarp(velUp, daysToFail);
  const anomN = useMemo(() => (cd ? pctNorm(cd.anomaly) : null), [cd]);
  const cnnClass = cnnProbs ? cnnProbs.indexOf(Math.max(...cnnProbs)) : (cd ? Math.round(cd.classMap[i]) : 0);

  const velColor = useCallback((k: number) => vik(velField ? velField[k] : 0, 60), [velField]);
  const anomColor = useCallback((k: number) => batlow(anomN ? anomN.norm[k] : 0), [anomN]);
  const classColor = useCallback((k: number) => hexRgb(CLASS_COLORS[cd ? Math.round(cd.classMap[k]) : 0] || '#888'), [cd]);
  const cohColor = useCallback((k: number) => batlow(cd ? cd.coh[k] : 0), [cd]);
  const cumColor = useCallback((k: number) => vik(cd ? cd.cumUp[epoch * W * H + k] / m.cumScale : 0, 80), [cd, epoch, W, H, m]);
  const lowCoh = useCallback((k: number) => !!cd && cd.coh[k] < 0.4, [cd]);

  const tsData = useMemo<uPlot.AlignedData>(() => [Array.from(days), series], [days, series]);
  const buildTs = useCallback((w: number, h: number) => lineOpts(w, h, { label: 'disp', color: '#58a6ff', xUnit: es ? 'día' : 'day', yUnit: 'mm', yPrec: 1 }), [es]);
  const ivData = useMemo<uPlot.AlignedData>(() => {
    if (!iv) return [[], []];
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
  const b = m.benchmark;
  const rocData = useMemo<uPlot.AlignedData>(() => {
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

  const compUnit = comp === 'east' ? (es ? 'Este mm/yr' : 'East mm/yr') : comp === 'up' ? (es ? 'Up mm/yr' : 'Up mm/yr') : `LOS ${comp} mm/yr`;
  const loadingMap = !cd ? <p className="tw-hint">{es ? 'Cargando caso…' : 'Loading case…'}</p> : null;

  const tabs = [
    { id: 'vel', label: es ? 'Velocidad' : 'Velocity', content: <Panel t={`${es ? 'Velocidad de deformación' : 'Deformation velocity'} — ${COMP[comp]} (mm/yr)`}>{loadingMap || <><FieldMap W={W} H={H} colorAt={velColor} sel={sel} onPick={(x, y) => setSel({ x, y })} mask={maskCoh ? lowCoh : undefined} readout={(x, y, k) => `${x},${y} · ${(velField ? velField[k] : 0).toFixed(1)} mm/yr · coh ${(cd ? cd.coh[k] : 0).toFixed(2)}`} /><Cbar lo={es ? '←' : '←'} hi="→" ramp={[rgbCss(vik(-60, 60)), rgbCss(vik(0, 60)), rgbCss(vik(60, 60))]} unit={`${compUnit} ±60`} /></>}</Panel> },
    { id: 'anom', label: es ? 'Anomalía (AE)' : 'Anomaly (AE)', content: <Panel t={es ? 'Mapa de anomalía — error de reconstrucción del autoencoder convolucional (no supervisado)' : 'Anomaly map — convolutional-autoencoder reconstruction error (unsupervised)'}>{loadingMap || <><FieldMap W={W} H={H} colorAt={anomColor} sel={sel} onPick={(x, y) => setSel({ x, y })} readout={(x, y, k) => `${x},${y} · ${es ? 'anomalía' : 'anomaly'} ${(anomN ? anomN.norm[k] : 0).toFixed(2)}`} /><Cbar lo="normal" hi={es ? 'anómalo' : 'anomalous'} ramp={[rgbCss(batlow(0)), rgbCss(batlow(0.5)), rgbCss(batlow(1))]} unit={es ? 'percentil' : 'percentile'} /></>}</Panel> },
    { id: 'class', label: es ? 'Clase (CNN)' : 'Class (CNN)', content: <Panel t={es ? 'Mapa de clase de deformación — clasificador CNN 1-D por píxel (6 clases)' : 'Deformation-class map — 1-D CNN per-pixel classifier (6 classes)'}>{loadingMap || <><FieldMap W={W} H={H} colorAt={classColor} sel={sel} onPick={(x, y) => setSel({ x, y })} readout={(x, y, k) => `${x},${y} · ${CLS[cd ? Math.round(cd.classMap[k]) : 0]}`} /><ClassLegend cls={CLS} /></>}</Panel> },
    { id: 'lat', label: es ? 'Espacio latente' : 'Latent space', content: <Panel t={es ? 'Espacio latente del AE (UMAP) para este caso — la representación aprendida, por clase' : 'AE latent space (UMAP) for this case — the learned representation, by class'}><LatentScatter pts={caseInfo.latent} names={CLS} /><ClassLegend cls={CLS} /></Panel> },
    { id: 'series', label: es ? 'Serie + ajuste' : 'Series + fit', content: <Panel t={es ? 'Desplazamiento vertical (Up) acumulado (mm) del píxel — negativo = hundimiento' : 'Cumulative vertical (Up) displacement (mm) at the pixel — negative = subsiding'}><UPlotChart data={tsData} build={buildTs} height={200} /><p className="tw-hint">{es ? 'Clic en cualquier mapa para inspeccionar otro píxel.' : 'Click any map to inspect another pixel.'}</p></Panel> },
    { id: 'iv', label: es ? 'Velocidad inversa' : 'Inverse velocity', content: <Panel t={es ? 'Velocidad inversa 1/|v| (Fukuzono) — el ajuste lineal proyecta el tiempo de falla' : 'Inverse velocity 1/|v| (Fukuzono) — the linear fit projects the failure time'}><UPlotChart data={ivData} build={buildIv} height={200} /></Panel> },
    { id: 'coh', label: es ? 'Coherencia' : 'Coherence', content: <Panel t={es ? 'Coherencia temporal media — calidad interferométrica (baja en agua/playa)' : 'Mean temporal coherence — interferometric quality (low over water/beach)'}>{loadingMap || <><FieldMap W={W} H={H} colorAt={cohColor} sel={sel} onPick={(x, y) => setSel({ x, y })} readout={(x, y, k) => `${x},${y} · coh ${(cd ? cd.coh[k] : 0).toFixed(2)}`} /><Cbar lo={es ? 'incoherente' : 'incoherent'} hi={es ? 'coherente' : 'coherent'} ramp={[rgbCss(batlow(0)), rgbCss(batlow(0.5)), rgbCss(batlow(1))]} unit="0–1" /></>}</Panel> },
    { id: 'cum', label: es ? 'Acumulado (tiempo)' : 'Cumulative (time)', content: <Panel t={`${es ? 'Desplazamiento acumulado, época' : 'Cumulative displacement, epoch'} ${epoch + 1}/${nEp} (${es ? 'día' : 'day'} ${days[epoch].toFixed(0)})`}>{loadingMap || <><FieldMap W={W} H={H} colorAt={cumColor} sel={sel} onPick={(x, y) => setSel({ x, y })} mask={maskCoh ? lowCoh : undefined} readout={(x, y, k) => `${x},${y} · ${(cd ? cd.cumUp[epoch * W * H + k] / m.cumScale : 0).toFixed(1)} mm`} /><input className="range" type="range" min={0} max={nEp - 1} value={epoch} onChange={(e) => setEpoch(+e.target.value)} style={{ width: '100%', marginTop: '0.4rem' }} /><Cbar lo={es ? '← hundimiento' : '← subsiding'} hi={es ? 'alza →' : 'uplift →'} ramp={[rgbCss(vik(-80, 80)), rgbCss(vik(0, 80)), rgbCss(vik(80, 80))]} unit="mm ±80" /></>}</Panel> },
    { id: 'roc', label: es ? 'Benchmark ROC' : 'ROC benchmark', content: <Panel t={es ? 'Detección de falla en escenas HELD-OUT — aprendido (AE) vs clásico (|velocidad|)' : 'Failure detection on HELD-OUT scenes — learned (AE) vs classical (|velocity|)'}><UPlotChart data={rocData} build={buildRoc} height={300} /><p className="tw-note">{es ? `Honesto: el baseline |v| (AUC ${b.velAuc}) supera al AE (AUC ${b.aeAuc}) porque las fallas simuladas tienen firma de velocidad. El valor aprendido es la clasificación de tipo + la anomalía sin etiquetas.` : `Honest: the |v| baseline (AUC ${b.velAuc}) beats the AE (AUC ${b.aeAuc}) because the simulated failures carry a velocity signature. The learned value is the type classification + label-free anomaly.`}</p></Panel> },
    { id: 'conf', label: es ? 'Matriz de confusión' : 'Confusion matrix', content: <Panel t={`${es ? 'Matriz de confusión del CNN (held-out)' : 'CNN confusion matrix (held-out)'} — macro-F1 ${b.macroF1}`}><Confusion m={b.confusion} names={CLS} /></Panel> },
  ];

  return (
    <div className="page-body tw-layout">
      <aside className="tw-side">
        <div className="tw-ctl"><span className="tw-ctl-lbl">{es ? 'Caso' : 'Case'}</span>
          <div className="tw-chips">{m.cases.map((c) => <button key={c.id} className={`chip ${caseId === c.id ? 'on' : ''}`} onClick={() => { setCaseId(c.id); }} title={es ? c.es : c.en}>{(es ? c.es : c.en).split(/[ →]/)[0]}</button>)}</div>
          <span className="tw-hint">{es ? caseInfo.es : caseInfo.en}</span>
        </div>
        <div className="tw-ctl"><span className="tw-ctl-lbl">{es ? 'Componente' : 'Component'}</span>
          <div className="tw-seg">{COMPS.map((c) => <button key={c} className={`chip ${comp === c ? 'on' : ''}`} onClick={() => setComp(c)}>{COMP[c].split(' (')[0]}</button>)}</div>
        </div>
        <div className="tw-diag" data-alarm={alarm.level}>
          <div className="tw-diag-top"><strong>TARP {alarm.level.toUpperCase()}</strong><span className="tw-hint">{es ? alarm.reasonEs : alarm.reason}</span></div>
          <Gauge title={es ? 'Velocidad |Up| (mm/yr)' : '|Up| velocity (mm/yr)'} value={Math.abs(velUp)} max={120} zones={[{ upTo: 30, color: '#3fb950' }, { upTo: 60, color: '#58a6ff' }, { upTo: 100, color: '#d29922' }, { upTo: 120, color: '#f85149' }]} />
        </div>
        <div className="tw-diag">
          <div className="tw-read">
            <span className="k">{es ? 'Píxel' : 'Pixel'}</span><span className="v">{sel.x},{sel.y}</span>
            <span className="k">{es ? 'Velocidad' : 'Velocity'} ({comp})</span><span className="v">{vel.toFixed(1)} mm/yr</span>
            <span className="k">{es ? 'Clase (CNN)' : 'Class (CNN)'}</span><span className="v" style={{ color: ALARM_C[alarm.level] }}>{CLS[cnnClass]}{cnnProbs ? ` ${(Math.max(...cnnProbs) * 100).toFixed(0)}%` : ''}</span>
            <span className="k">{es ? 'Anomalía' : 'Anomaly'}</span><span className="v">{(anomN ? anomN.norm[i] : 0).toFixed(2)}</span>
            <span className="k">{es ? 'Coherencia' : 'Coherence'}</span><span className="v">{(cd ? cd.coh[i] : 0).toFixed(2)}</span>
            <span className="k">{es ? 'Falla proy.' : 'Proj. failure'}</span><span className="v">{iv && iv.credible && daysToFail != null ? `${daysToFail.toFixed(0)} d` : '—'}</span>
          </div>
        </div>
        <label className="tw-ctl tw-check"><input type="checkbox" checked={maskCoh} onChange={(e) => setMaskCoh(e.target.checked)} /> {es ? 'Máscara de coherencia' : 'Coherence mask'}</label>
        <p className="tw-note">{es ? 'Datos SINTÉTICOS físicamente fundados (formato LiCSBAS); modelos entrenados offline, inferencia ONNX en vivo. NO es un sistema de alarma certificado.' : 'SYNTHETIC physics-grounded data (LiCSBAS format); models trained offline, live ONNX inference. NOT a certified alarm system.'}</p>
      </aside>
      <div className="tw-main"><Tabs tabs={tabs} ariaLabel="methods" /></div>
    </div>
  );
}

function Panel({ t, children }: { t: string; children: ReactNode }) { return <div className="tw-plot"><div className="tw-plot-t">{t}</div>{children}</div>; }
function Cbar({ lo, hi, ramp, unit }: { lo: string; hi: string; ramp: string[]; unit: string }) { return <div className="tw-legend"><span>{lo}</span><span className="tw-cbar" style={{ background: `linear-gradient(90deg, ${ramp.join(', ')})` }} /><span>{hi}</span><span className="tw-legend-u muted">{unit}</span></div>; }
function ClassLegend({ cls }: { cls: string[] }) { return <div className="tw-classlegend">{cls.map((c, ci) => <span key={ci}><span className="dot" style={{ background: CLASS_COLORS[ci] }} />{c}</span>)}</div>; }
function Confusion({ m, names }: { m: number[][]; names: string[] }) {
  const rowSums = m.map((r) => r.reduce((a, b) => a + b, 0) || 1);
  return (
    <table className="cmp-table">
      <thead><tr><th className="lo">{'true \\ pred'}</th>{names.map((n, i) => <th key={i}>{n.split(' ')[0]}</th>)}</tr></thead>
      <tbody>{m.map((row, r) => (<tr key={r}><th className="lo">{names[r]}</th>{row.map((v, c) => <td key={c} style={{ background: `color-mix(in oklab, var(--color-accent) ${Math.round((v / rowSums[r]) * 70)}%, transparent)`, fontWeight: r === c ? 700 : 400 }}>{v}</td>)}</tr>))}</tbody>
    </table>
  );
}
