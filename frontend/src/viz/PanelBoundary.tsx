import { Component, type ReactNode } from 'react';

// Per-panel error boundary: a crash inside one method tab (e.g. a tool fed an edge-case real scene lacking the
// geometry it needs) renders a small inline message INSTEAD of unmounting the whole App to a blank page. The tab
// bar stays usable so the user can switch away. Mirrors the RotorVitals PanelBoundary (the reference app).
export class PanelBoundary extends Component<{ children: ReactNode; lang?: 'en' | 'es' }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const es = this.props.lang === 'es';
      return (
        <div className="tw-note" style={{ padding: '1rem', color: 'var(--color-fg-faint)' }}>
          <strong>{es ? 'Esta herramienta no aplica a esta fuente' : 'This tool does not apply to this source'}</strong>
          <p className="tw-hint" style={{ marginTop: '0.4rem' }}>
            {es
              ? 'No se pudo computar esta vista sobre el dato actual (p. ej. una escena sin la geometría o el formato que la herramienta requiere). Seleccionar otra pestaña o fuente.'
              : 'This view could not be computed on the current datum (e.g. a scene lacking the geometry or format the tool needs). Pick another tab or source.'}
          </p>
          <p className="tw-hint" style={{ opacity: 0.6, fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }}>{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
