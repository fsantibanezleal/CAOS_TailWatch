import { Equation, InlineMath, Refs, SubTabs, useShellLang } from '@fasl-work/caos-app-shell';

const AR = (id: string) => <defs><marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="var(--color-fg-subtle)" /></marker></defs>;
const svgStyle = { maxWidth: 560, display: 'block', margin: '0.5rem auto', font: '11px var(--font-sans, sans-serif)' } as const;

export default function Methodology() {
  const es = useShellLang() === 'es';
  const tabs = [
    { id: 'phase', label: es ? 'Fase interferométrica' : 'Interferometric phase', content: <Phase es={es} /> },
    { id: 'sbas', label: es ? 'Inversión SBAS' : 'SBAS inversion', content: <Sbas es={es} /> },
    { id: 'decomp', label: es ? 'Descomposición 2-geom.' : '2-geometry decomposition', content: <Decomp es={es} /> },
    { id: 'temporal', label: es ? 'Modelado temporal' : 'Temporal modelling', content: <Temporal es={es} /> },
    { id: 'learned', label: es ? 'Métodos aprendidos' : 'Learned methods', content: <Learned es={es} /> },
    { id: 'decision', label: es ? 'Decisión' : 'Decision', content: <Decision es={es} /> },
  ];
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Metodología' : 'Methodology'}</h1>
        <p className="lede">{es ? 'De la fase interferométrica al cubo de desplazamiento, las componentes vertical/Este, el modelado temporal y los métodos aprendidos, con la física término por término y un diagrama por método.' : 'From the interferometric phase to the displacement cube, the vertical/East components, the temporal modelling and the learned methods, with the physics term by term and a diagram per method.'}</p>
      </div>
      <section><SubTabs tabs={tabs} ariaLabel="methodology" /></section>
    </div>
  );
}

function Phase({ es }: { es: boolean }) {
  const terms: [string, number, string][] = [['φ_defo', 0.30, 'var(--color-accent)'], ['φ_topo', 0.18, '#3fb950'], ['φ_atmo', 0.28, '#d29922'], ['φ_orbit', 0.12, '#bc8cff'], ['φ_noise', 0.12, '#6e7681']];
  let acc = 0;
  return (<>
    <p>{es ? 'Un interferograma mide la diferencia de fase entre dos pasadas SAR. Esa fase mezcla la deformación con varias contribuciones, todas módulo 2π:' : 'An interferogram measures the phase difference between two SAR passes. That phase mixes deformation with several contributions, all modulo 2π:'}</p>
    <Equation tex={String.raw`\phi_{\text{int}} = \phi_{\text{defo}} + \phi_{\text{topo}} + \phi_{\text{atmo}} + \phi_{\text{orbit}} + \phi_{\text{noise}} \pmod{2\pi},\qquad \phi_{\text{defo}} = -\tfrac{4\pi}{\lambda}\, d_{\text{LOS}}`} />
    <svg viewBox="0 0 560 90" width="100%" style={svgStyle} role="img" aria-label="phase budget">
      {terms.map(([l, w, c], i) => { const x = 10 + acc * 540; acc += w; return (<g key={i}><rect x={x} y={26} width={w * 540 - 2} height="26" rx="3" fill={c} opacity="0.8" /><text x={x + w * 270} y={43} textAnchor="middle" fill="#0d1117" fontSize="10.5" fontWeight="600">{l}</text></g>); })}
      <text x="10" y="18" fill="var(--color-fg-subtle)">{es ? 'la fase observada = suma de contribuciones (solo φ_defo es señal)' : 'observed phase = sum of contributions (only φ_defo is signal)'}</text>
      <text x="10" y="72" fill="var(--color-fg-subtle)">{es ? '1 franja 2π = λ/2 ≈ 2.77 cm (techo de ambigüedad por par)' : '1 fringe 2π = λ/2 ≈ 2.77 cm (per-pair ambiguity ceiling)'}</text>
    </svg>
    <Refs ids={['hanssen2001', 'zebker1992', 'fattahi2013']} label="Refs" />
  </>);
}

