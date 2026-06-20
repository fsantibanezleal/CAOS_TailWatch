// Synthetic InSAR displacement cube — SYNTHETIC, physics-grounded, in the real LiCSBAS sense: a stack of
// cumulative line-of-sight (LOS) displacement rasters (mm) over a Sentinel-1-like 12-day calendar, for a
// tailings-dam scene with a deforming dam zone (3-stage / tertiary creep that accelerates toward a known
// failure time t_f, Fukuzono-consistent), stable bedrock, and a low-coherence wet beach. The same light
// analysis (per-pixel velocity, inverse-velocity, alarms) the app runs on real cubes runs on this.
// Sign convention: negative LOS = motion AWAY from satellite (range increase / subsidence-settling).
import { mulberry32, gaussian } from '../lib/prng';

export type Zone = 0 | 1 | 2; // 0 = stable rock, 1 = deforming dam, 2 = low-coherence beach

export interface Cube {
  W: number; H: number; nEp: number;
  days: Float64Array;        // acquisition day-of-record (0..) per epoch
  cum: Float32Array[];       // cum[ep] length W*H, cumulative LOS mm (negative = away/subsiding)
  vel: Float32Array;         // per-pixel LOS velocity mm/yr (linear fit)
  coh: Float32Array;         // per-pixel temporal coherence 0..1
  zone: Uint8Array;          // per-pixel zone
  tFail: number;             // injected true failure day (for the deforming zone)
  ooa: number;               // onset-of-acceleration day
  refDate: string;
}

export interface CubeSpec { W?: number; H?: number; nEp?: number; dt?: number; seed?: number; severity?: number }

/** Tertiary-creep cumulative LOS displacement (mm, negative = subsiding) at day t for the deforming zone.
 * Secondary (slow linear) phase until OOA, then α≈2 Fukuzono acceleration v(t)=k/(tFail−t) → 1/v linear. */
function creep(t: number, ooa: number, tFail: number, vSec: number, k: number): number {
  // cumulative subsidence d(t) = −∫₀ᵗ v ds (negative = away/subsiding); v = vSec + k/(tFail−s) for s>ooa.
  // ∫ₒₒₐᵗ k/(tFail−s) ds = k·ln((tFail−ooa)/(tFail−t)). Both terms accumulate NEGATIVELY (subsidence).
  let d = -vSec * t;
  if (t > ooa) d -= k * Math.log((tFail - ooa) / Math.max(tFail - t, 0.5));
  return d;
}

export function buildCube(spec: CubeSpec = {}): Cube {
  const W = spec.W ?? 96, H = spec.H ?? 64, nEp = spec.nEp ?? 60, dt = spec.dt ?? 12;
  const sev = spec.severity ?? 1;
  const rng = mulberry32(spec.seed ?? 7);
  const days = new Float64Array(nEp);
  for (let i = 0; i < nEp; i++) days[i] = i * dt;
  const span = days[nEp - 1];
  const ooa = span * 0.6, tFail = span * 1.04;  // OOA at 60% of record, failure just after the last epoch
  const vSec = 0.02 * sev;                        // secondary creep mm/day (slow)
  const k = 34 * sev;                             // tertiary strength (mm) → controls how sharp the blow-up is

  // zones: dam band across the middle, beach below it, rock elsewhere
  const zone = new Uint8Array(W * H);
  const cx = W * 0.5, cy = H * 0.42;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const damBand = Math.abs(y - cy) < 7 && x > W * 0.18 && x < W * 0.82;          // the dam crest/slope band
    const beach = y > cy + 7 && y < cy + 22 && x > W * 0.2 && x < W * 0.8;          // wet tailings beach below
    zone[i] = damBand ? 1 : beach ? 2 : 0;
  }

  // per-pixel deformation weight (taper of the creep magnitude across the dam zone), coherence
  const weight = new Float32Array(W * H);
  const coh = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (zone[i] === 1) { const wx = Math.exp(-(((x - cx) / (W * 0.26)) ** 2)); const wy = Math.exp(-(((y - cy) / 4) ** 2)); weight[i] = 0.5 + 0.5 * wx * wy; coh[i] = 0.78 + 0.12 * rng(); }
    else if (zone[i] === 2) { weight[i] = 0.25 + 0.2 * rng(); coh[i] = 0.18 + 0.22 * rng(); }      // low coherence beach
    else { weight[i] = 0; coh[i] = 0.86 + 0.1 * rng(); }                                            // stable rock
  }

  const cum: Float32Array[] = [];
  for (let e = 0; e < nEp; e++) {
    const t = days[e];
    const dDam = creep(t, ooa, tFail, vSec, k);
    const ras = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const noiseScale = zone[i] === 2 ? 3.0 : 0.8;                                    // beach = noisier (decorrelation)
      const aps = 0.3 * Math.sin((t / span) * 2 * Math.PI) * ((i % W) / W - 0.5);      // mild stratified-APS-like ramp
      ras[i] = weight[i] * dDam + aps + noiseScale * gaussian(rng);
    }
    cum.push(ras);
  }

  // per-pixel LOS velocity (mm/yr) = OLS slope of cum vs day, ×365
  const vel = new Float32Array(W * H);
  let st = 0, stt = 0; for (let e = 0; e < nEp; e++) { st += days[e]; stt += days[e] * days[e]; }
  const mt = st / nEp, den = stt - nEp * mt * mt;
  for (let i = 0; i < W * H; i++) {
    let sy = 0, sty = 0; for (let e = 0; e < nEp; e++) { sy += cum[e][i]; sty += days[e] * cum[e][i]; }
    vel[i] = ((sty - mt * sy) / den) * 365;
  }

  return { W, H, nEp, days, cum, vel, coh, zone, tFail, ooa, refDate: '2018-01-06' };
}

/** Cumulative-displacement time-series at a pixel (mm), already coherence-aware (caller may mask). */
export function pixelSeries(c: Cube, x: number, y: number): number[] {
  const i = y * c.W + x; return c.cum.map((r) => r[i]);
}
