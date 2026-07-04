"""The archetype's pure-Python analytic-core slot (Pyodide-safe, shared offline+live in products that use it).
TailWatch does not use it: the live lane is a TypeScript DSP (frontend/src/dsp/) + onnxruntime-web, and the heavy
engines live in twlab/science/ (offline only). Kept empty to preserve the ADR-0057 package layout."""