function Sbas({ es }: { es: boolean }) {
  const ep = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ x: 40 + i * 65, bp: [0, 40, -30, 60, 10, -50, 20, -10][i] }));
  const pairs: [number, number][] = [[0, 1], [1, 2], [0, 2], [2, 3], [3, 4], [2, 4], [4, 5], [5, 6], [4, 6], [6, 7]];
  const yOf = (bp: number) => 70 - bp * 0.45;
  return (<>
    <p>{es ? 'SBAS (Berardino 2002) invierte una red de interferogramas de línea base pequeña en una serie temporal por píxel. La matriz de diseño G (M pares × N incrementos) se resuelve por mínimos cuadrados; si la red se desconecta, se reparametriza en velocidad y se usa la pseudoinversa de norma mínima (SVD).' : 'SBAS (Berardino 2002) inverts a small-baseline interferogram network into a per-pixel time-series. The design matrix G (M pairs × N increments) is solved by least squares; if the network disconnects it is reparametrised in velocity and solved by the minimum-norm pseudoinverse (SVD).'}</p>
    <p>{es ? 'Nota de alcance: esta pestaña enseña la inversión; el pipeline de TailWatch no la ejecuta. El modelo forward emite directamente el desplazamiento por época que esa inversión recuperaría, y el motor ejecuta la descomposición 2-geometrías y la velocidad OLS sobre él. Ejecutar la inversión de red es roadmap.' : 'Scope note: this tab teaches the inversion; the TailWatch pipeline does not run it. The forward model emits directly the per-epoch displacement that inversion would recover, and the engine runs the 2-geometry decomposition and OLS velocity on it. Running the network inversion is roadmap.'}</p>
    <Equation tex={String.raw`G\,\mathbf{v} = \delta\boldsymbol{\phi},\qquad \hat{\mathbf{v}} = G^{+}\,\delta\boldsymbol{\phi}\ (\text{SVD}),\qquad \mathbf{d} = \textstyle\int \mathbf{v}\,dt`} />
    <svg viewBox="0 0 560 140" width="100%" style={svgStyle} role="img" aria-label="SBAS network">
      {pairs.map(([a, b], i) => <line key={i} x1={ep[a].x} y1={yOf(ep[a].bp)} x2={ep[b].x} y2={yOf(ep[b].bp)} stroke="var(--color-accent)" strokeWidth="1.2" opacity="0.5" />)}
      {ep.map((e, i) => <g key={i}><circle cx={e.x} cy={yOf(e.bp)} r="5" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="1.5" /><text x={e.x} y={130} textAnchor="middle" fill="var(--color-fg-subtle)" fontSize="9.5">t{i}</text></g>)}
      <text x="10" y="14" fill="var(--color-fg-subtle)">{es ? 'épocas (nodos) · pares de baseline pequeña (aristas)' : 'epochs (nodes) · small-baseline pairs (edges)'}</text>
      <text x="554" y="14" textAnchor="end" fill="var(--color-fg-subtle)">↕ Bperp</text>
    </svg>
    <Refs ids={['berardino2002', 'morishita2020']} label="Refs" />
  </>);
}

