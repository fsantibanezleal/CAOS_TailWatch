# deploy/

- **`pages.md`**, the DEFAULT: GitHub Pages static deploy (ADR-0055). Driven by
  `.github/workflows/deploy-pages.yml`. This is what almost every product uses.
- **`fasl-<slug>.service` / `<domain>.nginx` / `setup.sh` / `update.sh`**, dormant templates for the VPS path,
  used only when the `app/` backend is activated (an ADR-0002 trigger). **This solution does not require them at
  the moment**, they are kept as a one-switch on-ramp. Rename `<slug>`/`<domain>` and fill on activation.
