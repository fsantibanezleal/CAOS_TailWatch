import { Refs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Introduction() {
  const es = useShellLang() === 'es';
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Introducción' : 'Introduction'}</h1>
        <p className="lede">{es
          ? 'TailWatch es un banco de inteligencia de deformación InSAR para presas de relaves y taludes de rajo: combina la cadena geodésica clásica (SBAS, descomposición 2-geometrías, velocidad inversa) con métodos APRENDIDOS (autoencoder convolucional de anomalías + CNN de clasificación), entrenados offline y servidos en el navegador.'
          : 'TailWatch is an InSAR deformation-intelligence bench for tailings dams and pit walls: it pairs the classical geodetic chain (SBAS, 2-geometry decomposition, inverse velocity) with LEARNED methods (a convolutional anomaly autoencoder + a CNN classifier), trained offline and served in the browser.'}</p>
      </div>

      <section>
        <h2>{es ? 'El problema' : 'The problem'}</h2>
        <p>{es
          ? 'Una presa de relaves puede fallar por licuefacción o creep acelerante con consecuencias catastróficas (Brumadinho 2019, ~270 víctimas). El radar de apertura sintética interferométrico (InSAR) mide deformación de la superficie a escala milimétrica desde el espacio, sin instrumentación en terreno, sobre toda la instalación. El desafío: la fase interferométrica mezcla la deformación con atmósfera, error topográfico y decorrelación; y el operador necesita no solo "cuánto se mueve" sino "qué tipo de movimiento es" y "es anómalo".'
          : 'A tailings dam can fail by liquefaction or accelerating creep with catastrophic consequences (Brumadinho 2019, ~270 fatalities). Interferometric synthetic-aperture radar (InSAR) measures surface deformation at millimetre scale from space, with no field instrumentation, across the whole facility. The challenge: the interferometric phase mixes deformation with atmosphere, topographic error and decorrelation; and the operator needs not only "how much it moves" but "what kind of motion it is" and "is it anomalous".'}</p>
        <Refs ids={['grebby2021', 'hanssen2001']} label="Refs" />

        <h2>{es ? 'El enfoque — clásico + aprendido' : 'The approach — classical + learned'}</h2>
        <OverviewSVG es={es} />
        <p>{es
          ? 'Sobre un cubo de desplazamiento (formato LiCSBAS) corren tres capas: (1) la geodesia CLÁSICA — descomposición ascendente/descendente a vertical+Este, velocidad por mínimos cuadrados con test de significancia, y la velocidad inversa de Fukuzono para proyectar el tiempo de falla; (2) métodos APRENDIDOS — un autoencoder convolucional denoising cuya reconstrucción defectuosa marca anomalías sin etiquetas, y un CNN 1-D que clasifica la firma de cada píxel en seis tipos; (3) la capa de DECISIÓN — alarma TARP por niveles + clase de velocidad. Los métodos aprendidos se entrenan offline y se exportan a ONNX; el navegador corre el CNN en vivo sobre el píxel elegido y el mapa de anomalía del AE llega precalculado.'
          : 'On a displacement cube (LiCSBAS format) three layers run: (1) CLASSICAL geodesy — ascending/descending decomposition to vertical+East, least-squares velocity with a significance test, and Fukuzono inverse velocity to project the failure time; (2) LEARNED methods — a denoising convolutional autoencoder whose poor reconstruction flags anomalies without labels, and a 1-D CNN that classifies each pixel\'s signature into six types; (3) the DECISION layer — a tiered TARP alarm + velocity class. The learned methods are trained offline and exported to ONNX; the browser runs the CNN live on the picked pixel and the AE anomaly map ships precomputed.'}</p>
        <Refs ids={['berardino2002', 'rouetleduc2021', 'fukuzono1985']} label="Refs" />

        <h2>{es ? 'Quién lo usa' : 'Who uses it'}</h2>
        <p>{es
          ? 'Ingenieros geotécnicos y de monitoreo de relaves, investigadores de InSAR/ML, y una audiencia técnica. Es un banco didáctico y transparente — NO un sistema de alarma certificado.'
          : 'Tailings geotechnical + monitoring engineers, InSAR/ML researchers, and a technical audience. It is a didactic, transparent bench — NOT a certified alarm system.'}</p>

        <h2>{es ? 'Alcance honesto' : 'Honest scope'}</h2>
        <ul>
          <li>{es ? 'Los datos del demo son SINTÉTICOS pero físicamente fundados (geometría S1 real, APS von-Kármán, decorrelación, error-DEM) y emitidos en formato LiCSBAS, así que el mismo motor corre sobre recortes reales (LiCSAR/EGMS).' : 'The demo data is SYNTHETIC but physics-grounded (real S1 geometry, von-Kármán APS, decorrelation, DEM error) and emitted in LiCSBAS format, so the same engine runs on real clips (LiCSAR/EGMS).'}</li>
          <li>{es ? 'InSAR es vigilancia de 6–12 días, solo línea de vista: puede sub-muestrear una falla rápida por licuefacción. Los umbrales de alarma son valores por defecto, no límites regulatorios.' : 'InSAR is 6–12-day, line-of-sight-only surveillance: it can under-sample a fast liquefaction failure. Alarm thresholds are defaults, not regulatory limits.'}</li>
          <li>{es ? 'El benchmark aprendido-vs-clásico se reporta honestamente sobre escenas no vistas — sin victorias fabricadas.' : 'The learned-vs-classical benchmark is reported honestly on unseen scenes — no fabricated wins.'}</li>
        </ul>
      </section>
    </div>
  );
}

