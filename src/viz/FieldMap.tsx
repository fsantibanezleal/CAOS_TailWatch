import { useEffect, useRef, useState } from 'react';

// Generic raster map for any H×W field (velocity, AE anomaly, CNN class, coherence). Offscreen-canvas +
// drawImage keeps it dpr-correct on hi-DPI; a colour function maps each cell, an optional coherence mask
// desaturates low-quality pixels (kept, not deleted), hover reads the value out, click drives the panels.
export function FieldMap({ W, H, colorAt, sel, onPick, readout, mask, selColor = '#ffffff' }: {
  W: number; H: number;
  colorAt: (i: number) => [number, number, number];  // 0..1 rgb per cell
  sel?: { x: number; y: number };
  onPick?: (x: number, y: number) => void;
  readout?: (x: number, y: number, i: number) => string;
  mask?: (i: number) => boolean;                       // true = desaturate
  selColor?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hov, setHov] = useState<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = cv.clientWidth || 600, ch = Math.round((cw * H) / W);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const g = cv.getContext('2d'); if (!g) return; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const off = document.createElement('canvas'); off.width = W; off.height = H; const og = off.getContext('2d'); if (!og) return;
    const img = og.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      let [r, gg, b] = colorAt(i);
      if (mask && mask(i)) { const m = 0.55; r = r * (1 - m) + 0.16 * m; gg = gg * (1 - m) + 0.18 * m; b = b * (1 - m) + 0.2 * m; }
      const o = i * 4; img.data[o] = r * 255; img.data[o + 1] = gg * 255; img.data[o + 2] = b * 255; img.data[o + 3] = 255;
    }
    og.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = false; g.clearRect(0, 0, cw, ch); g.drawImage(off, 0, 0, cw, ch);
    if (sel) {
      const sx = ((sel.x + 0.5) / W) * cw, sy = ((sel.y + 0.5) / H) * ch;
      g.strokeStyle = selColor; g.lineWidth = 1.5; g.beginPath(); g.arc(sx, sy, 6, 0, 7); g.stroke();
      g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.arc(sx, sy, 7.5, 0, 7); g.stroke();
    }
  }, [W, H, colorAt, sel, mask, selColor]);

  const toPix = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = ref.current!; const rect = cv.getBoundingClientRect();
    const x = Math.max(0, Math.min(W - 1, Math.floor(((e.clientX - rect.left) / rect.width) * W)));
    const y = Math.max(0, Math.min(H - 1, Math.floor(((e.clientY - rect.top) / rect.height) * H)));
    return { x, y, px: e.clientX - rect.left, py: e.clientY - rect.top };
  };

  return (
    <div className="tw-map-wrap">
      <canvas ref={ref} style={{ width: '100%', display: 'block', cursor: onPick ? 'crosshair' : 'default', borderRadius: 8 }}
        onClick={(e) => { if (onPick) { const p = toPix(e); onPick(p.x, p.y); } }}
        onMouseMove={(e) => setHov(toPix(e))} onMouseLeave={() => setHov(null)} />
      {hov && readout && (
        <div className="tw-readout" style={{ left: Math.min(hov.px + 10, 240), top: Math.max(2, hov.py - 6) }}>{readout(hov.x, hov.y, hov.y * W + hov.x)}</div>
      )}
    </div>
  );
}
