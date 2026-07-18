import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type uPlot from 'uplot';
import { Tabs, useShellLang } from '@fasl-work/caos-app-shell';
import { loadManifest, loadCase, velOf, seriesAt, pctNorm, gridOf, componentsOf, CLASS_COLORS, CLASS_EN, CLASS_ES, COMP_EN, COMP_ES, type Manifest, type CaseData, type CaseInfo, type Component, type Provenance } from '../data/demo';
import { vik, batlow, rgbCss } from '../lib/colormap';
import { inverseVelocity, tarp, conformalInterval } from '../dsp/forecast';
import { classifySeries } from '../lib/ort';
import { FieldMap } from '../viz/FieldMap';
import { LatentScatter } from '../viz/LatentScatter';
import { Gauge } from '../viz/Gauge';
import { UPlotChart } from '../viz/UPlotChart';
import { lineOpts } from '../viz/uplotKit';
import { PanelBoundary } from '../viz/PanelBoundary';

const hexRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const ALARM_C: Record<string, string> = { green: '#3fb950', amber: '#d29922', red: '#f85149' };
const sourceOf = (c: CaseInfo): 'synthetic' | 'real' => c.source ?? 'synthetic';

// Per-tab honesty labels shown in Real mode (see the data-provenance dossier + twlab.science.ingest_real):
//   real   = computed directly on the real Sentinel-1 displacement/coherence
//   assume = uses the real LOS up-vector under a single-geometry vertical-only assumption
//   cross  = synthetic-trained ONNX applied cross-domain (model output, not verified ground truth)
type Honesty = 'real' | 'assume' | 'cross';
const BADGE: Record<string, { kind: Honesty; en: string; es: string }> = {
  vel: { kind: 'assume', en: 'REAL LOS motion; Up = single-geometry vertical assumption', es: 'Movimiento LOS REAL; Up = supuesto vertical de geometria unica' },
  anom: { kind: 'cross', en: 'Synthetic-trained AE on real input (cross-domain)', es: 'AE entrenado en sintetico sobre dato real (cross-domain)' },
  class: { kind: 'cross', en: 'Synthetic-trained CNN on real input (cross-domain)', es: 'CNN entrenada en sintetico sobre dato real (cross-domain)' },
  lat: { kind: 'cross', en: 'Latent of real patches through the synthetic AE (cross-domain)', es: 'Latente de parches reales por el AE sintetico (cross-domain)' },
  series: { kind: 'real', en: 'REAL cumulative displacement (Sentinel-1)', es: 'Desplazamiento acumulado REAL (Sentinel-1)' },
  iv: { kind: 'real', en: 'REAL classical 1/v on real series; projected failure illustrative', es: '1/v clasico REAL sobre serie real; falla proyectada ilustrativa' },
  coh: { kind: 'real', en: 'REAL temporal coherence (LiCSBAS coh_avg)', es: 'Coherencia temporal REAL (coh_avg de LiCSBAS)' },
  cum: { kind: 'real', en: 'REAL per-epoch displacement (Sentinel-1)', es: 'Desplazamiento por epoca REAL (Sentinel-1)' },
};
const BADGE_TXT: Record<Honesty, { en: string; es: string }> = {
  real: { en: 'REAL', es: 'REAL' },
  assume: { en: 'REAL + assumption', es: 'REAL + supuesto' },
  cross: { en: 'Cross-domain model', es: 'Modelo cross-domain' },
};

export default function Tool() {
  const es = useShellLang() === 'es';
  const [m, setM] = useState<Manifest | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { loadManifest().then(setM).catch((e) => setErr(String(e))); }, []);
  if (err) return <div className="page-body"><p className="tw-note">Failed to load artifacts: {err}</p></div>;
  if (!m) return <div className="page-body"><p className="tw-hint">{es ? 'Cargando artefactos del modelo…' : 'Loading model artifacts…'}</p></div>;
  return <PanelBoundary><Workbench m={m} /></PanelBoundary>;
}

