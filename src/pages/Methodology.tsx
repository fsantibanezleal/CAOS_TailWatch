import { Equation, InlineMath, Refs, useShellLang } from '@fasl-work/caos-app-shell';

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
