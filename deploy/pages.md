# Deploy, GitHub Pages (default, static deterministic-replay)

The default deploy for this archetype (ADR-0055 Pages-first): the SPA + the committed artifacts are served
statically; there is **no backend** at request time. The workflow `.github/workflows/deploy-pages.yml`:

1. regenerates the artifacts deterministically (`python -m twlab.pipeline all`) so the site replays fresh,
   audited outputs;
2. builds the frontend (`cd frontend && npm ci && npm run build`, `copy-data.mjs` overlays `data/derived` into
   `public/`);
3. uploads `frontend/dist` and deploys to Pages.

Enable once per product: repo **Settings → Pages → Source = GitHub Actions**. Custom domain: set via
`gh api PUT repos/<owner>/<repo>/pages -f cname=<sub>.fasl-work.com` (the CNAME file alone does not set the domain
on Actions deploys, see the CAOS_MANAGE reference note).

The VPS path (`setup.sh`/`update.sh` + the systemd/nginx templates here) stays **dormant** unless the `app/`
backend is activated (ADR-0002).
