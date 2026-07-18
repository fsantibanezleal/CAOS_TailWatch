// Live in-browser inference of the committed ONNX models (the same conv-AE + 1-D CNN trained offline).
// Sessions load lazily on first use; the precomputed maps render instantly without them. The CNN runs on
// every clicked pixel (series → class probabilities). reconstructPatch (velocity patch → AE reconstruction
// + anomaly score) is exported but not yet wired to any UI: the App's anomaly readout is the precomputed
// map value (a live AE patch inspector is roadmap). WASM runtime is fetched from the pinned CDN build.
import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
ort.env.wasm.numThreads = 1;   // GitHub Pages has no COOP/COEP → single-threaded WASM

let cnn: Promise<ort.InferenceSession> | null = null;
let ae: Promise<ort.InferenceSession> | null = null;
const base = () => (import.meta.env.BASE_URL || '/');
const getCnn = () => (cnn ??= ort.InferenceSession.create(`${base()}cnn.onnx`));
const getAe = () => (ae ??= ort.InferenceSession.create(`${base()}ae.onnx`));

const softmax = (a: Float32Array | number[]) => { const m = Math.max(...a); const e = Array.from(a, (v) => Math.exp(v - m)); const s = e.reduce((x, y) => x + y, 0); return e.map((v) => v / s); };

// The committed cnn.onnx fixes the series length to 60. Real cubes have a different epoch count (e.g. 40), so
// linear-resample any series to 60 before inference (a 60-length series is unchanged). Matches the offline
// ingest (twlab.science.ingest_real._resample_to), so live and baked class maps agree.
const CNN_LEN = 60;
function resampleTo(series: number[], n: number): number[] {
  const L = series.length;
  if (L === n) return series.slice();
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const t = (i * (L - 1)) / (n - 1);
    const lo = Math.floor(t), hi = Math.min(lo + 1, L - 1);
    out[i] = series[lo] + (series[hi] - series[lo]) * (t - lo);
  }
  return out;
}

/** CNN: a per-pixel displacement series (any length, resampled to 60) → class probabilities (length 6). The
 * series is standardised exactly as in training. */
export async function classifySeries(raw: number[]): Promise<number[]> {
  const s = await getCnn();
  const series = resampleTo(raw, CNN_LEN);
  const mu = series.reduce((a, b) => a + b, 0) / series.length;
  const sd = Math.sqrt(series.reduce((a, b) => a + (b - mu) ** 2, 0) / series.length) || 1e-6;
  const x = Float32Array.from(series, (v) => (v - mu) / sd);
  const out = await s.run({ series: new ort.Tensor('float32', x, [1, 1, series.length]) });
  return softmax(out.logits.data as Float32Array);
}

/** AE: a 16×16 velocity patch (already /velScale) → { recon, anomaly = MSE(recon, patch) }. */
export async function reconstructPatch(patch: Float32Array, p = 16): Promise<{ recon: Float32Array; anomaly: number }> {
  const s = await getAe();
  const out = await s.run({ patch: new ort.Tensor('float32', patch, [1, 1, p, p]) });
  const recon = out.recon.data as Float32Array;
  let e = 0; for (let i = 0; i < patch.length; i++) e += (recon[i] - patch[i]) ** 2;
  return { recon, anomaly: e / patch.length };
}
