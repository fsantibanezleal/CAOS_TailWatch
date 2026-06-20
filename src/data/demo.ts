// Loader for the committed precompute artifacts produced by the offline pipeline (forward sim → SBAS →
// trained conv-AE + 1-D CNN → ONNX). tw-demo.bin packs five float32 H*W maps then an int16 cumulative-Up
// cube; tw-demo.json carries the calendar, classes, latent UMAP coords, the held-out ROC curves and the
// CNN confusion matrix. Everything here is REAL model output, not synthetic-on-the-fly.
export interface RocCurve { fpr: number[]; tpr: number[] }
export interface Benchmark {
  macroF1: number; aeAuc: number; velAuc: number;
  aeRoc: RocCurve; velRoc: RocCurve; confusion: number[][];
  heldOut: number[]; trainScenes: number;
}
export interface LatentPt { x: number; y: number; cls: number }
export interface Demo {
  W: number; H: number; nEp: number; days: number[]; classes: string[];
  velScale: number; patch: number;
  vel: Float32Array; anomaly: Float32Array; classMap: Float32Array; coh: Float32Array; zone: Float32Array;
  cumUp: Int16Array; cumScale: number;       // displacement mm = cumUp / cumScale
  latent: LatentPt[]; benchmark: Benchmark;
  series(x: number, y: number): number[];     // cumulative-Up series (mm) at a pixel
  velAt(x: number, y: number): number;
}

let cache: Promise<Demo> | null = null;

export function loadDemo(): Promise<Demo> {
  if (cache) return cache;
  cache = (async () => {
    const base = import.meta.env.BASE_URL || '/';
    const [meta, buf] = await Promise.all([
      fetch(`${base}tw-demo.json`).then((r) => r.json()),
      fetch(`${base}tw-demo.bin`).then((r) => r.arrayBuffer()),
    ]);
    const { W, H, nEp } = meta; const n = W * H;
    let o = 0;
    const f32 = (len: number) => { const a = new Float32Array(buf, o, len); o += len * 4; return a; };
    const vel = f32(n), anomaly = f32(n), classMap = f32(n), coh = f32(n), zone = f32(n);
    const cumUp = new Int16Array(buf, o, nEp * n);
    const cumScale: number = meta.cumScale;
    return {
      W, H, nEp, days: meta.days, classes: meta.classes, velScale: meta.velScale, patch: meta.patch,
      vel, anomaly, classMap, coh, zone, cumUp, cumScale,
      latent: meta.latent, benchmark: meta.benchmark,
      series(x: number, y: number) { const i = y * W + x; const out: number[] = []; for (let e = 0; e < nEp; e++) out.push(cumUp[e * n + i] / cumScale); return out; },
      velAt(x: number, y: number) { return vel[y * W + x]; },
    } as Demo;
  })();
  return cache;
}

// percentile-normalise an anomaly field to [0,1] for display (robust to the long tail)
export function pctNorm(a: Float32Array): { norm: Float32Array; lo: number; hi: number } {
  const s = Float32Array.from(a).sort();
  const lo = s[Math.floor(s.length * 0.02)], hi = s[Math.floor(s.length * 0.98)] || 1;
  const norm = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) norm[i] = Math.max(0, Math.min(1, (a[i] - lo) / (hi - lo || 1)));
  return { norm, lo, hi };
}

// categorical colours for the 6 deformation classes (CVD-safe-ish, stable across light/dark)
export const CLASS_COLORS = ['#8b949e', '#58a6ff', '#f85149', '#3fb950', '#d29922', '#6e7681'];
export const CLASS_EN = ['Stable', 'Linear creep', 'Accelerating', 'Seasonal', 'Step', 'Decorrelated'];
export const CLASS_ES = ['Estable', 'Creep lineal', 'Acelerando', 'Estacional', 'Escalón', 'Decorrelado'];
