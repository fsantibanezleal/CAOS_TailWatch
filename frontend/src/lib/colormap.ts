// Scientific colour maps (after Crameri, Zenodo 10.5281/zenodo.1243862). Diverging `vik` for SIGNED
// quantities (LOS velocity / displacement), used ZERO-CENTRED so the sign is honest; sequential `batlow`-
// like for coherence ∈ [0,1]. Jet/rainbow is deliberately avoided (fabricates false fringe edges, CVD-unsafe).
type RGB = [number, number, number];

function lerp(a: RGB, b: RGB, f: number): RGB { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
function ramp(stops: RGB[], t: number): RGB {
  t = Math.max(0, Math.min(1, t));
  const x = t * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(x));
  return lerp(stops[i], stops[i + 1], x - i);
}

// vik diverging (dark blue → light grey/cream → dark red), approximate control points (0..255 → 0..1).
const VIK: RGB[] = [
  [0.004, 0.098, 0.345], [0.137, 0.302, 0.451], [0.408, 0.541, 0.624], [0.737, 0.788, 0.816],
  [0.871, 0.835, 0.78], [0.78, 0.612, 0.49], [0.643, 0.353, 0.247], [0.451, 0.137, 0.137], [0.235, 0.0, 0.0],
];
// batlow-like sequential (dark blue → teal → green → yellow) for coherence / unsigned magnitude.
const BATLOW: RGB[] = [[0.005, 0.098, 0.349], [0.13, 0.31, 0.43], [0.25, 0.46, 0.42], [0.45, 0.6, 0.32], [0.78, 0.73, 0.27], [0.98, 0.86, 0.55]];

/** vik colour for a signed value v in [-clamp, clamp], zero-centred (v=0 → the neutral mid). */
export function vik(v: number, clamp: number): RGB { return ramp(VIK, (Math.max(-clamp, Math.min(clamp, v)) + clamp) / (2 * clamp || 1)); }
/** sequential colour for t in [0,1]. */
export function batlow(t: number): RGB { return ramp(BATLOW, t); }

export const rgbCss = (c: RGB) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
