import uPlot from 'uplot';

export interface Comb { base: number; harmonics: number; color: string; label: string }

function vars() {
  const s = getComputedStyle(document.documentElement);
  const g = (k: string, fb: string) => s.getPropertyValue(k).trim() || fb;
  return {
    fg: g('--color-fg', '#c9d1d9'), dim: g('--color-fg-faint', '#6c7785'),
    grid: g('--color-border', '#30363d'), accent: g('--color-accent', '#58a6ff'),
  };
}

/** Base uPlot options for a themed line chart (zoom/pan/crosshair built in).
 * The legend is LIVE: it reads out the (x, y) values at the cursor with units, so hovering a comb
 * (BPFO, fr, …) tells you the exact frequency/amplitude, not just a bare crosshair. */
export function lineOpts(
  width: number, height: number,
  opts: { label: string; color?: string; xUnit?: string; yUnit?: string; xPrec?: number; yPrec?: number; yRange?: [number, number]; dragSetScale?: boolean },
): uPlot.Options {
  const v = vars();
  const c = opts.color || v.accent;
  const xu = opts.xUnit ?? '', yu = opts.yUnit ?? '';
  const fmtX = (val: number | null) => {
    if (val == null) return '--';
    const a = Math.abs(val);
    const s = a >= 1000 ? (val / 1000).toFixed(2) + 'k' : val.toFixed(opts.xPrec ?? (a < 5 ? 4 : 1));
    return xu ? `${s} ${xu}` : s;
  };
  const fmtY = (val: number | null) => {
    if (val == null) return '--';
    const a = Math.abs(val);
    const s = a !== 0 && (a >= 1e4 || a < 1e-2) ? val.toExponential(2) : val.toFixed(opts.yPrec ?? 2);
    return yu ? `${s} ${yu}` : s;
  };
  return {
    width, height,
    scales: { x: { time: false }, y: opts.yRange ? { range: opts.yRange } : {} },
    cursor: { drag: { x: true, y: false, setScale: opts.dragSetScale !== false }, points: { show: true }, focus: { prox: 24 } },
    legend: { show: true, live: true },
    series: [
      { label: xu || 'x', value: (_u, val) => fmtX(val as number | null) },
      { label: opts.label, stroke: c, width: 1.4, points: { show: false }, value: (_u, val) => fmtY(val as number | null) },
    ],
    axes: [
      { stroke: v.dim, grid: { stroke: v.grid, width: 0.5 }, ticks: { stroke: v.grid }, font: '10px ui-monospace, monospace' },
      { stroke: v.dim, grid: { stroke: v.grid, width: 0.5 }, ticks: { stroke: v.grid }, size: 44, font: '10px ui-monospace, monospace' },
    ],
  };
}

/** Vertical harmonic/defect combs (k·base), first harmonic labeled. */
export function combsPlugin(combs: Comb[]): uPlot.Plugin {
  return {
    hooks: {
      draw: (u: uPlot) => {
        const ctx = u.ctx; const r = uPlot.pxRatio; const { top, height } = u.bbox;
        const lo = u.scales.x!.min!, hi = u.scales.x!.max!;
        ctx.save(); ctx.lineWidth = 1 * r;
        for (const cb of combs) {
          if (cb.base <= 0) continue;
          for (let k = 1; k <= cb.harmonics; k++) {
            const fx = cb.base * k; if (fx < lo || fx > hi) continue;
            const px = u.valToPos(fx, 'x', true);
            ctx.strokeStyle = cb.color; ctx.globalAlpha = k === 1 ? 0.9 : 0.4;
            ctx.setLineDash([3 * r, 3 * r]); ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, top + height); ctx.stroke();
            if (k === 1) { ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.fillStyle = cb.color; ctx.font = `${10 * r}px ui-sans-serif, sans-serif`; ctx.fillText(cb.label, px + 3 * r, top + 11 * r); }
          }
        }
        ctx.restore();
      },
    },
  };
}

/** Shaded x-regions (demod band, detection windows). */
export function regionsPlugin(regions: [number, number][], color: string): uPlot.Plugin {
  return {
    hooks: {
      draw: (u: uPlot) => {
        if (!regions.length) return;
        const ctx = u.ctx; const { top, height } = u.bbox;
        ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = 0.13;
        for (const [a, b] of regions) {
          const x1 = u.valToPos(a, 'x', true), x2 = u.valToPos(b, 'x', true);
          ctx.fillRect(x1, top, Math.max(1, x2 - x1), height);
        }
        ctx.restore();
      },
    },
  };
}