function Decomp({ es }: { es: boolean }) {
  const Px = 280, Py = 120, S = 0.629, C = 0.777, L = 100;
  const ax = Px + L * S, ay = Py - L * C, dx = Px - L * S, dy = Py - L * C;
  return (<>
    <p>{es ? 'Una sola pasada mide solo la proyección del movimiento 3-D sobre su línea de vista. Con incidencia θ ≈ 39°, una pasada ascendente (mira al este) y una descendente (mira al oeste) registran:' : 'A single pass measures only the projection of the 3-D motion onto its line of sight. With incidence θ ≈ 39°, an ascending pass (looks east) and a descending pass (looks west) record:'}</p>
    <Equation tex={String.raw`d_{\text{asc}} = \sin\theta\,m_E + \cos\theta\,m_U,\qquad m_U = \frac{d_{\text{asc}} + d_{\text{desc}}}{2\cos\theta},\quad m_E = \frac{d_{\text{asc}} - d_{\text{desc}}}{2\sin\theta}`} />
    <svg viewBox="0 0 560 170" width="100%" style={svgStyle} role="img" aria-label="2-geometry decomposition">
      {AR('dc-a')}
      <line x1="60" y1={Py} x2="500" y2={Py} stroke="var(--color-fg-subtle)" strokeWidth="1.4" />
      <text x="64" y={Py + 18} fill="var(--color-fg-subtle)">{es ? 'superficie' : 'ground'}</text>
      <line x1={Px} y1={Py} x2={ax} y2={ay} stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="5 3" />
      <line x1={Px} y1={Py} x2={dx} y2={dy} stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="5 3" />
      {[[ax, ay, es ? 'asc (este)' : 'asc (east)'], [dx, dy, es ? 'desc (oeste)' : 'desc (west)']].map(([x, y, l], i) => (<g key={i}><rect x={(x as number) - 9} y={(y as number) - 6} width="18" height="12" rx="2" fill="var(--color-surface)" stroke="var(--color-accent)" /><text x={x as number} y={(y as number) - 11} textAnchor="middle" fill="var(--color-fg)">{l as string}</text></g>))}
      <line x1={Px} y1={Py} x2={Px + 40} y2={Py + 36} stroke="#e5534b" strokeWidth="2.2" markerEnd="url(#dc-a)" />
      <text x={Px + 46} y={Py + 34} fill="#e5534b">{es ? 'mov. real' : 'true motion'}</text>
      <text x={Px + 14} y={Py - 6} fill="var(--color-fg-subtle)">θ≈39°</text>
    </svg>
    <p>{es ? <>El Norte–Sur queda en el espacio nulo (sensibilidad Norte ≈ 0), así que <InlineMath tex={String.raw`m_N`} /> es inobservable con dos pasadas, y la app lo declara.</> : <>North–South lies in the null space (North sensitivity ≈ 0), so <InlineMath tex={String.raw`m_N`} /> is unobservable from two passes, and the app states it.</>}</p>
    <Refs ids={['wright2004']} label="Refs" />
  </>);
}

function Temporal({ es }: { es: boolean }) {
  const pts = [[40, 40], [110, 60], [180, 78], [250, 96], [320, 116], [390, 138]];
  const tf = 470;
  return (<>
    <p>{es ? 'Por píxel se ajusta un modelo (lineal + estacional + escalón) con test de significancia. Para creep terciario (Fukuzono, α≈2) la velocidad inversa 1/v decrece linealmente hacia cero en t_f; el ajuste lineal proyecta t_f como el intercepto x.' : 'Per pixel a model (linear + seasonal + step) is fit with a significance test. For tertiary creep (Fukuzono, α≈2) the inverse velocity 1/v decreases linearly toward zero at t_f; the linear fit projects t_f as the x-intercept.'}</p>
    <Equation tex={String.raw`d(t) = v\,t + a\sin\tfrac{2\pi t}{365} + b\cos\tfrac{2\pi t}{365} + s\,\mathbb{1}[t>t_0],\qquad t_f = -\,a/b\ \ \text{from}\ \ 1/v = a + b\,t`} />
    <svg viewBox="0 0 560 175" width="100%" style={svgStyle} role="img" aria-label="inverse velocity">
      {AR('tv-a')}
      <line x1="40" y1="150" x2="520" y2="150" stroke="var(--color-fg-subtle)" /><line x1="40" y1="20" x2="40" y2="150" stroke="var(--color-fg-subtle)" />
      <text x="30" y="30" textAnchor="end" fill="var(--color-fg-subtle)">1/v</text><text x="515" y="168" fill="var(--color-fg-subtle)">{es ? 'tiempo' : 'time'}</text>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--color-accent)" />)}
      <line x1={pts[1][0]} y1={pts[1][1]} x2={tf} y2={150} stroke="#f778ba" strokeWidth="1.6" strokeDasharray="5 3" />
      <line x1={tf} y1="20" x2={tf} y2="150" stroke="#f85149" strokeWidth="1" strokeDasharray="3 3" />
      <text x={tf} y="16" textAnchor="middle" fill="#f85149" fontWeight="600">t_f</text>
      <text x="120" y="50" fill="#f778ba">{es ? 'ajuste lineal → intercepto = falla' : 'linear fit → intercept = failure'}</text>
    </svg>
    <Refs ids={['fukuzono1985', 'carla2017']} label="Refs" />
  </>);
}

