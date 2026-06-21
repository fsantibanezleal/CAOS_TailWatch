// Live in-browser inference of the committed ONNX models (the same conv-AE + 1-D CNN trained offline).
// Sessions load lazily on first use; the precomputed maps render instantly without them, and the live
// inference enriches the click-to-inspect (a clicked pixel's series → CNN class probabilities; its velocity
// patch → AE reconstruction + anomaly score). WASM runtime is fetched from the pinned CDN build.
import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
ort.env.wasm.numThreads = 1;   // GitHub Pages has no COOP/COEP → single-threaded WASM

let cnn: Promise<ort.InferenceSession> | null = null;
let ae: Promise<ort.InferenceSession> | null = null;
const base = () => (import.meta.env.BASE_URL || '/');
const getCnn = () => (cnn ??= ort.InferenceSession.create(`${base()}cnn.onnx`));
const getAe = () => (ae ??= ort.InferenceSession.create(`${base()}ae.onnx`));

const softmax = (a: Float32Array | number[]) => { const m = Math.max(...a); const e = Array.from(a, (v) => Math.exp(v - m)); const s = e.reduce((x, y) => x + y, 0); return e.map((v) => v / s); };

/** CNN: a per-pixel displacement series (length 60) → class probabilities (length 6). The series is
 * standardised exactly as in training. */
export async function classifySeries(series: number[]): Promise<number[]> {
  const s = await getCnn();
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
