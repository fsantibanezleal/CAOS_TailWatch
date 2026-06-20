import { Equation, InlineMath, Refs, SubTabs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Methodology() {
  const es = useShellLang() === 'es';
  const tabs = [
    { id: 'phase', label: es ? 'Fase interferométrica' : 'Interferometric phase', content: <Phase es={es} /> },
    { id: 'sbas', label: es ? 'Inversión SBAS' : 'SBAS inversion', content: <Sbas es={es} /> },
    { id: 'decomp', label: es ? 'Descomposición 2-geometrías' : '2-geometry decomposition', content: <Decomp es={es} /> },
    { id: 'temporal', label: es ? 'Modelado temporal' : 'Temporal modelling', content: <Temporal es={es} /> },
    { id: 'learned', label: es ? 'Métodos aprendidos' : 'Learned methods', content: <Learned es={es} /> },
    { id: 'decision', label: es ? 'Decisión' : 'Decision', content: <Decision es={es} /> },
  ];
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Metodología' : 'Methodology'}</h1>
        <p className="lede">{es ? 'De la fase interferométrica al cubo de desplazamiento, las componentes vertical/Este, el modelado temporal y los métodos aprendidos — con la física término por término y la frontera honesta entre lo clásico y lo aprendido.' : 'From the interferometric phase to the displacement cube, the vertical/East components, the temporal modelling and the learned methods — with the physics term by term and the honest boundary between classical and learned.'}</p>
      </div>
      <section><SubTabs tabs={tabs} ariaLabel="methodology" /></section>
    </div>
  );
}

function Phase({ es }: { es: boolean }) {
  return (<>
    <p>{es ? 'Un interferograma mide la diferencia de fase entre dos pasadas SAR. Esa fase mezcla la deformación con varias contribuciones, todas módulo 2π:' : 'An interferogram measures the phase difference between two SAR passes. That phase mixes deformation with several contributions, all modulo 2π:'}</p>
    <Equation tex={String.raw`\phi_{\text{int}} = \phi_{\text{defo}} + \phi_{\text{topo}} + \phi_{\text{atmo}} + \phi_{\text{orbit}} + \phi_{\text{noise}} \pmod{2\pi},\qquad \phi_{\text{defo}} = -\tfrac{4\pi}{\lambda}\, d_{\text{LOS}}`} />
    <p>{es ? 'Para Sentinel-1 (banda C, λ = 5.546 cm) una franja completa de 2π equivale a λ/2 ≈ 2.77 cm de cambio de rango en línea de vista — el techo de ambigüedad de fase por par. El error topográfico escala con la línea base perpendicular; la atmósfera (APS) es espacialmente correlacionada pero temporalmente no; la decorrelación crece con la línea base temporal.' : 'For Sentinel-1 (C-band, λ = 5.546 cm) one full 2π fringe equals λ/2 ≈ 2.77 cm of line-of-sight range change — the per-pair phase-ambiguity ceiling. Topographic error scales with the perpendicular baseline; the atmosphere (APS) is spatially correlated but temporally uncorrelated; decorrelation grows with the temporal baseline.'}</p>
    <Refs ids={['hanssen2001', 'zebker1992', 'fattahi2013']} label="Refs" />
  </>);
}

function Sbas({ es }: { es: boolean }) {
  return (<>
    <p>{es ? 'SBAS (Berardino 2002) invierte una red de interferogramas de línea base pequeña en una serie temporal de desplazamiento por píxel. Con M pares e N incrementos de época, la matriz de diseño G (M×N) relaciona las fases observadas con las velocidades inter-época; se resuelve por mínimos cuadrados, y cuando la red se desconecta se reparametriza en velocidad y se usa la pseudoinversa de norma mínima (SVD):' : 'SBAS (Berardino 2002) inverts a small-baseline network of interferograms into a per-pixel displacement time-series. With M pairs and N epoch increments, the design matrix G (M×N) relates the observed phases to inter-epoch velocities; it is solved by least squares, and when the network disconnects it is reparametrised in velocity and solved by the minimum-norm pseudoinverse (SVD):'}</p>
    <Equation tex={String.raw`G\,\mathbf{v} = \delta\boldsymbol{\phi},\qquad \hat{\mathbf{v}} = G^{+}\,\delta\boldsymbol{\phi}\ \ (\text{SVD min-norm}),\qquad \mathbf{d} = \textstyle\int \mathbf{v}\,dt`} />
    <p>{es ? 'El cubo resultante usa el esquema LiCSBAS cum.h5, así que un caso sintético se abre con el mismo lector que una salida LiCSBAS real. El enfoque SAR y la inversión multi-anual completa son precálculo offline; el motor liviano corre sobre el cubo.' : 'The resulting cube uses the LiCSBAS cum.h5 schema, so a synthetic case opens with the same reader as a real LiCSBAS output. SAR focusing and the full multi-year inversion are offline precompute; the light engine runs on the cube.'}</p>
    <Refs ids={['berardino2002', 'morishita2020']} label="Refs" />
  </>);
}