function Learned({ es }: { es: boolean }) {
  return (<>
    <h3>{es ? 'Autoencoder convolucional (anomalía no supervisada)' : 'Convolutional autoencoder (unsupervised anomaly)'}</h3>
    <p>{es ? 'Un autoencoder denoising se entrena solo con parches normales: corrompe la entrada y reconstruye el parche limpio. Con cuello de botella estrecho reconstruye mal lo anómalo, y el error es un puntaje de anomalía sin etiquetas.' : 'A denoising autoencoder trains only on normal patches: it corrupts the input and reconstructs the clean patch. With a tight bottleneck it reconstructs anomalies poorly, so the error is a label-free anomaly score.'}</p>
    <Equation tex={String.raw`\mathcal{L} = \lVert x - g_\phi(f_\theta(\tilde x))\rVert^2,\qquad \text{anomaly}(x) = \lVert x - \hat x\rVert^2`} />
    <svg viewBox="0 0 560 130" width="100%" style={svgStyle} role="img" aria-label="AE + CNN architecture">
      {AR('ml-a')}
      {/* AE */}
      {[[40, 30, 36], [86, 42, 24], [126, 54, 12], [166, 48, 18], [212, 36, 30]].map(([x, y, h], i) => <rect key={i} x={x} y={y} width="22" height={h} rx="2" fill={i === 2 ? '#bc8cff' : 'color-mix(in oklab, var(--color-accent) 25%, var(--color-surface))'} stroke="var(--color-border)" />)}
      <text x="135" y="20" textAnchor="middle" fill="var(--color-fg-subtle)">conv-AE: {es ? 'parche→latente→reconstruir' : 'patch→latent→reconstruct'}</text>
      <text x="137" y="118" textAnchor="middle" fill="#bc8cff" fontSize="10">{es ? 'latente (z)' : 'latent (z)'}</text>
      {/* CNN */}
      {[[330, 36, 28], [368, 36, 28], [406, 36, 28]].map(([x, y, h], i) => <rect key={i} x={x} y={y} width="20" height={h} rx="2" fill="color-mix(in oklab, #3fb950 25%, var(--color-surface))" stroke="var(--color-border)" />)}
      <rect x="448" y="40" width="16" height="20" rx="2" fill="#3fb950" stroke="var(--color-border)" />
      <line x1="430" y1="50" x2="448" y2="50" stroke="var(--color-fg-subtle)" markerEnd="url(#ml-a)" />
      <text x="400" y="20" textAnchor="middle" fill="var(--color-fg-subtle)">CNN 1-D: {es ? 'serie→conv→6 clases' : 'series→conv→6 classes'}</text>
      <text x="456" y="78" textAnchor="middle" fill="#3fb950" fontSize="10">{es ? 'clase' : 'class'}</text>
    </svg>
    <p>{es ? 'Un AE simple puede reconstruir también las anomalías (atajo de identidad; el cuello solo no basta, Bouman & Heskes 2025); el denoising lo mitiga (MemAE, Gong 2019, es el paso siguiente). El AE convolucional para InSAR está establecido (Rouet-Leduc 2021). El CNN 1-D (estilo WDCNN) clasifica el tipo de deformación; la saliencia temporal tipo CAM (Selvaraju 2017) es roadmap, aún no se computa.' : 'A plain AE can reconstruct anomalies too (identity shortcut; the bottleneck alone is insufficient, Bouman & Heskes 2025); denoising mitigates it (MemAE, Gong 2019, is the next step). The convolutional AE for InSAR is established (Rouet-Leduc 2021). The 1-D CNN (WDCNN-style) classifies the deformation type; CAM-style temporal saliency (Selvaraju 2017) is roadmap, not yet computed.'}</p>
    <Refs ids={['vincent2008', 'bouman2025', 'gong2019', 'rouetleduc2021', 'anantra2018', 'zhang2017', 'selvaraju2017', 'mcinnes2018']} label="Refs" />
  </>);
}

