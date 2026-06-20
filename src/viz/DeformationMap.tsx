import { useEffect, useRef, useState } from 'react';
import { type Cube } from '../dsp/insar';
import { vik, rgbCss } from '../lib/colormap';

const ZONE = { 0: 'rock', 1: 'dam', 2: 'beach' } as const;

/** LOS-velocity deformation map (vik diverging, zero-centred). Sign convention frozen + on-screen
 * (negative = away/subsiding); low-coherence pixels desaturated, not deleted, with the mask toggleable.
 * Click a pixel to drive the time-series / inverse-velocity panels. */
export function DeformationMap({ cube, sel, onPick, clamp = 120, maskCoh = true, cohThresh = 0.4, lang }: {
  cube: Cube; sel: { x: number; y: number }; onPick: (x: number, y: number) => void;
  clamp?: number; maskCoh?: boolean; cohThresh?: number; lang: 'en' | 'es';
}) {
  const es = lang === 'es';
  const ref = useRef<HTMLCanvasElement>(null);
  const [hov, setHov] = useState<{ px: number; py: number; x: number; y: number } | null>(null);
  const { W, H } = cube;

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const dpr = window.devicePixelRatio || 1; const cw = cv.clientWidth || 600, ch = Math.round((cw * H) / W);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const g = cv.getContext('2d'); if (!g) return; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const off = document.createElement('canvas'); off.width = W; off.height = H; const og = off.getContext('2d'); if (!og) return;
    const img = og.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      let [r, gg, b] = vik(cube.vel[i], clamp);
      if (maskCoh && cube.coh[i] < cohThresh) { const mix = 0.5; r = r * (1 - mix) + 0.16 * mix; gg = gg * (1 - mix) + 0.18 * mix; b = b * (1 - mix) + 0.2 * mix; }
      const o = i * 4; img.data[o] = r * 255; img.data[o + 1] = gg * 255; img.data[o + 2] = b * 255; img.data[o + 3] = 255;
    }
    og.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = false; g.clearRect(0, 0, cw, ch); g.drawImage(off, 0, 0, cw, ch);
    // selected-pixel marker
    const sxp = ((sel.x + 0.5) / W) * cw, syp = ((sel.y + 0.5) / H) * ch;
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.beginPath(); g.arc(sxp, syp, 6, 0, 7); g.stroke();
    g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.arc(sxp, syp, 7.5, 0, 7); g.stroke();
  }, [cube, sel, clamp, maskCoh, cohThresh, W, H]);

  const toPix = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = ref.current!; const rect = cv.getBoundingClientRect();
    const x = Math.max(0, Math.min(W - 1, Math.floor(((e.clientX - rect.left) / rect.width) * W)));
    const y = Math.max(0, Math.min(H - 1, Math.floor(((e.clientY - rect.top) / rect.height) * H)));
    return { x, y, px: e.clientX - rect.left, py: e.clientY - rect.top };
  };

  return (
    <div className="tw-map-wrap" style={{ position: 'relative' }}>
      <canvas ref={ref} style={{ width: '100%', display: 'block', cursor: 'crosshair', borderRadius: 8 }}
        onClick={(e) => { const p = toPix(e); onPick(p.x, p.y); }}
        onMouseMove={(e) => setHov(toPix(e))} onMouseLeave={() => setHov(null)} />
      {hov && (() => { const i = hov.y * W + hov.x; return (
        <div className="tw-readout" style={{ left: Math.min(hov.px + 10, 240), top: Math.max(2, hov.py - 6) }}>
          {hov.x},{hov.y} · {cube.vel[i].toFixed(1)} mm/yr · coh {cube.coh[i].toFixed(2)} · {ZONE[cube.zone[i] as 0 | 1 | 2]}
        </div>); })()}
      {/* sign-convention legend + colorbar */}
      <div className="tw-legend">
        <span className="tw-legend-l">{es ? '← alejándose / hundimiento' : '← away / subsiding'}</span>
        <span className="tw-cbar" style={{ background: `linear-gradient(90deg, ${rgbCss(vik(-clamp, clamp))}, ${rgbCss(vik(0, clamp))}, ${rgbCss(vik(clamp, clamp))})` }} />
        <span className="tw-legend-r">{es ? 'acercándose / alza →' : 'toward / uplift →'}</span>
        <span className="tw-legend-u muted">LOS mm/yr · ±{clamp}</span>
      </div>
    </div>
  );
}