/** Band-brush: when the chart is in select mode (dragSetScale:false), a drag emits the selected
 * x-range [lo,hi] (data units) and clears the selection, used to re-pick the demod band → live SES. */
export function selectPlugin(onSelect: (lo: number, hi: number) => void): uPlot.Plugin {
  return {
    hooks: {
      setSelect: (u: uPlot) => {
        if (u.select.width <= 2) return;
        const a = u.posToVal(u.select.left, 'x'), b = u.posToVal(u.select.left + u.select.width, 'x');
        onSelect(Math.max(0, Math.min(a, b)), Math.max(a, b));
        u.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
      },
    },
  };
}

/** Horizontal value bands (e.g. ISO severity zones A/B/C/D) filled from the previous boundary up to
 * each `to`, in data-y units. Right-edge labels. Drawn behind the series. */
export function hbandsPlugin(bands: { to: number; color: string; label?: string }[]): uPlot.Plugin {
  return {
    hooks: {
      drawClear: (u: uPlot) => {
        const ctx = u.ctx; const r = uPlot.pxRatio; const { left, width } = u.bbox;
        const yMin = u.scales.y!.min!, yMax = u.scales.y!.max!;
        ctx.save();
        let prev = yMin;
        for (const bnd of bands) {
          const top = Math.min(bnd.to, yMax), bot = Math.max(prev, yMin);
          if (top > bot) {
            const yT = u.valToPos(top, 'y', true), yB = u.valToPos(bot, 'y', true);
            ctx.fillStyle = bnd.color; ctx.globalAlpha = 0.16; ctx.fillRect(left, yT, width, yB - yT);
            if (bnd.label) { ctx.globalAlpha = 0.9; ctx.fillStyle = bnd.color; ctx.font = `${11 * r}px ui-sans-serif, sans-serif`; ctx.textAlign = 'right'; ctx.fillText(bnd.label, left + width - 4 * r, yT + 12 * r); }
          }
          prev = bnd.to;
        }
        ctx.restore(); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      },
    },
  };
}

/** Horizontal threshold lines (ALERT / DANGER setpoints) at given y values. */
export function hlinesPlugin(lines: { y: number; color: string; label: string }[]): uPlot.Plugin {
  return {
    hooks: {
      draw: (u: uPlot) => {
        const ctx = u.ctx; const r = uPlot.pxRatio; const { left, width } = u.bbox;
        const lo = u.scales.y!.min!, hi = u.scales.y!.max!;
        ctx.save(); ctx.lineWidth = 1.4 * r; ctx.setLineDash([6 * r, 3 * r]);
        for (const ln of lines) {
          if (ln.y < lo || ln.y > hi) continue;
          const py = u.valToPos(ln.y, 'y', true);
          ctx.strokeStyle = ln.color; ctx.beginPath(); ctx.moveTo(left, py); ctx.lineTo(left + width, py); ctx.stroke();
          ctx.setLineDash([]); ctx.fillStyle = ln.color; ctx.font = `${10 * r}px ui-sans-serif, sans-serif`; ctx.fillText(ln.label, left + 4 * r, py - 3 * r); ctx.setLineDash([6 * r, 3 * r]);
        }
        ctx.restore();
      },
    },
  };
}

/** Downward tick markers at given x positions (outliers / detected impulses). */
export function vmarksPlugin(xs: number[], color: string): uPlot.Plugin {
  return {
    hooks: {
      draw: (u: uPlot) => {
        if (!xs.length) return;
        const ctx = u.ctx; const r = uPlot.pxRatio; const { top } = u.bbox;
        const lo = u.scales.x!.min!, hi = u.scales.x!.max!;
        ctx.save(); ctx.fillStyle = color;
        for (const x of xs) {
          if (x < lo || x > hi) continue;
          const px = u.valToPos(x, 'x', true);
          ctx.beginPath(); ctx.moveTo(px - 3 * r, top); ctx.lineTo(px + 3 * r, top); ctx.lineTo(px, top + 6 * r); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      },
    },
  };
}
