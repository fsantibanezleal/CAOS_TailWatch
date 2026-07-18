import { useEffect, useState } from 'react';
import { Refs, useShellLang } from '@fasl-work/caos-app-shell';
import { loadManifest, CLASS_EN, CLASS_ES, type Manifest } from '../data/demo';

export default function Benchmark() {
  const es = useShellLang() === 'es';
  const [demo, setDemo] = useState<Manifest | null>(null);
  useEffect(() => { loadManifest().then(setDemo).catch(() => {}); }, []);
  const CLS = es ? CLASS_ES : CLASS_EN;
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>Benchmark</h1>
        <p className="lede">{es ? 'Métodos aprendidos vs el baseline clásico sobre escenas held-out (sin fuga). Números reales desde los artefactos versionados, sin victorias fabricadas.' : 'Learned methods vs the classical baseline on held-out scenes (no leakage). Real numbers from the versioned artifacts, no fabricated wins.'}</p>
      </div>
      {!demo ? <p className="tw-hint">{es ? 'Cargando resultados…' : 'Loading results…'}</p> : (() => {
        const b = demo.benchmark;
        return (
          <section>
            <div className="tw-stats">
              <Stat v={b.macroF1.toFixed(2)} l={es ? 'macro-F1 (CNN, 6 clases)' : 'macro-F1 (CNN, 6 classes)'} />
              <Stat v={b.aeAuc.toFixed(2)} l={es ? 'AUC anomalía AE' : 'AE anomaly AUC'} />
              <Stat v={b.velAuc.toFixed(2)} l={es ? 'AUC |velocidad| clásico' : 'classical |velocity| AUC'} />
              <Stat v={`${b.heldOut.length}/${b.trainScenes}`} l={es ? 'escenas held-out / train' : 'held-out / train scenes'} />
            </div>

            <h2>{es ? 'Detección de falla, ROC (held-out)' : 'Failure detection, ROC (held-out)'}</h2>
            <RocSVG ae={b.aeRoc} vel={b.velRoc} aeAuc={b.aeAuc} velAuc={b.velAuc} es={es} />
            <p className="tw-note">{es ? `En escenas no vistas el baseline |v| (AUC ${b.velAuc}) supera al AE (AUC ${b.aeAuc}) porque las fallas simuladas tienen firma de velocidad. El valor de los métodos aprendidos no es ganarle a la velocidad en esta tarea, sino dar la clasificación de tipo (abajo) y un puntaje de anomalía sin etiquetas sobre el patrón espacial de velocidad. Capturar anomalías sin firma de velocidad media exigiría un AE espacio-temporal (roadmap): el AE actual lee el mapa de velocidad, así que por diseño no las ve.` : `On unseen scenes the |v| baseline (AUC ${b.velAuc}) beats the AE (AUC ${b.aeAuc}) because the simulated failures carry a velocity signature. The learned methods' value is not beating velocity on this task, but giving the type classification (below) and a label-free anomaly score over the spatial velocity pattern. Catching anomalies with no mean-velocity signature would need a spatio-temporal AE (roadmap): the current AE reads the velocity map, so it cannot see them by design.`}</p>

            <h2>{es ? 'Clasificación, matriz de confusión (held-out)' : 'Classification, confusion matrix (held-out)'}</h2>
            <table className="cmp-table">
              <thead><tr><th className="lo">{'real \\ pred'}</th>{CLS.map((n, i) => <th key={i}>{n.split(' ')[0]}</th>)}<th>{es ? 'recall' : 'recall'}</th></tr></thead>
              <tbody>{b.confusion.map((row, r) => { const sum = row.reduce((a, c) => a + c, 0) || 1; return (
                <tr key={r}><th className="lo">{CLS[r]}</th>{row.map((v, c) => <td key={c} style={{ background: `color-mix(in oklab, var(--color-accent) ${Math.round((v / sum) * 70)}%, transparent)`, fontWeight: r === c ? 700 : 400 }}>{v}</td>)}<td className="mono">{(row[r] / sum * 100).toFixed(0)}%</td></tr>); })}</tbody>
            </table>
            <p className="tw-note">{es ? 'La velocidad da magnitud; el CNN da el tipo, capacidad nueva. Las clases confusables (estable/lineal creep, estacional/decorrelado desde una serie ruidosa de 60 puntos) bajan el macro-F1 honestamente; la diagonal domina en estable/acelerando/escalón.' : 'Velocity gives magnitude; the CNN gives the type, new capability. Confusable classes (stable/linear creep, seasonal/decorrelated from a 60-point noisy series) lower the macro-F1 honestly; the diagonal dominates on stable/accelerating/step.'}</p>
            <Refs ids={['rouetleduc2021', 'zhang2017', 'bouman2025']} label="Refs" />
          </section>
        );
      })()}
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) { return <div className="tw-stat"><div className="tw-stat-v">{v}</div><div className="tw-stat-l">{l}</div></div>; }

