# 04, The `app/` backend (dormant)

TailWatch is static deterministic-replay: the SPA + the committed artifacts serve from GitHub Pages with **no backend
at request time** (the ONNX + the TS DSP run entirely in the browser). The `app/` FastAPI module ships dormant (it
compiles; `requirements-api.txt` is commented out) and this solution does not require it.

Activate only on an ADR-0002 trigger (server-side processing of uploaded SAR stacks, auth-gated private data, or paid
heavy compute). Then: fill `requirements-api.txt`, implement the routes over `data-pipeline/twlab` (import it, never
re-implement), enable the `deploy/fasl-slug.service` + `deploy/domain.nginx` VPS templates, and add CORS/COOP-COEP
headers (which would also unlock threaded WASM for the live lane). See `app/README.md`.