function Decomp({ es }: { es: boolean }) {
  return (<>
    <p>{es ? 'Una sola pasada mide solo la PROYECCIÓN del movimiento 3-D sobre su línea de vista. Con incidencia θ ≈ 39°, una pasada ascendente (mira al este) y una descendente (mira al oeste) registran:' : 'A single pass measures only the PROJECTION of the 3-D motion onto its line of sight. With incidence θ ≈ 39°, an ascending pass (looks east) and a descending pass (looks west) record:'}</p>
    <Equation tex={String.raw`d_{\text{asc}} = \sin\theta\,m_E + \cos\theta\,m_U,\qquad d_{\text{desc}} = -\sin\theta\,m_E + \cos\theta\,m_U`} />
    <p>{es ? 'Resolviendo el sistema 2×2 se recuperan la vertical y el Este:' : 'Solving the 2×2 system recovers the vertical and East:'}</p>
    <Equation tex={String.raw`m_U = \frac{d_{\text{asc}} + d_{\text{desc}}}{2\cos\theta},\qquad m_E = \frac{d_{\text{asc}} - d_{\text{desc}}}{2\sin\theta}`} />
    <p>{es ? <>La componente Norte–Sur queda en el espacio nulo (ambos vectores casi polares tienen sensibilidad Norte ≈ 0), así que <InlineMath tex={String.raw`m_N`} /> es inobservable con dos pasadas — y la app lo declara en vez de fingir un campo 3-D completo.</> : <>The North–South component lies in the null space (both near-polar vectors have North sensitivity ≈ 0), so <InlineMath tex={String.raw`m_N`} /> is unobservable from two passes — and the app states this rather than faking a full 3-D field.</>}</p>
    <Refs ids={['wright2004']} label="Refs" />
  </>);
}

function Temporal({ es }: { es: boolean }) {
  return (<>
    <p>{es ? 'Por píxel se ajusta un modelo temporal (lineal + estacional + escalón) y se evalúa su significancia con el estadístico t de la pendiente, separando una tendencia real del ruido:' : 'Per pixel a temporal model (linear + seasonal + step) is fit and its significance evaluated by the slope t-statistic, separating a real trend from noise:'}</p>
    <Equation tex={String.raw`d(t) = v\,t + a\sin\!\tfrac{2\pi t}{365} + b\cos\!\tfrac{2\pi t}{365} + s\,\mathbb{1}[t>t_0] + \varepsilon,\qquad t_v = \frac{\hat v}{\mathrm{se}(\hat v)}`} />
    <p>{es ? 'Para creep terciario (Fukuzono, α≈2) la velocidad inversa 1/v decrece linealmente hacia cero en el tiempo de falla t_f; un ajuste lineal a 1/v en la ventana terminal proyecta t_f como el intercepto x — reportado con intervalo, nunca una fecha desnuda, y con compuerta de calidad de ajuste.' : 'For tertiary creep (Fukuzono, α≈2) the inverse velocity 1/v decreases linearly toward zero at the failure time t_f; a linear fit to 1/v on the terminal window projects t_f as the x-intercept — reported as an interval, never a bare date, gated on fit quality.'}</p>
    <Refs ids={['fukuzono1985', 'carla2017']} label="Refs" />
  </>);
}

