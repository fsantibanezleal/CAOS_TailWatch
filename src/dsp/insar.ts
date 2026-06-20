// Synthetic InSAR displacement model — SYNTHETIC, physics-grounded, in the real LiCSBAS sense: a stack of
// cumulative line-of-sight (LOS) displacement rasters (mm) over a Sentinel-1-like 12-day calendar, for a
// tailings-dam scene with a deforming dam zone (3-stage / tertiary creep that accelerates toward a known
// failure time t_f, Fukuzono-consistent), stable bedrock, and a low-coherence wet beach.
//
// Two-geometry model: the true ground motion is a 3-D vector (we model the dominant Vertical + East
// components). Each satellite pass measures only its PROJECTION onto the line of sight. Ascending and
// descending passes have mirror-image East sensitivity but the same Up sensitivity, and both near-polar
// orbits are nearly blind to North–South motion. Combining the two LOS measurements recovers Up + East
// (the standard 2-geometry decomposition); North–South stays unresolved. The same light analysis the app
// runs on a real cube (per-pixel velocity, inverse-velocity, alarms) runs on each projected/decomposed cube.
//
// Sign convention: negative LOS = motion AWAY from satellite (range increase / subsidence-settling).
import { mulberry32, gaussian } from '../lib/prng';

export type Zone = 0 | 1 | 2;                       // 0 = stable rock, 1 = deforming dam, 2 = low-coherence beach
export type Regime = 'accelerating' | 'stable' | 'seasonal' | 'step' | 'linear';
export type Geom = 'asc' | 'desc';                  // acquisition geometry
export type Comp = 'asc' | 'desc' | 'up' | 'east';  // displayed component (raw LOS or decomposed)

// Sentinel-1 mid-swath geometry. Look vectors in (East, Up); North ≈ 0 for both near-polar passes — the
// N–S blind spot. Ascending (right-looking, flying ~N) sees the satellite to the EAST (e>0); descending
// (flying ~S) to the WEST (e<0). Both see the satellite UP (u = cos θ > 0).
const THETA = (39 * Math.PI) / 180;
const COS = Math.cos(THETA), SIN = Math.sin(THETA);
const HORIZ = 0.45;                                  // outward horizontal motion as a fraction of subsidence
const LOOK: Record<Geom, { e: number; u: number }> = { asc: { e: +SIN, u: COS }, desc: { e: -SIN, u: COS } };

export interface Cube {
  W: number; H: number; nEp: number;
  days: Float64Array;        // acquisition day-of-record (0..) per epoch
  cum: Float32Array[];       // cum[ep] length W*H, cumulative displacement mm (negative = away/subsiding)
  vel: Float32Array;         // per-pixel velocity mm/yr (linear fit)
  coh: Float32Array;         // per-pixel temporal coherence 0..1
  zone: Uint8Array;          // per-pixel zone
  tFail: number;             // injected true failure day (deforming zone; accelerating regime)
  ooa: number;               // onset-of-acceleration day
  refDate: string;
  regime: Regime;
  comp: Comp;                // which component this cube represents
}

/** Shared ground-truth scene: zones, per-pixel weight + coherence, and the true Vertical (mU) and East (mE)
 * ground-motion time-series at unit weight. Geometry projection + decomposition derive from this. */
export interface Scene {
  W: number; H: number; nEp: number; dt: number;
  days: Float64Array;
  zone: Uint8Array; weight: Float32Array; coh: Float32Array;
  mU: Float64Array;          // true vertical ground motion (mm, negative = subsiding) per epoch
  mE: Float64Array;          // true East ground motion (mm, positive = eastward) per epoch
  tFail: number; ooa: number; refDate: string; regime: Regime;
}

export interface CubeSpec { W?: number; H?: number; nEp?: number; dt?: number; seed?: number; severity?: number; regime?: Regime }

