// Loader for the committed precompute artifacts (forward sim → SBAS → conv-AE + CNN → ONNX). The manifest
// tw-cases.json lists the configurable cases (distinct deformation scenarios) + the held-out benchmark; each
// case's tw-<id>.bin packs eight float32 H*W maps (velocity Up/East/Asc/Desc, AE anomaly, CNN class,
// coherence, zone) then an int16 cumulative-Up cube. Cases lazy-load so only the selected one is fetched.
export interface RocCurve { fpr: number[]; tpr: number[] }
export interface Benchmark { macroF1: number; aeAuc: number; velAuc: number; aeRoc: RocCurve; velRoc: RocCurve; confusion: number[][]; heldOut: number[]; trainScenes: number }
export interface LatentPt { x: number; y: number; cls: number }
export interface Provenance {
  source: string; frameId: string; site: string; geometry: string; dates: string;
  nEpochsUsed?: number; nEpochsAvailable?: number;
  aoiBBox?: { latMin: number; latMax: number; lonMin: number; lonMax: number };
  license: string; attribution: string; citations: string[];
}
// A case is either one of the synthetic regime scenarios (source omitted / 'synthetic') or the real Sentinel-1
// sample (source 'real'), which carries its own smaller grid + real acquisition days + provenance + the subset of
// components a single-geometry frame can resolve.
export interface CaseInfo {
  id: string; en: string; es: string; regime: string; latent: LatentPt[];
  source?: 'synthetic' | 'real';
  W?: number; H?: number; nEp?: number; days?: number[];
  components?: Component[]; provenance?: Provenance;
}
export interface LeadBucket { lo: number; hi: number; n: number; medErr: number | null }
export interface ControlRegime { n: number; falseAlarms: number }
export interface ConformalBucketDoc { lo: number; hi: number; q: number | null; coverage: number | null; nCal?: number; nTest?: number }
export interface ConformalDoc { method: string; alpha: number; nominal: number; meanCoverage: number | null; buckets: ConformalBucketDoc[] }
export interface Forecast { detectRate: number; nTraj: number; medErrPct: number | null; leadCurve: LeadBucket[]; falseAlarmRate?: number; nControl?: number; controlRegimes?: Record<string, ControlRegime>; conformal?: ConformalDoc }
export interface Manifest {
  W: number; H: number; nEp: number; days: number[]; classes: string[];
  cumScale: number; velScale: number; patch: number; components: string[];
  cases: CaseInfo[]; benchmark: Benchmark; forecast: Forecast;
}
export type Component = 'up' | 'east' | 'asc' | 'desc';
export interface CaseData {
  velUp: Float32Array; velEast: Float32Array; velAsc: Float32Array; velDesc: Float32Array;
  anomaly: Float32Array; classMap: Float32Array; coh: Float32Array; zone: Float32Array; cumUp: Int16Array;
}

const base = () => (import.meta.env.BASE_URL || '/');
let manifestCache: Promise<Manifest> | null = null;
const caseCache = new Map<string, Promise<CaseData>>();

export interface Grid { W: number; H: number; nEp: number; days: number[] }
/** The effective grid for a case: its own override (real cubes) or the synthetic global grid. */
export function gridOf(m: Manifest, c: CaseInfo): Grid {
  return { W: c.W ?? m.W, H: c.H ?? m.H, nEp: c.nEp ?? m.nEp, days: c.days ?? m.days };
}
/** The components a case exposes (a single-geometry real frame resolves only Up + Descending LOS). */
export function componentsOf(c: CaseInfo): Component[] {
  return c.components ?? ['up', 'east', 'asc', 'desc'];
}

export function loadManifest(): Promise<Manifest> {
  return (manifestCache ??= fetch(`${base()}tw-cases.json`).then((r) => r.json()));
}

export function loadCase(m: Manifest, c: CaseInfo): Promise<CaseData> {
  let p = caseCache.get(c.id);
  if (!p) {
    const g = gridOf(m, c);
    p = fetch(`${base()}tw-${c.id}.bin`).then((r) => r.arrayBuffer()).then((buf) => {
      const n = g.W * g.H; let o = 0;
      const f32 = () => { const a = new Float32Array(buf, o, n); o += n * 4; return a; };
      const velUp = f32(), velEast = f32(), velAsc = f32(), velDesc = f32(), anomaly = f32(), classMap = f32(), coh = f32(), zone = f32();
      const cumUp = new Int16Array(buf, o, g.nEp * n);
      return { velUp, velEast, velAsc, velDesc, anomaly, classMap, coh, zone, cumUp };
    });
    caseCache.set(c.id, p);
  }
  return p;
}

/** The velocity field for the chosen geometry/component. */
export function velOf(c: CaseData, comp: Component): Float32Array {
  return comp === 'east' ? c.velEast : comp === 'asc' ? c.velAsc : comp === 'desc' ? c.velDesc : c.velUp;
}
/** Cumulative-Up series (mm) at a pixel, over the case's own grid. */
export function seriesAt(g: Grid, cumScale: number, c: CaseData, x: number, y: number): number[] {
  const i = y * g.W + x, n = g.W * g.H, out: number[] = [];
  for (let e = 0; e < g.nEp; e++) out.push(c.cumUp[e * n + i] / cumScale);
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
