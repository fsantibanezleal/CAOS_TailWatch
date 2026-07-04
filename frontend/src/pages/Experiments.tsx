import { useEffect, useState } from 'react';
import { Refs, useShellLang } from '@fasl-work/caos-app-shell';
import { loadManifest, CLASS_EN, CLASS_ES, type Manifest } from '../data/demo';

export default function Experiments() {
  const es = useShellLang() === 'es';
  const [m, setM] = useState<Manifest | null>(null);
  useEffect(() => { loadManifest().then(setM).catch(() => {}); }, []);
  const CLS = es ? CLASS_ES : CLASS_EN;

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Experimentos' : 'Experiments'}</h1>
        <p className="lede">{es ? 'El diseño experimental honesto, ILUSTRADO: el split sin fuga, la cobertura de casos × clases, y el experimento de pronóstico por velocidad inversa con sus resultados reales.' : 'The honest experimental design, ILLUSTRATED: the leakage-safe split, the case × class coverage, and the inverse-velocity forecasting experiment with its real results.'}</p>
      </div>
      <section>
        <h2>{es ? 'Protocolo sin fuga (split por escena)' : 'Leakage-safe protocol (split by scene)'}</h2>
        <p>{es ? '20 escenas con verdad de terreno etiquetada se separan POR ESCENA: 16 para entrenar, 4 held-out para evaluar. Nunca por píxel aleatorio, los píxeles vecinos comparten la misma realización de APS y error-DEM, lo que filtraría. El autoencoder se entrena solo con parches NORMALES.' : '20 scenes with labelled ground truth are split BY SCENE: 16 to train, 4 held-out to evaluate. Never random per pixel, neighbouring pixels share the same APS and DEM-error realisation, which would leak. The autoencoder trains on NORMAL patches only.'}</p>
        <SplitSVG es={es} />

        <h2>{es ? 'Cobertura de casos × clases' : 'Case × class coverage'}</h2>
        <p>{es ? 'Cinco casos configurables cubren el rango de comportamientos; cada escena contiene además las clases de fondo (playa estacional, agua decorrelada, roca estable), así que los modelos ven las 6 clases. ✓ = la clase domina la presa en ese caso.' : 'Five configurable cases cover the behaviour range; each scene also contains the background classes (seasonal beach, decorrelated water, stable rock), so the models see all 6 classes. ✓ = the class dominates the dam in that case.'}</p>
        <CoverageMatrix cls={CLS} es={es} />

        <h2>{es ? 'Experimento: pronóstico por velocidad inversa' : 'Experiment: inverse-velocity forecasting'}</h2>
        {!m ? <p className="tw-hint">{es ? 'Cargando resultados…' : 'Loading results…'}</p> : (() => {
          const f = m.forecast;
          return (<>
            <div className="tw-stats">
              <Stat v={`${(f.detectRate * 100).toFixed(0)}%`} l={es ? `detección de falla (n=${f.nTraj})` : `failure detection (n=${f.nTraj})`} />
              <Stat v={`${f.medErrPct}%`} l={es ? 'error mediano de t_f' : 'median t_f error'} />
              <Stat v={`${f.leadCurve.filter((b) => b.medErr != null)[0]?.medErr != null ? (f.leadCurve.find((b) => b.lo === 0)!.medErr! * 100).toFixed(1) : ', '}%`} l={es ? 'error a <40 días de la falla' : 'error <40 days to failure'} />
              {f.falseAlarmRate != null && f.nControl != null
                ? <Stat v={`${(f.falseAlarmRate * 100).toFixed(0)}%`} l={es ? `falsas alarmas (n=${f.nControl} controles)` : `false alarms (n=${f.nControl} controls)`} />
                : <Stat v={'4'} l={es ? 'escenas held-out' : 'held-out scenes'} />}
            </div>
            <LeadChart f={f} es={es} />
            <p className="tw-note">{es ? `Sobre ${f.nTraj} escenas acelerantes no vistas, la velocidad inversa (Fukuzono) recupera el tiempo de falla al ${f.medErrPct}% mediano, PERO la exactitud depende del adelanto, su firma distintiva: cae a ~2% dentro de 40 días de la falla y se ensancha lejos. Un pronóstico accionable solo emerge a medida que la falla se acerca. La serie se promedia en un parche + se filtra en el tiempo (el APS es el ruido #1 del InSAR).` : `Over ${f.nTraj} unseen accelerating scenes, inverse velocity (Fukuzono) recovers the failure time to ${f.medErrPct}% median, BUT accuracy is lead-time-dependent, its hallmark: it falls to ~2% within 40 days of failure and widens far out. An actionable forecast only emerges as failure approaches. The series is patch-averaged + temporally filtered (APS is the #1 InSAR noise).`}</p>
            {f.falseAlarmRate != null && f.nControl != null && (
              <p className="tw-note">{es
                ? `Control de falsas alarmas: ${f.nControl} escenas NO fallantes (estable / asentamiento lineal / estacional, 20 semillas cada una) pasan por el MISMO detector de velocidad inversa; ${(f.falseAlarmRate * 100).toFixed(0)}% dispara un tiempo de falla finito (${f.controlRegimes ? Object.entries(f.controlRegimes).map(([r, c]) => `${r} ${c.falseAlarms}/${c.n}`).join(', ') : ''}). Esto REEMPLAZA el artefacto forecast-benchmark.json degenerado (180 trayectorias reclamadas, 3 tuplas únicas, sin generador) que antes respaldaba solo la afirmación de cero falsas alarmas (issue #24).`
                : `False-alarm control: ${f.nControl} NON-failing scenes (stable / linear settling / seasonal, 20 seeds each) pass through the SAME inverse-velocity detector; ${(f.falseAlarmRate * 100).toFixed(0)}% fire a finite failure time (${f.controlRegimes ? Object.entries(f.controlRegimes).map(([r, c]) => `${r} ${c.falseAlarms}/${c.n}`).join(', ') : ''}). This REPLACES the degenerate forecast-benchmark.json (180 claimed trajectories, 3 unique tuples, no generator) that formerly backed the zero-false-alarm claim alone (issue #24).`}</p>
            )}
            <Refs ids={['fukuzono1985', 'carla2017', 'grebby2021']} label="Refs" />
          </>);
        })()}
      </section>
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) { return <div className="tw-stat"><div className="tw-stat-v">{v}</div><div className="tw-stat-l">{l}</div></div>; }