function Workbench({ m }: { m: Manifest }) {
  const lang = useShellLang(); const es = lang === 'es';
  const CLS = es ? CLASS_ES : CLASS_EN; const COMP = es ? COMP_ES : COMP_EN;
  const hasReal = m.cases.some((c) => sourceOf(c) === 'real');
  const [source, setSource] = useState<'synthetic' | 'real'>('synthetic');
  const [caseId, setCaseId] = useState(m.cases[0].id);
  const [comp, setComp] = useState<Component>('up');
  const [cd, setCd] = useState<CaseData | null>(null);
  const [sel, setSel] = useState({ x: 80, y: 50 });
  const [maskCoh, setMaskCoh] = useState(true);
  const [epoch, setEpoch] = useState(m.nEp - 1);
  const [cnnProbs, setCnnProbs] = useState<number[] | null>(null);

  const caseInfo = m.cases.find((c) => c.id === caseId)!;
  const grid = useMemo(() => gridOf(m, caseInfo), [m, caseInfo]);
  const { W, H, days, nEp } = grid;
  const comps = componentsOf(caseInfo);
  const isReal = sourceOf(caseInfo) === 'real';
  const cases = m.cases.filter((c) => sourceOf(c) === source);

  // Switching case (or Source) resets the pixel/epoch/component to values valid for the new grid + geometry.
  const pickCase = useCallback((id: string) => {
    const c = m.cases.find((x) => x.id === id)!; const g = gridOf(m, c); const cc = componentsOf(c);
    setCd(null); // synchronously: never render the old case's arrays against the new case's grid indices
    setCaseId(id); setSel({ x: Math.floor(g.W / 2), y: Math.floor(g.H / 2) }); setEpoch(g.nEp - 1);
    setComp((p) => (cc.includes(p) ? p : cc[0]));
  }, [m]);
  const pickSource = useCallback((s: 'synthetic' | 'real') => {
    if (s === source) return; setSource(s);
    const first = m.cases.find((c) => sourceOf(c) === s); if (first) pickCase(first.id);
  }, [m, source, pickCase]);

  useEffect(() => { let a = true; setCd(null); loadCase(m, caseInfo).then((d) => { if (a) setCd(d); }); return () => { a = false; }; }, [m, caseInfo]);
  useEffect(() => {
    if (!cd) return; let a = true;
    classifySeries(seriesAt(grid, m.cumScale, cd, sel.x, sel.y)).then((p) => { if (a) setCnnProbs(p); }).catch(() => setCnnProbs(null));
    return () => { a = false; };
  }, [grid, m, cd, sel]);

  const i = sel.y * W + sel.x;
  const series = useMemo(() => (cd ? seriesAt(grid, m.cumScale, cd, sel.x, sel.y) : []), [grid, m, cd, sel]);
  const velField = cd ? velOf(cd, comp) : null;
  const vel = velField?.[i] ?? 0;
  const velUp = cd?.velUp[i] ?? 0;
  // The failure forecast runs on a coherence-masked 5x5 PATCH MEAN around the pixel (spatial averaging is
  // standard InSAR forecasting practice, Carla et al.), which suppresses per-pixel noise so the inverse-
  // velocity fit is credible on a deforming area. The single-pixel series stays on the Series + fit tab.
  const fcSeries = useMemo(() => {
    if (!cd) return series;
    const R = 2; const out = new Array(m.nEp).fill(0); let cnt = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const x = sel.x + dx, y = sel.y + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const k = y * W + x; if (cd.coh[k] < 0.4) continue;
      for (let ep = 0; ep < m.nEp; ep++) out[ep] += cd.cumUp[ep * W * H + k] / m.cumScale;
      cnt++;
    }
    return cnt ? out.map((v) => v / cnt) : series;
  }, [cd, m, sel, W, H, series]);
  const iv = useMemo(() => (fcSeries.length ? inverseVelocity(fcSeries, days) : null), [fcSeries, days]);
  const lastDay = days[days.length - 1];
  const daysToFail = iv && iv.tFail != null && iv.credible ? iv.tFail - lastDay : null;
  // NOVEL beyond-SOTA: split-conformal prediction interval on t_f, calibrated per lead-time on the MC bank.
  const conf = useMemo(() => (iv && iv.tFail != null && iv.credible ? conformalInterval(iv.tFail, lastDay, m.forecast?.conformal ?? null) : null), [iv, lastDay, m]);
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
  const compUnit = comp === 'east' ? (es ? 'Este mm/yr' : 'East mm/yr') : comp === 'up' ? (es ? 'Up mm/yr' : 'Up mm/yr') : `LOS ${comp} mm/yr`;
  const loadingMap = !cd ? <p className="tw-hint">{es ? 'Cargando caso…' : 'Loading case…'}</p> : null;
  // In Real mode, every tab carries an honesty badge (real / real+assumption / cross-domain), per the (c)/(d) table.
  const rb = (id: string) => (isReal ? <HonestyBadge id={id} es={es} /> : undefined);

  const tabs = [
    { id: 'vel', label: es ? 'Velocidad' : 'Velocity', content: <Panel badge={rb('vel')} t={`${es ? 'Velocidad de deformación' : 'Deformation velocity'}, ${COMP[comp]} (mm/yr)`}>{loadingMap || <><FieldMap W={W} H={H} colorAt={velColor} sel={sel} onPick={(x, y) => setSel({ x, y })} mask={maskCoh ? lowCoh : undefined} readout={(x, y, k) => `${x},${y} · ${(velField?.[k] ?? 0).toFixed(1)} mm/yr · coh ${(cd?.coh[k] ?? 0).toFixed(2)}`} /><Cbar lo={es ? '←' : '←'} hi="→" ramp={[rgbCss(vik(-60, 60)), rgbCss(vik(0, 60)), rgbCss(vik(60, 60))]} unit={`${compUnit} ±60`} /></>}</Panel> },
    { id: 'anom', label: es ? 'Anomalía (AE)' : 'Anomaly (AE)', content: <Panel badge={rb('anom')} t={es ? 'Mapa de anomalía, error de reconstrucción del autoencoder convolucional (no supervisado)' : 'Anomaly map, convolutional-autoencoder reconstruction error (unsupervised)'}>{loadingMap || <><FieldMap W={W} H={H} colorAt={anomColor} sel={sel} onPick={(x, y) => setSel({ x, y })} readout={(x, y, k) => `${x},${y} · ${es ? 'anomalía' : 'anomaly'} ${(anomN?.norm[k] ?? 0).toFixed(2)}`} /><Cbar lo="normal" hi={es ? 'anómalo' : 'anomalous'} ramp={[rgbCss(batlow(0)), rgbCss(batlow(0.5)), rgbCss(batlow(1))]} unit={es ? 'percentil' : 'percentile'} /></>}</Panel> },
    { id: 'class', label: es ? 'Clase (CNN)' : 'Class (CNN)', content: <Panel badge={rb('class')} t={es ? 'Mapa de clase de deformación, clasificador CNN 1-D por píxel (6 clases)' : 'Deformation-class map, 1-D CNN per-pixel classifier (6 classes)'}>{loadingMap || <><FieldMap W={W} H={H} colorAt={classColor} sel={sel} onPick={(x, y) => setSel({ x, y })} readout={(x, y, k) => `${x},${y} · ${CLS[cd ? Math.round(cd.classMap[k]) : 0]}`} /><ClassLegend cls={CLS} /></>}</Panel> },
    { id: 'lat', label: es ? 'Espacio latente' : 'Latent space', content: <Panel badge={rb('lat')} t={es ? 'Espacio latente del AE (UMAP) para este caso, la representación aprendida, por clase' : 'AE latent space (UMAP) for this case, the learned representation, by class'}><LatentScatter pts={caseInfo.latent} names={CLS} /><ClassLegend cls={CLS} /></Panel> },
    { id: 'series', label: es ? 'Serie + ajuste' : 'Series + fit', content: <Panel badge={rb('series')} t={es ? 'Desplazamiento vertical (Up) acumulado (mm) del píxel, negativo = hundimiento' : 'Cumulative vertical (Up) displacement (mm) at the pixel, negative = subsiding'}><UPlotChart data={tsData} build={buildTs} height={200} /><p className="tw-hint">{es ? 'Clic en cualquier mapa para inspeccionar otro píxel.' : 'Click any map to inspect another pixel.'}</p></Panel> },
    { id: 'iv', label: es ? 'Velocidad inversa' : 'Inverse velocity', content: <Panel badge={rb('iv')} t={es ? 'Velocidad inversa 1/|v| (Fukuzono), el ajuste lineal proyecta el tiempo de falla' : 'Inverse velocity 1/|v| (Fukuzono), the linear fit projects the failure time'}><UPlotChart data={ivData} build={buildIv} height={200} />
      {conf ? (
        <p className="tw-hint"><b>{es ? 'Intervalo conformal (propuesta novel)' : 'Conformal interval (novel proposal)'}:</b> {es ? 'falla en' : 'failure in'} <b className="mono">{(iv!.tFail! - lastDay).toFixed(0)} d</b>, {es ? 'rango' : 'range'} <span className="mono">[{(conf.lo - lastDay).toFixed(0)}, {(conf.hi - lastDay).toFixed(0)}] d</span> {es ? 'a' : 'at'} {Math.round((m.forecast!.conformal!.nominal) * 100)}% {es ? 'conformal split (Vovk et al.)' : 'split-conformal (Vovk et al.)'}{conf.coverage != null ? `, ${es ? 'cobertura medida' : 'measured coverage'} ${Math.round(conf.coverage * 100)}%` : ''}. {es ? 'Calibrado en escenas sintéticas; en datos reales es un prior (cambio de dominio).' : 'Calibrated on synthetic scenes; on real data it is a prior (distribution shift).'}</p>
      ) : (iv && !iv.credible ? <p className="tw-hint">{es ? 'Sin tendencia acelerante creible: no se proyecta tiempo de falla ni intervalo.' : 'No credible accelerating trend: no failure time or interval projected.'}</p> : null)}
    </Panel> },
    { id: 'coh', label: es ? 'Coherencia' : 'Coherence', content: <Panel badge={rb('coh')} t={es ? 'Coherencia temporal media, calidad interferométrica (baja en agua/playa)' : 'Mean temporal coherence, interferometric quality (low over water/beach)'}>{loadingMap || <><FieldMap W={W} H={H} colorAt={cohColor} sel={sel} onPick={(x, y) => setSel({ x, y })} readout={(x, y, k) => `${x},${y} · coh ${(cd?.coh[k] ?? 0).toFixed(2)}`} /><Cbar lo={es ? 'incoherente' : 'incoherent'} hi={es ? 'coherente' : 'coherent'} ramp={[rgbCss(batlow(0)), rgbCss(batlow(0.5)), rgbCss(batlow(1))]} unit="0–1" /></>}</Panel> },
    { id: 'cum', label: es ? 'Acumulado (tiempo)' : 'Cumulative (time)', content: <Panel badge={rb('cum')} t={`${es ? 'Desplazamiento acumulado, época' : 'Cumulative displacement, epoch'} ${epoch + 1}/${nEp} (${es ? 'día' : 'day'} ${(days[Math.min(epoch, days.length - 1)] ?? 0).toFixed(0)})`}>{loadingMap || <><FieldMap W={W} H={H} colorAt={cumColor} sel={sel} onPick={(x, y) => setSel({ x, y })} mask={maskCoh ? lowCoh : undefined} readout={(x, y, k) => `${x},${y} · ${((cd?.cumUp[epoch * W * H + k] ?? 0) / m.cumScale).toFixed(1)} mm`} /><input className="range" type="range" min={0} max={nEp - 1} value={epoch} onChange={(e) => setEpoch(+e.target.value)} style={{ width: '100%', marginTop: '0.4rem' }} /><Cbar lo={es ? '← hundimiento' : '← subsiding'} hi={es ? 'alza →' : 'uplift →'} ramp={[rgbCss(vik(-80, 80)), rgbCss(vik(0, 80)), rgbCss(vik(80, 80))]} unit="mm ±80" /></>}</Panel> },
    // The held-out ROC + confusion matrix are cross-case (aggregate) views that do NOT react to the case selector,
    // so per the archetype design rule they live on the Benchmark page (which already renders them), not the App.
  ];

  return (
    <div className="page-body tw-layout">
      <aside className="tw-side">
        {hasReal && (
          <div className="tw-ctl"><span className="tw-ctl-lbl">{es ? 'Fuente' : 'Source'}</span>
            <div className="tw-seg tw-source">
              <button className={`chip ${source === 'synthetic' ? 'on' : ''}`} onClick={() => pickSource('synthetic')}>{es ? 'Sintético' : 'Synthetic'}</button>
              <button className={`chip ${source === 'real' ? 'on' : ''}`} onClick={() => pickSource('real')}>{es ? 'Muestra real' : 'Real sample'}</button>
            </div>
            <span className="tw-hint">{source === 'real'
              ? (es ? 'InSAR Sentinel-1 real (LiCSAR/LiCSBAS); los controles de escenario se desactivan, solo eliges la muestra.' : 'Real Sentinel-1 InSAR (LiCSAR/LiCSBAS); scenario knobs disabled, you only pick the sample.')
              : (es ? 'Simulación InSAR sintética; ajusta el escenario/régimen.' : 'Synthetic InSAR simulation; adjust the scenario/regime.')}</span>
          </div>
        )}
        <div className="tw-ctl"><span className="tw-ctl-lbl">{source === 'real' ? (es ? 'Muestra real' : 'Real sample') : (es ? 'Caso' : 'Case')}</span>
          <div className="tw-chips">{cases.map((c) => <button key={c.id} className={`chip ${caseId === c.id ? 'on' : ''}`} onClick={() => pickCase(c.id)} title={es ? c.es : c.en}>{(es ? c.es : c.en).split(/[ →:]/)[0]}</button>)}</div>
          <span className="tw-hint">{es ? caseInfo.es : caseInfo.en}</span>
        </div>
        {isReal && caseInfo.provenance && <ProvenancePanel p={caseInfo.provenance} es={es} />}
        <div className="tw-ctl"><span className="tw-ctl-lbl">{es ? 'Componente' : 'Component'}{isReal ? <span className="tw-hint" style={{ marginLeft: '0.4rem' }}>{es ? '(geometría única)' : '(single geometry)'}</span> : null}</span>
          <div className="tw-seg">{comps.map((c) => <button key={c} className={`chip ${comp === c ? 'on' : ''}`} onClick={() => setComp(c)}>{COMP[c].split(' (')[0]}</button>)}</div>
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
            <span className="k">{es ? 'Anomalía' : 'Anomaly'}</span><span className="v">{(anomN?.norm[i] ?? 0).toFixed(2)}</span>
            <span className="k">{es ? 'Coherencia' : 'Coherence'}</span><span className="v">{(cd?.coh[i] ?? 0).toFixed(2)}</span>
            <span className="k">{es ? 'Falla proy.' : 'Proj. failure'}</span><span className="v">{iv && iv.credible && daysToFail != null ? `${daysToFail.toFixed(0)} d` : ', '}</span>
          </div>
        </div>
        <label className="tw-ctl tw-check"><input type="checkbox" checked={maskCoh} onChange={(e) => setMaskCoh(e.target.checked)} /> {es ? 'Máscara de coherencia' : 'Coherence mask'}</label>
        <p className="tw-note">{isReal
          ? (es ? 'Sentinel-1 InSAR REAL (LiCSAR/LiCSBAS, geometría descendente): velocidad, coherencia y serie acumulada son reales; anomalía/clase/latente son el modelo sintético aplicado cross-domain (no verdad de terreno); el pronóstico de falla es ilustrativo. NO es un sistema de alarma certificado.' : 'REAL Sentinel-1 InSAR (LiCSAR/LiCSBAS, descending): velocity, coherence and cumulative series are real; anomaly/class/latent are the synthetic model applied cross-domain (not ground truth); the failure forecast is illustrative. NOT a certified alarm system.')
          : (es ? 'Datos SINTÉTICOS físicamente fundados (formato LiCSBAS); modelos entrenados offline, inferencia ONNX en vivo. NO es un sistema de alarma certificado.' : 'SYNTHETIC physics-grounded data (LiCSBAS format); models trained offline, live ONNX inference. NOT a certified alarm system.')}</p>
      </aside>
      <div className="tw-main"><Tabs tabs={tabs.map((t) => ({ ...t, content: <PanelBoundary key={`${source}-${caseId}-${t.id}`} lang={es ? 'es' : 'en'}>{t.content}</PanelBoundary> }))} ariaLabel="methods" /></div>
    </div>
  );
}