function RocSVG({ ae, vel, aeAuc, velAuc, es }: { ae: { fpr: number[]; tpr: number[] }; vel: { fpr: number[]; tpr: number[] }; aeAuc: number; velAuc: number; es: boolean }) {
  const W = 460, H = 380, pad = 46;
  const sx = (f: number) => pad + f * (W - 2 * pad);
  const sy = (t: number) => H - pad - t * (H - 2 * pad);
  const path = (c: { fpr: number[]; tpr: number[] }) => c.fpr.map((f, i) => `${i ? 'L' : 'M'}${sx(f).toFixed(1)},${sy(c.tpr[i]).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: 'block', margin: '0.4rem 0', font: '11px var(--font-sans, sans-serif)' }} role="img" aria-label="ROC">
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (<g key={g}>
        <line x1={sx(g)} y1={sy(0)} x2={sx(g)} y2={sy(1)} stroke="var(--color-border)" strokeWidth="0.5" />
        <line x1={sx(0)} y1={sy(g)} x2={sx(1)} y2={sy(g)} stroke="var(--color-border)" strokeWidth="0.5" />
        <text x={sx(g)} y={H - pad + 16} textAnchor="middle" fill="var(--color-fg-subtle)">{g}</text>
        <text x={pad - 8} y={sy(g) + 4} textAnchor="end" fill="var(--color-fg-subtle)">{g}</text>
      </g>))}
      <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} stroke="#6e7681" strokeWidth="1" strokeDasharray="3 3" />
      <path d={path(vel)} fill="none" stroke="#58a6ff" strokeWidth="2" />
      <path d={path(ae)} fill="none" stroke="#bc8cff" strokeWidth="2" />
      <text x={sx(0.5)} y={H - 8} textAnchor="middle" fill="var(--color-fg-subtle)">{es ? 'tasa de falsos positivos' : 'false-positive rate'}</text>
      <text x={14} y={sy(0.5)} transform={`rotate(-90 14 ${sy(0.5)})`} textAnchor="middle" fill="var(--color-fg-subtle)">{es ? 'tasa de verdaderos positivos' : 'true-positive rate'}</text>
      <g transform={`translate(${sx(0.42)},${sy(0.22)})`}>
        <rect x="-6" y="-14" width="150" height="40" rx="5" fill="var(--color-surface)" stroke="var(--color-border)" />
        <line x1="2" y1="-2" x2="22" y2="-2" stroke="#58a6ff" strokeWidth="2" /><text x="28" y="2" fill="var(--color-fg)">|v| {es ? 'clásico' : 'classical'} · AUC {velAuc}</text>
        <line x1="2" y1="16" x2="22" y2="16" stroke="#bc8cff" strokeWidth="2" /><text x="28" y="20" fill="var(--color-fg)">AE · AUC {aeAuc}</text>
      </g>
    </svg>
  );
}
