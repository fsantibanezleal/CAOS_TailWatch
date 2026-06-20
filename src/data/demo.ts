// Loader for the committed precompute artifacts (forward sim → SBAS → conv-AE + CNN → ONNX). The manifest
// tw-cases.json lists the configurable CASES (distinct deformation scenarios) + the held-out benchmark; each
// case's tw-<id>.bin packs eight float32 H*W maps (velocity Up/East/Asc/Desc, AE anomaly, CNN class,
// coherence, zone) then an int16 cumulative-Up cube. Cases lazy-load so only the selected one is fetched.
export interface RocCurve { fpr: number[]; tpr: number[] }
export interface Benchmark { macroF1: number; aeAuc: number; velAuc: number; aeRoc: RocCurve; velRoc: RocCurve; confusion: number[][]; heldOut: number[]; trainScenes: number }
export interface LatentPt { x: number; y: number; cls: number }
export interface CaseInfo { id: string; en: string; es: string; regime: string; latent: LatentPt[] }
export interface Manifest {
  W: number; H: number; nEp: number; days: number[]; classes: string[];
  cumScale: number; velScale: number; patch: number; components: string[];
  cases: CaseInfo[]; benchmark: Benchmark;
}
export type Component = 'up' | 'east' | 'asc' | 'desc';
export interface CaseData {
  velUp: Float32Array; velEast: Float32Array; velAsc: Float32Array; velDesc: Float32Array;
  anomaly: Float32Array; classMap: Float32Array; coh: Float32Array; zone: Float32Array; cumUp: Int16Array;
}

const base = () => (import.meta.env.BASE_URL || '/');
let manifestCache: Promise<Manifest> | null = null;
const caseCache = new Map<string, Promise<CaseData>>();

export function loadManifest(): Promise<Manifest> {
  return (manifestCache ??= fetch(`${base()}tw-cases.json`).then((r) => r.json()));
}

export function loadCase(m: Manifest, id: string): Promise<CaseData> {
  let p = caseCache.get(id);
  if (!p) {
    p = fetch(`${base()}tw-${id}.bin`).then((r) => r.arrayBuffer()).then((buf) => {
      const n = m.W * m.H; let o = 0;
      const f32 = () => { const a = new Float32Array(buf, o, n); o += n * 4; return a; };
      const velUp = f32(), velEast = f32(), velAsc = f32(), velDesc = f32(), anomaly = f32(), classMap = f32(), coh = f32(), zone = f32();
      const cumUp = new Int16Array(buf, o, m.nEp * n);
      return { velUp, velEast, velAsc, velDesc, anomaly, classMap, coh, zone, cumUp };
    });
    caseCache.set(id, p);
  }
  return p;
}

/** The velocity field for the chosen geometry/component. */
export function velOf(c: CaseData, comp: Component): Float32Array {
  return comp === 'east' ? c.velEast : comp === 'asc' ? c.velAsc : comp === 'desc' ? c.velDesc : c.velUp;
}
/** Cumulative-Up series (mm) at a pixel. */
export function seriesAt(m: Manifest, c: CaseData, x: number, y: number): number[] {
  const i = y * m.W + x, n = m.W * m.H, out: number[] = [];
  for (let e = 0; e < m.nEp; e++) out.push(c.cumUp[e * n + i] / m.cumScale);
  return out;
}

// percentile-normalise an anomaly field to [0,1] for display (robust to the long tail)
export function pctNorm(a: Float32Array): { norm: Float32Array; lo: number; hi: number } {
  const s = Float32Array.from(a).sort();
  const lo = s[Math.floor(s.length * 0.02)], hi = s[Math.floor(s.length * 0.98)] || 1;
  const norm = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) norm[i] = Math.max(0, Math.min(1, (a[i] - lo) / (hi - lo || 1)));
  return { norm, lo, hi };
}

export const CLASS_COLORS = ['#8b949e', '#58a6ff', '#f85149', '#3fb950', '#d29922', '#6e7681'];
export const CLASS_EN = ['Stable', 'Linear creep', 'Accelerating', 'Seasonal', 'Step', 'Decorrelated'];
export const CLASS_ES = ['Estable', 'Creep lineal', 'Acelerando', 'Estacional', 'Escalón', 'Decorrelado'];
export const COMP_EN: Record<Component, string> = { up: 'Vertical (Up)', east: 'East (E–W)', asc: 'Ascending LOS', desc: 'Descending LOS' };
export const COMP_ES: Record<Component, string> = { up: 'Vertical (Up)', east: 'Este (E–O)', asc: 'LOS ascendente', desc: 'LOS descendente' };
