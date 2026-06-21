// Prebuild overlay: copy the committed CONTRACT-2 artifacts (../data/derived) into the SPA's public/ so the static
// site serves them. Canonical copies live in ../data/derived — public/ is a build-time overlay (git-ignored). The
// served paths match what frontend/src/lib/ort.ts + data/demo.ts fetch (root: /cnn.onnx, /ae.onnx, /tw-cases.json,
// /tw-<id>.bin, /forecast-benchmark.json); manifests + per-case traces go under /data/ for the index loader.
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DERIVED = join(ROOT, 'data', 'derived');
const PUB = join(HERE, 'public');

if (!existsSync(DERIVED)) {
  console.warn('[copy-data] no data/derived — run scripts/precompute first');
  process.exit(0);
}
mkdirSync(PUB, { recursive: true });

// 1) the live-lane artifacts the SPA fetches from the site root (the onnx, the cubes, the rich manifest, the benchmark)
for (const f of readdirSync(DERIVED)) {
  if (f.endsWith('.onnx') || f.endsWith('.bin') || f === 'tw-cases.json' || f === 'forecast-benchmark.json') {
    copyFileSync(join(DERIVED, f), join(PUB, f));
  }
}

// 2) the CONTRACT-2 manifests + per-case traces -> public/data (the index loader reads /data/manifests/index.json)
mkdirSync(join(PUB, 'data'), { recursive: true });
cpSync(DERIVED, join(PUB, 'data'), { recursive: true });
console.log('[copy-data] data/derived -> public/ (root onnx+cubes+manifest + /data manifests+traces) OK');
