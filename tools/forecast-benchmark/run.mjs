// Offline Monte-Carlo self-validation of the inverse-velocity forecaster + TARP alarm — runs the EXACT app
// pipeline (src/dsp/insar.ts + forecast.ts) over many seeded synthetic run-to-failure trajectories and
// non-failure controls, and writes committed summary metrics to src/data/forecast-benchmark.json. No raw
// data, no fabricated numbers — every figure here is reproduced by `npm run benchmark`. Deterministic
// (seeded PRNG; no Date.now / Math.random), so the JSON is stable across runs.
//
// Run: node --import tsx tools/forecast-benchmark/run.mjs
import { writeFileSync } from 'node:fs';
import { buildScene, projectGeom, selectCube, pixelSeries } from '../../src/dsp/insar.ts';
import { inverseVelocity, tarp } from '../../src/dsp/forecast.ts';

const SEEDS = Array.from({ length: 60 }, (_, i) => 11 + i * 7);
const SEVERITIES = [0.6, 1.0, 1.4];
const CREST = { x: 48, y: 27 };                       // dam-crest centre pixel (max deformation weight)
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

// Build the decomposed-Up crest series + crest velocity for one trajectory.
function trajectory(regime, seed, severity) {
  const scene = buildScene({ severity, seed, regime });
  const asc = projectGeom(scene, 'asc'), desc = projectGeom(scene, 'desc');
  const up = selectCube(asc, desc, regime === 'accelerating' ? 'up' : 'up');
  const series = pixelSeries(up, CREST.x, CREST.y);
  const days = Array.from(up.days);
  const velMmYr = up.vel[CREST.y * up.W + CREST.x];
  return { scene, series, days, velMmYr };
}

// ---- 1) Accelerating: forecast skill vs injected t_f, as a function of lead time -----------------------
const accelPts = [];                 // every credible (seed×severity×truncation) forecast
const scatter = [];                  // final-epoch predicted vs true t_f
let accelTraj = 0, detected = 0;
for (const severity of SEVERITIES) for (const seed of SEEDS) {
  accelTraj++;
  const { scene, series, days } = trajectory('accelerating', seed, severity);
  const trueTf = scene.tFail;
  let everCredible = false;
  let k0 = Math.floor(days.length * 0.62); if ((days.length - k0) % 2) k0++;   // step lands on days.length
  for (let k = k0; k <= days.length; k += 2) {
    const sCum = series.slice(0, k), sDay = days.slice(0, k);
    const iv = inverseVelocity(sCum, sDay);
    if (!iv.credible || iv.tFail == null) continue;
    everCredible = true;
    const nowDay = sDay[sDay.length - 1];
    const trueRul = trueTf - nowDay, predRul = iv.tFail - nowDay;
    if (trueRul <= 0) continue;
    const relErr = (iv.tFail - trueTf) / trueTf;
    const rulRelErr = Math.abs(predRul - trueRul) / trueRul;
    accelPts.push({ leadDays: trueRul, relErr, absRelErr: Math.abs(relErr), rulRelErr, r2: iv.r2 });
    if (k === days.length) scatter.push({ trueTf: +trueTf.toFixed(1), predTf: +iv.tFail.toFixed(1), sev: severity });
  }
  if (everCredible) detected++;
}
// lead-time buckets (days-to-failure): how the forecast tightens as failure approaches
const BUCKETS = [[0, 40], [40, 80], [80, 140], [140, 260]];
const leadCurve = BUCKETS.map(([lo, hi]) => {
  const sub = accelPts.filter((p) => p.leadDays >= lo && p.leadDays < hi);
  return { lo, hi, mid: (lo + hi) / 2, n: sub.length, medAbsRelErr: sub.length ? +median(sub.map((p) => p.absRelErr)).toFixed(3) : null };
});
const alphaAcc = accelPts.length ? accelPts.filter((p) => p.rulRelErr <= 0.2).length / accelPts.length : 0;

// ---- 2) Controls: false-alarm rate (a credible imminent-failure forecast on a non-accelerating case) ---
const CONTROLS = ['stable', 'seasonal', 'linear'];
const controls = CONTROLS.map((regime) => {
  let n = 0, fa = 0, amber = 0;
  for (const severity of SEVERITIES) for (const seed of SEEDS) {
    n++;
    const { series, days, velMmYr } = trajectory(regime, seed, severity);
    const iv = inverseVelocity(series, days);
    const daysToFail = iv.credible && iv.tFail != null ? iv.tFail - days[days.length - 1] : null;
    const al = tarp(velMmYr, daysToFail);
    if (iv.credible) fa++;                              // false alarm = forecaster claims a failure time
    if (al.level !== 'green') amber++;                 // any non-green (incl. a steady-creep "watch")
    void severity;
  }
  return { regime, n, falseAlarmRate: +(fa / n).toFixed(3), nonGreenRate: +(amber / n).toFixed(3) };
});

const out = {
  method: 'inverse-velocity (Fukuzono α≈2) on decomposed-Up crest series; TARP two-trigger alarm',
  pipeline: 'identical to the live app (src/dsp/insar.ts + forecast.ts), seeded + deterministic',
  grid: { seeds: SEEDS.length, severities: SEVERITIES, crest: CREST },
  accel: {
    nTrajectories: accelTraj,
    detectRate: +(detected / accelTraj).toFixed(3),
    nCredibleForecasts: accelPts.length,
    medAbsRelErrTf: +median(accelPts.map((p) => p.absRelErr)).toFixed(3),
    medAbsRelErrTfPct: +(100 * median(accelPts.map((p) => p.absRelErr))).toFixed(1),
    alphaAccuracy20: +alphaAcc.toFixed(3),
    leadCurve,
    scatter: scatter.filter((_, i) => i % 2 === 0),    // subsample for the committed artifact
  },
  controls,
};
writeFileSync(new URL('../../src/data/forecast-benchmark.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log('accel detectRate', out.accel.detectRate, '| med |t_f err|', out.accel.medAbsRelErrTfPct + '%',
  '| α-acc', out.accel.alphaAccuracy20, '| controls FA', controls.map((c) => `${c.regime}:${c.falseAlarmRate}`).join(' '));
