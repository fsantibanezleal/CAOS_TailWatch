import { Equation, InlineMath, Refs, useShellLang } from '@fasl-work/caos-app-shell';

/** Two-geometry LOS decomposition — theme-aware schematic: a ground target moving down + outward, seen by an
 * ascending (looks east) and a descending (looks west) Sentinel-1 pass at incidence θ; each measures only the
 * projection onto its line of sight, so the two combine to Up + East but stay blind to North–South. */
function GeometrySVG({ es }: { es: boolean }) {
  const Px = 320, Py = 246, S = 0.629, C = 0.777, L = 232;            // P, sinθ, cosθ, ray length
  const ax = Px + L * S, ay = Py - L * C, dx = Px - L * S, dy = Py - L * C;
  return (
    <svg viewBox="0 0 640 330" width="100%" style={{ maxWidth: 640, display: 'block', margin: '0.5rem auto', font: '13px var(--font-sans, sans-serif)' }} role="img"
      aria-label={es ? 'Esquema de descomposición LOS de dos geometrías' : 'Two-geometry LOS decomposition schematic'}>
      <defs>
        <marker id="ah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="var(--color-accent)" /></marker>
        <marker id="ahm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="#e5534b" /></marker>
      </defs>
      {/* ground */}
      <line x1="40" y1={Py} x2="600" y2={Py} stroke="var(--color-fg-subtle)" strokeWidth="1.5" />
      <line x1="40" y1={Py + 5} x2="600" y2={Py + 5} stroke="var(--color-border)" strokeWidth="9" strokeDasharray="2 5" opacity="0.5" />
      <text x="44" y={Py + 26} fill="var(--color-fg-subtle)">{es ? 'superficie / corona de la presa' : 'ground / dam crest'}</text>
      {/* LOS rays (ground→satellite look vectors) */}
      <line x1={Px} y1={Py} x2={ax} y2={ay} stroke="var(--color-accent)" strokeWidth="1.6" strokeDasharray="6 4" markerEnd="url(#ah)" />
      <line x1={Px} y1={Py} x2={dx} y2={dy} stroke="var(--color-accent)" strokeWidth="1.6" strokeDasharray="6 4" markerEnd="url(#ah)" />
      {/* vertical reference at P */}
      <line x1={Px} y1={Py} x2={Px} y2={Py - 150} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 4" />
      {/* incidence-angle arcs */}
      <path d={`M ${Px} ${Py - 54} A 54 54 0 0 0 ${Px + 54 * S} ${Py - 54 * C}`} fill="none" stroke="var(--color-fg-subtle)" strokeWidth="1" />
      <path d={`M ${Px} ${Py - 54} A 54 54 0 0 1 ${Px - 54 * S} ${Py - 54 * C}`} fill="none" stroke="var(--color-fg-subtle)" strokeWidth="1" />
      <text x={Px + 20} y={Py - 58} fill="var(--color-fg-subtle)">θ≈39°</text>
      <text x={Px - 46} y={Py - 58} fill="var(--color-fg-subtle)">θ</text>
      {/* satellites */}
      {[[ax, ay, es ? 'Pasada ascendente' : 'Ascending pass', es ? '(mira al este)' : '(looks east)', 8], [dx, dy, es ? 'Pasada descendente' : 'Descending pass', es ? '(mira al oeste)' : '(looks west)', -150]].map(([x, y, l1, l2, ox], i) => (
        <g key={i}>
          <rect x={(x as number) - 11} y={(y as number) - 7} width="22" height="14" rx="2" fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="1.4" />
          <line x1={(x as number) - 18} y1={y as number} x2={(x as number) - 11} y2={y as number} stroke="var(--color-accent)" strokeWidth="2" />
          <line x1={(x as number) + 11} y1={y as number} x2={(x as number) + 18} y2={y as number} stroke="var(--color-accent)" strokeWidth="2" />
          <text x={(x as number) + (ox as number)} y={(y as number) - 14} fill="var(--color-fg)" fontWeight="600">{l1 as string}</text>
          <text x={(x as number) + (ox as number)} y={(y as number) + 1} fill="var(--color-fg-subtle)">{l2 as string}</text>
        </g>
      ))}
      {/* true motion vector (down + east) + components */}
      <line x1={Px} y1={Py} x2={Px + 54} y2={Py + 60} stroke="#e5534b" strokeWidth="2.4" markerEnd="url(#ahm)" />
      <line x1={Px} y1={Py} x2={Px} y2={Py + 60} stroke="var(--color-fg)" strokeWidth="1.3" strokeDasharray="4 3" />
      <line x1={Px} y1={Py + 60} x2={Px + 54} y2={Py + 60} stroke="var(--color-fg)" strokeWidth="1.3" strokeDasharray="4 3" />
      <text x={Px + 60} y={Py + 52} fill="#e5534b" fontWeight="600">{es ? 'movimiento real' : 'true motion'}</text>
      <text x={Px - 64} y={Py + 44} fill="var(--color-fg)">Up</text>
      <text x={Px + 14} y={Py + 76} fill="var(--color-fg)">East</text>
      <circle cx={Px} cy={Py} r="3.2" fill="var(--color-fg)" />
    </svg>
  );
}

