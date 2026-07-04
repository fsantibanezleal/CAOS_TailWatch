# ONNX / onnxruntime / onnxruntime-web

**What:** the portable model format (`onnx==1.22.0`) + the runtimes, `onnxruntime==1.27.0` (offline parity) and
`onnxruntime-web^1.27.0` (the live in-browser inference).
**Why binding:** ONNX is the contract between the heavy torch training lane and the light client-side lane. The
exported `cnn.onnx` (per-pixel series → 6 logits) and `ae.onnx` (16×16 velocity patch → reconstruction) are small
(39 KB + 110 KB) and committed under `data/derived/`.

## The version pin (load-bearing)

`frontend/src/lib/ort.ts` pins both the npm package AND the WASM CDN to the SAME version:
```ts
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';
ort.env.wasm.numThreads = 1;
```
A drift between the npm version and the `wasmPaths` CDN silently breaks the JS/WASM contract → no prediction. The
export opset (17) is compatible with onnxruntime-web 1.27.0.

## Usage

Offline export is part of `--retrain`. Live: click a pixel → its CNN class; the AE anomaly + CNN class maps for the
whole scene are precomputed into the cube (first paint), with the live ONNX matching them on demand.

## Applying to other data

The same ONNX runs on any conforming displacement series / velocity patch from a Contract-1 scene.
