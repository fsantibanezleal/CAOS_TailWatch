// Horizontal severity gauge with coloured zones + a value needle (the validated RotorVitals gauge).
export function Gauge({ title, value, min = 0, max, unit = '', zones }: {
  title: string; value: number; min?: number; max: number; unit?: string;
  zones: { upTo: number; color: string; label?: string }[];
}) {
  const pct = (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min))) * 100;
  let prev = min;
  return (
    <div className="gauge">
      <div className="gauge-title">{title}</div>
      <div className="gauge-track">
        {zones.map((z, i) => { const left = pct(prev), w = pct(z.upTo) - pct(prev); prev = z.upTo; return <span key={i} className="gauge-zone" style={{ left: `${left}%`, width: `${w}%`, background: z.color }} />; })}
        <span className="gauge-needle" style={{ left: `${pct(value)}%` }} />
      </div>
      <div className="gauge-scale"><span>{min}</span><span className="gauge-val">{value.toFixed(1)} {unit}</span><span>{max}</span></div>
    </div>
  );
}