export default function Methodology() {
  const es = useShellLang() === 'es';
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Metodología' : 'Methodology'}</h1>
        <p className="lede">{es ? 'De la fase interferométrica a la serie temporal de desplazamiento — clásico a SOTA, con la frontera honesta entre lo que se precalcula y lo que corre en vivo.' : 'From interferometric phase to a displacement time-series — classical to SOTA, with the honest boundary between what is precomputed and what runs live.'}</p>
      </div>
      <section>
        <h2>{es ? 'La fase interferométrica' : 'The interferometric phase'}</h2>
        <p>{es
          ? 'Un interferograma mide la diferencia de fase entre dos pasadas SAR. Esa fase mezcla la deformación con varias contribuciones, todas módulo 2π:'
          : 'An interferogram measures the phase difference between two SAR passes. That phase mixes deformation with several contributions, all modulo 2π:'}</p>
        <Equation tex={String.raw`\phi_{\text{int}} = \phi_{\text{defo}} + \phi_{\text{topo}} + \phi_{\text{atmo}} + \phi_{\text{orbit}} + \phi_{\text{noise}} \pmod{2\pi},\qquad \phi_{\text{defo}} = -\tfrac{4\pi}{\lambda}\, d_{\text{LOS}}`} />
        <p>{es
          ? 'Para Sentinel-1 (banda C, λ = 5.546 cm) una franja completa de 2π equivale a λ/2 ≈ 2.77 cm de cambio de rango en línea de vista (LOS) — el techo de ambigüedad de fase por par. El movimiento más rápido que esto entre dos adquisiciones se aliasa y se sub-mide, justo cuando una falla acelera.'
          : 'For Sentinel-1 (C-band, λ = 5.546 cm) one full 2π fringe equals λ/2 ≈ 2.77 cm of line-of-sight (LOS) range change — the per-pair phase-ambiguity ceiling. Motion faster than this between two acquisitions aliases and is under-measured, exactly when a failure is accelerating.'}</p>
        <Refs ids={['hanssen2001']} label="Refs" />

        <h2>{es ? 'Estimación de serie temporal' : 'Time-series estimation'}</h2>
        <p>{es
          ? 'Una red de interferogramas de línea base pequeña se invierte en una serie temporal de desplazamiento por píxel. SBAS (Berardino 2002, implementado en el ecosistema LiCSBAS) usa pares de baja decorrelación y SVD para los gaps de red; PSI/StaMPS (Ferretti 2001) rastrea dispersores puntuales coherentes; SqueeSAR/DS enlaza la fase de blancos distribuidos. La corrección atmosférica (GACOS, Yu 2018) y el desenrollado estadístico (SNAPHU, Chen 2001) son pasos pesados precalculados.'
          : 'A small-baseline network of interferograms is inverted into a per-pixel displacement time-series. SBAS (Berardino 2002, implemented in the LiCSBAS ecosystem) uses low-decorrelation pairs and SVD for network gaps; PSI/StaMPS (Ferretti 2001) tracks coherent point scatterers; SqueeSAR/DS phase-links distributed targets. Atmospheric correction (GACOS, Yu 2018) and statistical unwrapping (SNAPHU, Chen 2001) are heavy precomputed steps.'}</p>
        <Refs ids={['berardino2002', 'ferretti2001', 'morishita2020', 'yu2018gacos', 'chen2001snaphu']} label="Refs" />

        <h2>{es ? 'Descomposición de dos geometrías' : 'Two-geometry decomposition'}</h2>
        <p>{es
          ? 'Una sola pasada mide únicamente la PROYECCIÓN del movimiento 3-D real sobre su línea de vista — no el movimiento mismo. Con el vector de visión (Este, Norte, Up) de Sentinel-1 a incidencia θ ≈ 39°, una pasada ascendente (mira al este) y una descendente (mira al oeste) registran:'
          : 'A single pass measures only the PROJECTION of the true 3-D motion onto its line of sight — not the motion itself. With the Sentinel-1 look vector (East, North, Up) at incidence θ ≈ 39°, an ascending pass (looks east) and a descending pass (looks west) record:'}</p>
        <Equation tex={String.raw`d_{\text{asc}} = \sin\theta\,m_E + \cos\theta\,m_U,\qquad d_{\text{desc}} = -\sin\theta\,m_E + \cos\theta\,m_U`} />
        <GeometrySVG es={es} />
        <p>{es
          ? 'Por eso una LOS ascendente y una descendente crudas DISCREPAN sobre la misma presa: la discrepancia ES la componente horizontal. Resolviendo el sistema 2×2 se recuperan las componentes vertical y Este:'
          : 'This is why a raw ascending and a raw descending LOS DISAGREE over the same dam: the disagreement IS the horizontal component. Solving the 2×2 system recovers the vertical and East components:'}</p>
        <Equation tex={String.raw`m_U = \frac{d_{\text{asc}} + d_{\text{desc}}}{2\cos\theta},\qquad m_E = \frac{d_{\text{asc}} - d_{\text{desc}}}{2\sin\theta}`} />
        <p>{es
          ? <>El Up descompuesto promedia las dos geometrías → menos ruido que cualquier LOS sola, y es el indicador de falla más limpio (el colapso de un relave es dominantemente vertical). La componente Norte–Sur queda en el espacio nulo: ambos vectores de visión casi polares tienen sensibilidad Norte ≈ 0, así que <InlineMath tex={String.raw`m_N`} /> es inobservable con dos pasadas y la app lo declara explícitamente en vez de fingir un campo 3-D completo.</>
          : <>The decomposed Up averages the two geometries → lower noise than either LOS alone, and it is the cleanest failure indicator (a tailings collapse is dominantly vertical). The North–South component lies in the null space: both near-polar look vectors have North sensitivity ≈ 0, so <InlineMath tex={String.raw`m_N`} /> is unobservable from two passes — and the app states this rather than faking a full 3-D field.</>}</p>
        <Refs ids={['wright2004', 'hanssen2001']} label="Refs" />

        <h2>{es ? 'La frontera precálculo / en vivo' : 'The precompute / live boundary'}</h2>
        <p>{es
          ? 'Frontera honesta y fija: el enfoque SAR, la inversión de red multi-anual, la sustracción GACOS, el desenrollado y el entrenamiento DL son PRECÁLCULO offline → un cubo de desplazamiento compacto y determinista. En VIVO corre el tier liviano sobre ese cubo: ajuste temporal por píxel, descomposición ascendente+descendente a vertical/E–O (Wright 2004), velocidad/aceleración, velocidad inversa y las alarmas. TailWatch nunca enfoca SAR ni desenrolla un cuadro completo al vuelo.'
          : 'The boundary is fixed and honest: SAR focusing, multi-year network inversion, GACOS subtraction, unwrapping and DL training are offline PRECOMPUTE → a compact, deterministic displacement cube. The light tier runs LIVE on that cube: per-pixel temporal fit, ascending+descending decomposition to vertical/E–W (Wright 2004), velocity/acceleration, inverse-velocity and the alarms. TailWatch never focuses SAR nor unwraps a full frame on the fly.'}</p>
        <Refs ids={['wright2004']} label="Refs" />
        <p className="muted small">{es ? 'El espacio de color para cantidades con signo (velocidad/desplazamiento LOS) es vik diverging centrado en cero (Crameri 2018); la convención de signo (negativo = alejándose/hundimiento) se muestra siempre en pantalla.' : 'The colour space for signed quantities (LOS velocity/displacement) is zero-centred vik diverging (Crameri 2018); the sign convention (negative = away/subsiding) is shown on-screen at all times.'} <InlineMath tex={String.raw`v_{\text{LOS}} = \partial d_{\text{LOS}}/\partial t`} /></p>
        <Refs ids={['crameri2018']} label="Refs" />
      </section>
    </div>
  );
}