function Learned({ es }: { es: boolean }) {
  return (<>
    <h3>{es ? 'Autoencoder convolucional (anomalía no supervisada)' : 'Convolutional autoencoder (unsupervised anomaly)'}</h3>
    <p>{es ? 'Un autoencoder denoising se entrena SOLO con parches normales de velocidad: corrompe la entrada y reconstruye el parche limpio. Como el cuello de botella es estrecho y solo vio lo normal, reconstruye mal lo anómalo → el error de reconstrucción es un puntaje de anomalía no supervisado:' : 'A denoising autoencoder is trained ONLY on normal velocity patches: it corrupts the input and reconstructs the clean patch. With a tight bottleneck and having seen only normal, it reconstructs anomalies poorly → the reconstruction error is an unsupervised anomaly score:'}</p>
    <Equation tex={String.raw`\mathcal{L} = \lVert x - g_\phi(f_\theta(\tilde x))\rVert^2,\quad \tilde x = x + \eta,\qquad \text{anomaly}(x) = \lVert x - \hat x\rVert^2`} />
    <p>{es ? 'Un AE simple puede reconstruir también las anomalías (atajo de identidad; el cuello de botella solo no basta — Bouman & Heskes 2025); el denoising + el cuello estrecho lo mitigan, y la memoria aumentada (MemAE, Gong 2019) es el paso siguiente. El AE convolucional para InSAR está establecido (Rouet-Leduc 2021; Anantrasirichai 2018).' : 'A plain AE can reconstruct anomalies too (identity shortcut; the bottleneck alone is insufficient — Bouman & Heskes 2025); denoising + a tight bottleneck mitigate it, and memory augmentation (MemAE, Gong 2019) is the next step. The convolutional AE for InSAR is established (Rouet-Leduc 2021; Anantrasirichai 2018).'}</p>
    <Refs ids={['vincent2008', 'bouman2025', 'gong2019', 'rouetleduc2021', 'anantra2018']} label="Refs" />
    <h3>{es ? 'CNN 1-D (clasificación de firma)' : '1-D CNN (signature classification)'}</h3>
    <p>{es ? 'Un CNN 1-D (estilo WDCNN) clasifica la serie temporal de cada píxel en seis tipos {estable, creep lineal, acelerando, estacional, escalón, decorrelado} — capacidad que la velocidad (solo magnitud) no tiene. La saliencia Grad-CAM muestra qué parte de la serie mira el modelo. Las clases confusables (estable/lineal, estacional/decorrelado) bajan el macro-F1 honestamente.' : 'A 1-D CNN (WDCNN-style) classifies each pixel\'s time-series into six types {stable, linear creep, accelerating, seasonal, step, decorrelated} — capability velocity (magnitude only) lacks. Grad-CAM saliency shows which part of the series the model attends to. Confusable classes (stable/linear, seasonal/decorrelated) lower the macro-F1 honestly.'}</p>
    <Refs ids={['zhang2017', 'mirmaz2022', 'selvaraju2017', 'mcinnes2018']} label="Refs" />
  </>);
}

function Decision({ es }: { es: boolean }) {
  return (<>
    <p>{es ? 'La capa de decisión fusiona la velocidad de estado y el pronóstico: una alarma TARP por niveles (verde/ámbar/rojo) con dos gatillos paralelos — la velocidad |LOS| y el tiempo-a-falla proyectado por velocidad inversa. La estructura de bandas es práctica de la industria (GISTM/ANCOLD/CDA); los cortes en mm/yr y días son valores por defecto configurables, NO límites regulatorios.' : 'The decision layer fuses the state velocity and the forecast: a tiered TARP alarm (green/amber/red) with two parallel triggers — the |LOS| velocity and the inverse-velocity projected time-to-failure. The band structure is industry practice (GISTM/ANCOLD/CDA); the mm/yr and day cut-points are configurable defaults, NOT regulatory limits.'}</p>
    <p>{es ? 'El mapa de clase del CNN y el mapa de anomalía del AE alimentan la auditoría: una alarma por velocidad sobre un píxel clasificado "estacional" o "decorrelado" se baja de prioridad; una anomalía AE sin firma de velocidad se eleva para inspección. Honesto: InSAR puede perder una falla rápida por licuefacción; es un tamiz continuo, no una garantía.' : 'The CNN class map and the AE anomaly map feed the audit: a velocity alarm on a pixel classified "seasonal" or "decorrelated" is de-prioritised; an AE anomaly with no velocity signature is raised for inspection. Honest: InSAR can miss a fast liquefaction failure; it is a continuous screen, not a guarantee.'}</p>
    <Refs ids={['grebby2021', 'carla2017']} label="Refs" />
  </>);
}
