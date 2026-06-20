import { useMemo, useState } from 'react';
import { type LatentPt, CLASS_COLORS } from '../data/demo';

// The learned-representation headline: a 2-D UMAP of the conv-AE latent embeddings of velocity patches,
// each point coloured by its centre's deformation class. If the AE learned a useful manifold the failure
// (accelerating / step) patches separate from the normal cluster. Hover reads the class out.
export function LatentScatter({ pts, names }: { pts: LatentPt[]; names: string[] }) {
  const [hi, setHi] = useState<number | null>(null);
  const W = 560, H = 380, pad = 20;
  const { sx, sy } = useMemo(() => {
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    return {
      sx: (x: number) => pad + (x - x0) / ((x1 - x0) || 1) * (W - 2 * pad),
      sy: (y: number) => pad + (1 - (y - y0) / ((y1 - y0) || 1)) * (H - 2 * pad),
    };
  }, [pts]);
  return (
    <div className="tw-map-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: 'block' }} role="img" aria-label="conv-AE latent space (UMAP)">
        {pts.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={hi === i ? 5 : 3} fill={CLASS_COLORS[p.cls]} opacity={0.8}
            onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} style={{ cursor: 'pointer' }} />
        ))}
      </svg>
      {hi !== null && <div className="tw-readout" style={{ left: Math.min(sx(pts[hi].x) + 10, 380), top: Math.max(2, sy(pts[hi].y) - 8) }}>{names[pts[hi].cls]}</div>}
    </div>
  );
}