/** Tertiary-creep cumulative vertical displacement (mm, negative = subsiding) at day t for the deforming zone.
 * Secondary (slow linear) phase until OOA, then α≈2 Fukuzono acceleration v(t)=k/(tFail−t) → 1/v linear. */
function creep(t: number, ooa: number, tFail: number, vSec: number, k: number): number {
  let d = -vSec * t;
  if (t > ooa) d -= k * Math.log((tFail - ooa) / Math.max(tFail - t, 0.5));
  return d;
}

/** Dam-zone VERTICAL ground motion (mm) at day t for a deformation REGIME — the honest range of behaviours a
 * monitor must distinguish: an accelerating failure, a stable control, a reversible seasonal cycle, a
 * post-rain step, and steady (non-accelerating) linear creep. */
function damVert(t: number, span: number, ooa: number, tFail: number, vSec: number, k: number, regime: Regime): number {
  switch (regime) {
    case 'stable': return 0;
    case 'seasonal': return -9 * Math.sin((2 * Math.PI * t) / 365);  // reversible annual breathing (no net trend)
    case 'step': return t > span * 0.55 ? -28 : 0;                   // a settling step after a rain event
    case 'linear': return -vSec * 2.2 * t;                           // steady creep, NO acceleration
    default: return creep(t, ooa, tFail, vSec, k);                   // 'accelerating'
  }
}

/** Build the shared ground-truth scene (geometry-independent). */
export function buildScene(spec: CubeSpec = {}): Scene {
  const W = spec.W ?? 96, H = spec.H ?? 64, nEp = spec.nEp ?? 60, dt = spec.dt ?? 12;
  const sev = spec.severity ?? 1;
  const regime: Regime = spec.regime ?? 'accelerating';
  const rng = mulberry32(spec.seed ?? 7);
  const days = new Float64Array(nEp);
  for (let i = 0; i < nEp; i++) days[i] = i * dt;
  const span = days[nEp - 1];
  const ooa = span * 0.6, tFail = span * 1.04;   // OOA at 60% of record, failure just after the last epoch
  const vSec = 0.02 * sev;                         // secondary creep mm/day (slow)
  const k = 34 * sev;                              // tertiary strength (mm) → sharpness of the blow-up

  // true ground-motion time-series (vertical + correlated outward horizontal: a subsiding face also bulges out)
  const mU = new Float64Array(nEp), mE = new Float64Array(nEp);
  for (let e = 0; e < nEp; e++) {
    mU[e] = damVert(days[e], span, ooa, tFail, vSec, k, regime);
    mE[e] = -HORIZ * mU[e];                         // down (mU<0) ⇒ outward eastward (mE>0)
  }

  // zones: dam band across the middle, beach below it, rock elsewhere
  const zone = new Uint8Array(W * H);
  const cx = W * 0.5, cy = H * 0.42;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const damBand = Math.abs(y - cy) < 7 && x > W * 0.18 && x < W * 0.82;
    const beach = y > cy + 7 && y < cy + 22 && x > W * 0.2 && x < W * 0.8;
    zone[i] = damBand ? 1 : beach ? 2 : 0;
  }

  // per-pixel deformation weight (taper across the dam zone) + coherence
  const weight = new Float32Array(W * H), coh = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (zone[i] === 1) { const wx = Math.exp(-(((x - cx) / (W * 0.26)) ** 2)); const wy = Math.exp(-(((y - cy) / 4) ** 2)); weight[i] = 0.5 + 0.5 * wx * wy; coh[i] = 0.78 + 0.12 * rng(); }
    else if (zone[i] === 2) { weight[i] = 0.25 + 0.2 * rng(); coh[i] = 0.18 + 0.22 * rng(); }
    else { weight[i] = 0; coh[i] = 0.86 + 0.1 * rng(); }
  }

  return { W, H, nEp, dt, days, zone, weight, coh, mU, mE, tFail, ooa, refDate: '2018-01-06', regime };
}

/** Project the true ground motion onto one acquisition geometry's line of sight → an observable LOS cube,
 * with geometry-specific (independent) decorrelation noise. */
