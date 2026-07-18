// Prognostics: velocity / inverse-velocity (Fukuzono) failure-time projection + tiered TARP alarm.
// Fukuzono (1985): for tertiary creep with power-law exponent α≈2, the inverse velocity 1/v(t) decreases
// linearly toward zero at the failure time t_f. So a linear fit to 1/v on the post-onset (terminal) window
// projects t_f as the x-intercept, gated on fit quality (b<0, R² > 0.55, ≥4 points). An approximate CI
// (tFailLo/tFailHi) is computed; the App currently renders the point estimate (days to failure).
// Refs: Fukuzono 1985; Voight 1988/1989; Rose & Hungr 2007; Carlà et al. 2017 (10.1007/s10346-016-0731-5).

/** EWMA-smoothed LOS velocity (mm/day) from a cumulative-displacement series sampled at `days`. */
export function velocitySeries(cum: number[], days: number[], alpha = 0.4): number[] {
  const v: number[] = [];
  for (let i = 0; i < cum.length; i++) {
    if (i === 0) { v.push(0); continue; }
    const raw = (cum[i] - cum[i - 1]) / Math.max(days[i] - days[i - 1], 1e-6);
    v.push(alpha * raw + (1 - alpha) * v[i - 1]);
  }
  return v;
}

export interface InvVel {
  invv: number[];           // |1/velocity| per epoch (smoothed)
  fitFrom: number;          // index where the terminal linear fit starts (post-OOA)
  tFail: number | null;     // projected failure day (x-intercept), null if not credible
  tFailLo: number | null; tFailHi: number | null;
  r2: number;
  credible: boolean;
  ooaIdx: number;
  a: number; b: number;     // fit 1/v = a + b·t (b<0 toward failure)
}

/** Onset of acceleration: first index where the smoothed |velocity| sustains a rise above a robust floor. */
function onset(vmag: number[]): number {
  const base = vmag.slice(0, Math.max(3, Math.floor(vmag.length * 0.4)));
  const mean = base.reduce((a, b) => a + b, 0) / base.length;
  const sd = Math.sqrt(base.reduce((a, b) => a + (b - mean) ** 2, 0) / base.length) || 1e-9;
  for (let i = 1; i < vmag.length - 1; i++) if (vmag[i] > mean + 3 * sd && vmag[i + 1] > vmag[i]) return i;
  return -1;
}

/** Inverse-velocity failure-time projection with a credibility gate (R², acceleration, window length). */
export function inverseVelocity(cum: number[], days: number[]): InvVel {
  const v = velocitySeries(cum, days);
  const vmag = v.map((x) => Math.abs(x));
  const invv = vmag.map((m) => 1 / Math.max(m, 1e-4));
  const ooaIdx = onset(vmag);
  const fitFrom = ooaIdx > 0 ? ooaIdx : Math.floor(days.length * 0.6);
  const xs: number[] = [], ys: number[] = [];
  for (let i = fitFrom; i < days.length; i++) { xs.push(days[i]); ys.push(invv[i]); }
  let res: InvVel = { invv, fitFrom, tFail: null, tFailLo: null, tFailHi: null, r2: 0, credible: false, ooaIdx, a: 0, b: 0 };
  if (xs.length < 4) return res;
  // OLS 1/v = a + b·t ; x-intercept t_f = −a/b (b must be negative = decreasing → failure)
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
  const b = sxy / (sxx || 1e-12), a = my - b * mx;
  let ssr = 0, sst = 0; for (let i = 0; i < n; i++) { const pred = a + b * xs[i]; ssr += (ys[i] - pred) ** 2; sst += (ys[i] - my) ** 2; }
  const r2 = sst > 0 ? 1 - ssr / sst : 0;
  res.r2 = r2; res.a = a; res.b = b;
  if (b < 0 && r2 > 0.55) {
    const tFail = -a / b;
    const se = Math.sqrt(ssr / Math.max(1, n - 2)) / Math.sqrt(sxx);      // se(slope)
    const dt = (1.96 * se * tFail) / Math.abs(b);                          // propagate to intercept (approx)
    // credible when the projected failure lies in the FUTURE (beyond the last observation)
    res = { ...res, tFail, tFailLo: tFail - dt, tFailHi: tFail + dt, credible: tFail > days[days.length - 1] };
  }
  return res;
}

// ---- The novel beyond-SOTA proposal: split-conformal prediction intervals on t_f (Vovk et al.) ----
export interface ConformalBucket { lo: number; hi: number; q: number | null; coverage: number | null; nCal?: number; nTest?: number }
export interface Conformal { method: string; alpha: number; nominal: number; meanCoverage: number | null; buckets: ConformalBucket[] }

/** Split-conformal prediction interval on the failure time. Given the point t_f and the current lead-time
 *  (t_f - t_now), select the calibrated bucket quantile q and return t_f x [1-q, 1+q]: a distribution-free
 *  interval that covers the true t_f with probability >= nominal (1-alpha) on held-out synthetic scenes,
 *  beyond the point estimate (Fukuzono) and the bootstrap band (Carla). On real data it is a calibrated
 *  prior only (distribution shift), labelled as such in the UI. */
export function conformalInterval(
  tFail: number, tNow: number, conf: Conformal | null,
): { lo: number; hi: number; q: number; coverage: number | null } | null {
  if (!conf || !conf.buckets?.length || !(tFail > tNow)) return null;
  const lead = tFail - tNow;
  const inBucket = conf.buckets.find((b) => b.q != null && lead >= b.lo && lead < b.hi);
  const bkt = inBucket ?? [...conf.buckets].reverse().find((b) => b.q != null);   // clamp to the widest calibrated bucket
  if (!bkt || bkt.q == null) return null;
  return { lo: tFail * (1 - bkt.q), hi: tFail * (1 + bkt.q), q: bkt.q, coverage: bkt.coverage };
}

export type Alarm = 'green' | 'amber' | 'red';
export interface Tarp { level: Alarm; reason: string; reasonEs: string }

/** Tiered TARP alarm with two parallel triggers (state velocity and forecast time-to-failure). The band
 * structure is industry practice (GISTM/ANCOLD/CDA); the mm/yr · day cut-points are configurable site
 * defaults, not universal regulatory limits. */
export function tarp(velMmYr: number, daysToFail: number | null): Tarp {
  const a = Math.abs(velMmYr);
  let level: Alarm = 'green';
  let reason = `velocity ${a.toFixed(0)} mm/yr`, reasonEs = `velocidad ${a.toFixed(0)} mm/yr`;
  if (a > 200) { level = 'red'; reason = `velocity ${a.toFixed(0)} mm/yr (very rapid)`; reasonEs = `velocidad ${a.toFixed(0)} mm/yr (muy rápida)`; }
  else if (a > 50) { level = 'amber'; reason = `velocity ${a.toFixed(0)} mm/yr (accelerating)`; reasonEs = `velocidad ${a.toFixed(0)} mm/yr (acelerando)`; }
  if (daysToFail != null && daysToFail > 0) {
    if (daysToFail < 14 && level !== 'red') { level = 'red'; reason = `projected failure in ${daysToFail.toFixed(0)} d`; reasonEs = `falla proyectada en ${daysToFail.toFixed(0)} d`; }
    else if (daysToFail < 60 && level === 'green') { level = 'amber'; reason = `projected failure in ${daysToFail.toFixed(0)} d`; reasonEs = `falla proyectada en ${daysToFail.toFixed(0)} d`; }
  }
  return { level, reason, reasonEs };
}