function Panel({ t, badge, children }: { t: string; badge?: ReactNode; children: ReactNode }) { return <div className="tw-plot"><div className="tw-plot-t">{t}{badge}</div>{children}</div>; }
function HonestyBadge({ id, es }: { id: string; es: boolean }) {
  const b = BADGE[id]; if (!b) return null;
  const txt = BADGE_TXT[b.kind];
  return <span className={`tw-badge tw-badge-${b.kind}`} title={es ? b.es : b.en}>{es ? txt.es : txt.en}</span>;
}
function ProvenancePanel({ p, es }: { p: Provenance; es: boolean }) {
  return (
    <div className="tw-diag tw-prov">
      <div className="tw-prov-h">{es ? 'Procedencia (dato real)' : 'Provenance (real data)'}</div>
      <div className="tw-read">
        <span className="k">{es ? 'Fuente' : 'Source'}</span><span className="v">{p.source}</span>
        <span className="k">{es ? 'Marco' : 'Frame'}</span><span className="v">{p.frameId}</span>
        <span className="k">{es ? 'Sitio' : 'Site'}</span><span className="v">{p.site}</span>
        <span className="k">{es ? 'Geometría' : 'Geometry'}</span><span className="v">{p.geometry}</span>
        <span className="k">{es ? 'Fechas' : 'Dates'}</span><span className="v">{p.dates}{p.nEpochsUsed ? ` (${p.nEpochsUsed}${p.nEpochsAvailable ? `/${p.nEpochsAvailable}` : ''} ep)` : ''}</span>
      </div>
      <p className="tw-note tw-attr">{p.attribution}</p>
      <p className="tw-hint">{p.license}</p>
      <ul className="tw-cites">{p.citations.map((c, k) => <li key={k}>{c}</li>)}</ul>
    </div>
  );
}
function Cbar({ lo, hi, ramp, unit }: { lo: string; hi: string; ramp: string[]; unit: string }) { return <div className="tw-legend"><span>{lo}</span><span className="tw-cbar" style={{ background: `linear-gradient(90deg, ${ramp.join(', ')})` }} /><span>{hi}</span><span className="tw-legend-u muted">{unit}</span></div>; }
function ClassLegend({ cls }: { cls: string[] }) { return <div className="tw-classlegend">{cls.map((c, ci) => <span key={ci}><span className="dot" style={{ background: CLASS_COLORS[ci] }} />{c}</span>)}</div>; }