export function projectGeom(s: Scene, geom: Geom): Cube {
  const { W, H, nEp, days, zone, weight, coh, mU, mE } = s;
  const span = days[nEp - 1];
  const look = LOOK[geom];
  const rng = mulberry32((geom === 'asc' ? 1009 : 7919) + nEp);  // distinct noise per pass
  const cum: Float32Array[] = [];
  for (let e = 0; e < nEp; e++) {
    const t = days[e];
    const dLos = look.e * mE[e] + look.u * mU[e];                 // projection of true 3-D motion onto LOS
    const ras = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const noiseScale = zone[i] === 2 ? 3.0 : 0.8;               // beach = noisier (decorrelation)
      const aps = 0.3 * Math.sin((t / span) * 2 * Math.PI) * ((i % W) / W - 0.5);  // mild stratified-APS-like ramp
      ras[i] = weight[i] * dLos + aps + noiseScale * gaussian(rng);
    }
    cum.push(ras);
  }
  const vel = velOf(cum, days, W * H, nEp);
  return { W, H, nEp, days, cum, vel, coh: coh.slice(), zone, tFail: s.tFail, ooa: s.ooa, refDate: s.refDate, regime: s.regime, comp: geom };
}

/** 2-geometry decomposition: combine the ascending and descending LOS cubes to recover the Vertical (Up) or
 * East component. up = (a+d)/(2cosθ); east = (a−d)/(2sinθ). North–South is unrecoverable (look vectors have
 * ~0 north sensitivity). Coherence of the combined product = the worse of the two passes. */
export function decompose(asc: Cube, desc: Cube, comp: 'up' | 'east'): Cube {
  const { W, H, nEp, days } = asc;
  const denom = comp === 'up' ? 2 * COS : 2 * SIN;
  const sgn = comp === 'up' ? 1 : -1;                              // up: a+d ; east: a−d
  const cum: Float32Array[] = [];
  for (let e = 0; e < nEp; e++) {
    const a = asc.cum[e], d = desc.cum[e], ras = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) ras[i] = (a[i] + sgn * d[i]) / denom;
    cum.push(ras);
  }
  const vel = velOf(cum, days, W * H, nEp);
  const coh = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) coh[i] = Math.min(asc.coh[i], desc.coh[i]);
  return { W, H, nEp, days, cum, vel, coh, zone: asc.zone, tFail: asc.tFail, ooa: asc.ooa, refDate: asc.refDate, regime: asc.regime, comp };
}

/** Pick the cube for a displayed component: raw LOS (asc/desc) or a decomposed component (up/east). */
export function selectCube(asc: Cube, desc: Cube, comp: Comp): Cube {
  return comp === 'asc' ? asc : comp === 'desc' ? desc : decompose(asc, desc, comp);
}

/** Per-pixel velocity (mm/yr) = OLS slope of cum vs day, ×365. */
function velOf(cum: Float32Array[], days: Float64Array, n: number, nEp: number): Float32Array {
  const vel = new Float32Array(n);
  let st = 0, stt = 0; for (let e = 0; e < nEp; e++) { st += days[e]; stt += days[e] * days[e]; }
  const mt = st / nEp, den = stt - nEp * mt * mt;
  for (let i = 0; i < n; i++) {
    let sy = 0, sty = 0; for (let e = 0; e < nEp; e++) { sy += cum[e][i]; sty += days[e] * cum[e][i]; }
    vel[i] = ((sty - mt * sy) / den) * 365;
  }
  return vel;
}

/** Convenience single-cube builder (ascending LOS) — kept for backward compatibility. */
export function buildCube(spec: CubeSpec = {}): Cube {
  return projectGeom(buildScene(spec), 'asc');
}

/** Cumulative-displacement time-series at a pixel (mm). */
export function pixelSeries(c: Cube, x: number, y: number): number[] {
  const i = y * c.W + x; return c.cum.map((r) => r[i]);
}