function OverviewSVG({ es }: { es: boolean }) {
  const box = (x: number, y: number, w: number, t: string, sub: string, fill: string) => (
    <g>
      <rect x={x} y={y} width={w} height="46" rx="7" fill={fill} stroke="var(--color-border)" />
      <text x={x + w / 2} y={y + 19} textAnchor="middle" fill="var(--color-fg)" fontSize="12.5" fontWeight="600">{t}</text>
      <text x={x + w / 2} y={y + 35} textAnchor="middle" fill="var(--color-fg-subtle)" fontSize="10.5">{sub}</text>
    </g>
  );
  const arrow = (x1: number, y1: number, x2: number, y2: number) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-fg-subtle)" strokeWidth="1.4" markerEnd="url(#ov-a)" />;
  return (
    <svg viewBox="0 0 720 240" width="100%" style={{ maxWidth: 720, display: 'block', margin: '0.6rem auto', font: '12px var(--font-sans, sans-serif)' }} role="img"
      aria-label={es ? 'Arquitectura de TailWatch' : 'TailWatch architecture'}>
      <defs><marker id="ov-a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="var(--color-fg-subtle)" /></marker></defs>
      {box(20, 16, 150, es ? 'SAR / InSAR' : 'SAR / InSAR', es ? 'productos pre-hechos' : 'pre-made products', 'var(--color-surface)')}
      {box(20, 96, 150, es ? 'Cubo SBAS' : 'SBAS cube', 'LiCSBAS cum.h5', 'var(--color-surface)')}
      {arrow(95, 62, 95, 96)}
      {box(250, 16, 200, es ? 'Geodesia clásica' : 'Classical geodesy', es ? 'decomp · velocidad · 1/v' : 'decomp · velocity · 1/v', 'color-mix(in oklab, var(--color-accent) 12%, var(--color-surface))')}
      {box(250, 96, 200, es ? 'Métodos aprendidos' : 'Learned methods', es ? 'conv-AE · CNN (ONNX)' : 'conv-AE · CNN (ONNX)', 'color-mix(in oklab, #bc8cff 16%, var(--color-surface))')}
      {box(250, 176, 200, es ? 'Capa de decisión' : 'Decision layer', es ? 'TARP · clase de velocidad' : 'TARP · velocity class', 'color-mix(in oklab, #d29922 16%, var(--color-surface))')}
      {arrow(170, 39, 250, 39)} {arrow(170, 119, 250, 119)}
      {arrow(350, 62, 350, 96)} {arrow(350, 142, 350, 176)}
      {box(530, 96, 170, es ? 'Workbench web' : 'Web workbench', es ? '8 mapas/gráficos interactivos' : '8 interactive maps/charts', 'var(--color-surface)')}
      {arrow(450, 39, 530, 110)} {arrow(450, 119, 530, 119)} {arrow(450, 199, 530, 130)}
      <text x="615" y="160" textAnchor="middle" fill="var(--color-fg-subtle)" fontSize="10.5">{es ? 'inferencia ONNX en vivo' : 'live ONNX inference'}</text>
    </svg>
  );
}
