// Contract 2 mirror (frontend side). Must stay in lock-step with the Python schemas in
// data-pipeline/twlab/core/{trace.py, manifest.py}. A drift here makes `tsc` fail -> the contract is enforced at
// build time (the web cannot ship reading a shape the pipeline does not produce).

// ---------- per-case replay trace (tailwatch.trace/v1) ----------

export interface ForecastSummary {
  detectRate: number;
  nTraj?: number;
  medErrPct: number | null;
  leadCurve: Array<{ lo: number; hi: number; n: number; medErr: number | null }>;
}

export interface CaseTrace {
  schema: string; // "tailwatch.trace/v1"
  case_id: string;
  category: string;
  regime: string;
  real_or_synthetic: string;
  expected_band: string;
  labels: { en?: string; es?: string };
  latent?: number[];
  cube: string; // tw-<id>.bin
  grid: { W: number; H: number; nEp: number };
  benchmark: { macroF1: number; aeAuc: number; velAuc: number; heldOut: number[]; trainScenes: number };
  forecast: ForecastSummary | null;
}

// ---------- manifest (tailwatch.manifest/v2) + index ----------

export interface ArtifactRef { path: string; format: string; trace_schema: string; bytes: number; }

export interface GateVerdict {
  lane: string;
  client_side: boolean;
  runtimes: string[];
  trace_bytes: number;
  run_ms_budget: number;
  trace_bytes_budget: number;
  reasons: string[];
}

export interface SharedArtifacts {
  models: Array<{ id: string; file: string; opset: number; kind: string }>;
  manifest: string;
  forecast_benchmark: string;
}

export interface CaseManifest {
  schema: string; // "tailwatch.manifest/v2"
  case_id: string;
  category: string;
  regime: string;
  real_or_synthetic: string;
  expected_band: string;
  validation_anchor: string;
  engine: { package: string; version: string; model: string };
  dataset: string;
  split: string;
  seed: number;
  shared: SharedArtifacts;
  artifact: ArtifactRef;
  lane: 'live' | 'precompute';
  gate: GateVerdict;
  flags: Array<Record<string, unknown>>;
  metrics: Record<string, number>;
  honesty: string;
}

export interface CaseIndexEntry { case_id: string; category: string; regime: string; manifest_path: string; }

export interface CaseIndex {
  schema: string; // "tailwatch.index/v1"
  engine_version: string;
  dataset: string;
  n_cases: number;
  cases: CaseIndexEntry[];
}