function Decision({ es }: { es: boolean }) {
  return (<>
    <p>{es ? 'La capa de decisión fusiona la velocidad de estado y el pronóstico: una alarma TARP por niveles con dos gatillos paralelos, la velocidad |Up| y el tiempo-a-falla por velocidad inversa. La estructura de bandas es práctica de industria; los cortes son valores por defecto configurables, no límites regulatorios.' : 'The decision layer fuses the state velocity and the forecast: a tiered TARP alarm with two parallel triggers, the |Up| velocity and the inverse-velocity time-to-failure. The band structure is industry practice; the cut-points are configurable defaults, not regulatory limits.'}</p>
    <svg viewBox="0 0 560 110" width="100%" style={svgStyle} role="img" aria-label="TARP bands">
      {[['#3fb950', 0, 0.42, es ? 'VERDE' : 'GREEN'], ['#d29922', 0.42, 0.34, es ? 'ÁMBAR' : 'AMBER'], ['#f85149', 0.76, 0.24, es ? 'ROJO' : 'RED']].map(([c, x0, w, l], i) => (
        <g key={i}><rect x={10 + (x0 as number) * 540} y={36} width={(w as number) * 540 - 2} height="30" rx="4" fill={c as string} opacity="0.78" /><text x={10 + ((x0 as number) + (w as number) / 2) * 540} y={55} textAnchor="middle" fill="#0d1117" fontWeight="700" fontSize="11">{l as string}</text></g>))}
      <text x="10" y="26" fill="var(--color-fg-subtle)">{es ? 'gatillo 1: velocidad |Up| →' : 'trigger 1: |Up| velocity →'}</text>
      <text x="10" y="88" fill="var(--color-fg-subtle)">{es ? 'gatillo 2: falla proyectada (velocidad inversa), <60 d ámbar, <14 d rojo' : 'trigger 2: projected failure (inverse velocity), <60 d amber, <14 d red'}</text>
    </svg>
    <p>{es ? 'Hoy la alarma TARP se calcula solo de la velocidad y los días proyectados a la falla; el mapa de clase del CNN y el de anomalía del AE se muestran junto a ella pero no la modifican. Planeado (no implementado): que esos mapas auditen la alarma, bajando de prioridad una alarma por velocidad sobre un píxel "estacional"/"decorrelado" y elevando una anomalía AE sin firma de velocidad. InSAR puede perder una falla rápida por licuefacción: es un tamiz continuo, no una garantía.' : 'Today the TARP alarm is computed only from velocity and projected days-to-failure; the CNN class map and the AE anomaly map are shown alongside it but do not modify it. Planned (not implemented): have those maps audit the alarm, de-prioritising a velocity alarm on a "seasonal"/"decorrelated" pixel and raising an AE anomaly with no velocity signature. InSAR can miss a fast liquefaction failure: it is a continuous screen, not a guarantee.'}</p>
    <Refs ids={['grebby2021', 'carla2017']} label="Refs" />
  </>);
}