function SplitSVG({ es }: { es: boolean }) {
  return (
    <svg viewBox="0 0 600 130" width="100%" style={{ maxWidth: 600, display: 'block', margin: '0.5rem 0', font: '11px var(--font-sans, sans-serif)' }} role="img" aria-label={es ? 'Split por escena' : 'Split by scene'}>
      {Array.from({ length: 20 }, (_, i) => { const train = i < 16; const x = 14 + (i % 10) * 56; const y = 20 + Math.floor(i / 10) * 40; return (
        <g key={i}><rect x={x} y={y} width="44" height="30" rx="5" fill={train ? 'color-mix(in oklab, var(--color-accent) 22%, var(--color-surface))' : 'color-mix(in oklab, #d29922 30%, var(--color-surface))'} stroke="var(--color-border)" />
          <text x={x + 22} y={y + 19} textAnchor="middle" fill="var(--color-fg)" fontSize="10">s{i + 1}</text></g>); })}
      <text x="14" y="115" fill="var(--color-fg-subtle)"><tspan fill="var(--color-accent)">■</tspan> {es ? '16 entrenamiento' : '16 train'}   <tspan fill="#d29922">■</tspan> {es ? '4 held-out (evaluación)' : '4 held-out (evaluation)'}, {es ? 'split por ESCENA, sin fuga espacial' : 'split by SCENE, no spatial leakage'}</text>
    </svg>
  );
}

function CoverageMatrix({ cls, es }: { cls: string[]; es: boolean }) {
  const cases = es
    ? [['Presa acelerando', 2], ['Control estable', 0], ['Estacional', 3], ['Escalón', 4], ['Creep lineal', 1]] as [string, number][]
    : [['Accelerating dam', 2], ['Stable control', 0], ['Seasonal', 3], ['Step', 4], ['Linear creep', 1]] as [string, number][];
  return (
    <table className="cmp-table">
      <thead><tr><th className="lo">{es ? 'Caso \\ clase de presa' : 'Case \\ dam class'}</th>{cls.map((c, i) => <th key={i}>{c.split(' ')[0]}</th>)}</tr></thead>
      <tbody>{cases.map(([name, dom]) => (
        <tr key={name}><th className="lo">{name}</th>{cls.map((_, ci) => <td key={ci} style={{ background: ci === dom ? 'color-mix(in oklab, var(--color-accent) 45%, transparent)' : 'transparent', fontWeight: ci === dom ? 700 : 400 }}>{ci === dom ? '✓' : ''}</td>)}</tr>
      ))}</tbody>
    </table>
  );
}

function LeadChart({ f, es }: { f: { leadCurve: { lo: number; hi: number; n: number; medErr: number | null }[] }; es: boolean }) {
  const buckets = f.leadCurve.filter((b) => b.medErr != null && b.n > 0).slice().reverse(); // far → near
  const W = 560, H = 250, padL = 48, padB = 50, padT = 16, padR = 14;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxE = Math.max(...buckets.map((b) => (b.medErr ?? 0) * 100), 16);
  const bw = plotW / Math.max(buckets.length, 1);
  const yOf = (p: number) => padT + plotH * (1 - p / maxE);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: 'block', margin: '0.4rem 0', font: '12px var(--font-sans, sans-serif)' }} role="img" aria-label={es ? 'Error de t_f vs adelanto' : 't_f error vs lead'}>
      {[0, 5, 10, 15].map((g) => (<g key={g}><line x1={padL} y1={yOf(g)} x2={W - padR} y2={yOf(g)} stroke="var(--color-border)" /><text x={padL - 6} y={yOf(g) + 4} textAnchor="end" fill="var(--color-fg-subtle)">{g}%</text></g>))}
      {buckets.map((b, i) => { const pct = (b.medErr ?? 0) * 100; const x = padL + i * bw + bw * 0.18, w = bw * 0.64, y = yOf(pct); const near = i === buckets.length - 1; return (
        <g key={b.lo}><rect x={x} y={y} width={w} height={padT + plotH - y} rx="3" fill={near ? '#3fb950' : 'var(--color-accent)'} opacity={near ? 1 : 0.55} />
          <text x={x + w / 2} y={y - 5} textAnchor="middle" fill="var(--color-fg)" fontWeight="600">{pct.toFixed(1)}%</text>
          <text x={x + w / 2} y={H - padB + 17} textAnchor="middle" fill="var(--color-fg-subtle)">{b.lo}–{b.hi} d</text></g>); })}
      <text x={padL} y={H - 6} fill="var(--color-fg-subtle)">{es ? '◄ lejos de la falla' : '◄ far from failure'}</text>
      <text x={W - padR} y={H - 6} textAnchor="end" fill="#3fb950" fontWeight="600">{es ? 'cerca de la falla ►' : 'near failure ►'}</text>
    </svg>
  );
}
