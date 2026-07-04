import { Refs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Implementation() {
  const es = useShellLang() === 'es';
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Implementación' : 'Implementation'}</h1>
        <p className="lede">{es ? 'El precálculo fuerte local con su pipeline real (datos → SBAS → entrenamiento → ONNX → artefactos) y la frontera honesta con el runtime liviano en el navegador.' : 'The strong local precompute with its real pipeline (data → SBAS → training → ONNX → artifacts) and the honest boundary with the thin in-browser runtime.'}</p>
      </div>
      <section>
        <h2>{es ? 'El pipeline de precálculo' : 'The precompute pipeline'}</h2>
        <PipelineSVG es={es} />
        <p>{es ? 'Un pipeline en Python (ambiente aislado) ejecuta, determinista y semillado:' : 'A Python pipeline (isolated environment) runs, deterministic + seeded:'}</p>
        <ol>
          <li>{es ? <><b>Datos.</b> Un simulador forward de alta fidelidad (geometría Sentinel-1 real, APS estratificado + turbulento von-Kármán por época, decorrelación temporal exponencial, error-DEM ∝ línea base perpendicular, rampas orbitales) emite un stack de desplazamiento LOS asc+desc ETIQUETADO (6 clases) en formato LiCSBAS — o un recorte real LiCSAR/EGMS consumido pre-hecho.</> : <><b>Data.</b> A high-fidelity forward simulator (real Sentinel-1 geometry, stratified + turbulent von-Kármán APS per epoch, exponential temporal decorrelation, DEM error ∝ perpendicular baseline, orbital ramps) emits a LABELLED asc+desc LOS displacement stack (6 classes) in LiCSBAS format — or a real LiCSAR/EGMS clip consumed pre-made.</>}</li>
          <li>{es ? <><b>Inversión.</b> Descomposición 2-geometrías a vertical/Este, velocidad por mínimos cuadrados + test de significancia (consistente con SBAS).</> : <><b>Inversion.</b> 2-geometry decomposition to vertical/East, least-squares velocity + significance test (SBAS-consistent).</>}</li>
          <li>{es ? <><b>Entrenamiento.</b> Un autoencoder convolucional denoising (solo parches normales) + un CNN 1-D (clasificación 6-clases), entrenados en 16 escenas, evaluados en 4 escenas HELD-OUT (split por escena = sin fuga espacial).</> : <><b>Training.</b> A denoising convolutional autoencoder (normal patches only) + a 1-D CNN (6-class classification), trained on 16 scenes, evaluated on 4 HELD-OUT scenes (split by scene = no spatial leakage).</>}</li>
          <li>{es ? <><b>Exportación.</b> Los modelos se exportan a <span className="mono">ONNX</span> (ae.onnx, cnn.onnx) y se computan los artefactos: el cubo de la escena demo, los mapas de velocidad/anomalía/clase/coherencia, las coordenadas latentes UMAP, las curvas ROC held-out y la matriz de confusión → JSON compacto + binario (sin re-alojar rasters crudos).</> : <><b>Export.</b> The models export to <span className="mono">ONNX</span> (ae.onnx, cnn.onnx) and the artifacts are computed: the demo-scene cube, the velocity/anomaly/class/coherence maps, the UMAP latent coordinates, the held-out ROC curves and the confusion matrix → compact JSON + binary (no re-hosted raw rasters).</>}</li>
        </ol>
        <h2>{es ? 'La frontera precálculo / en vivo' : 'The precompute / live boundary'}</h2>
        <p>{es ? 'Frontera fija y honesta: el enfoque SAR, la inversión de red multi-anual y el ENTRENAMIENTO de los modelos son PRECÁLCULO offline. En VIVO, el navegador carga los artefactos y corre el runtime liviano: ajuste temporal por píxel, velocidad inversa, alarmas, y la inferencia ONNX del CNN (onnxruntime-web, WASM de un solo hilo — GitHub Pages no permite los headers COOP/COEP). Un clic en un píxel ejecuta el CNN sobre su serie, en vivo; el mapa de anomalía del AE se precalcula offline (un inspector de parche AE en vivo es roadmap).' : 'A fixed, honest boundary: SAR focusing, the multi-year network inversion and the model TRAINING are offline PRECOMPUTE. LIVE, the browser loads the artifacts and runs the thin runtime: per-pixel temporal fit, inverse velocity, alarms, and the ONNX inference of the CNN (onnxruntime-web, single-threaded WASM — GitHub Pages cannot set the COOP/COEP headers). A click on a pixel runs the CNN on its series, live; the AE anomaly map is precomputed offline (a live AE patch inspector is roadmap).'}</p>
        <p className="muted small">{es ? 'Modelos: ae.onnx ~0.1 MB, cnn.onnx ~0.04 MB; cubo demo ~2.6 MB. Inferencia por píxel sub-50 ms en CPU. El espacio de color con signo es vik diverging centrado en cero; la anomalía y la coherencia usan batlow secuencial.' : 'Models: ae.onnx ~0.1 MB, cnn.onnx ~0.04 MB; demo cube ~2.6 MB. Per-pixel inference sub-50 ms on CPU. The signed colour space is zero-centred vik diverging; anomaly and coherence use sequential batlow.'}</p>
        <Refs ids={['berardino2002', 'rouetleduc2021', 'zhang2017', 'crameri2018']} label="Refs" />
      </section>
    </div>
  );
}

function PipelineSVG({ es }: { es: boolean }) {
  const stage = (x: number, t: string, sub: string, fill: string) => (
    <g>
      <rect x={x} y={30} width="116" height="50" rx="7" fill={fill} stroke="var(--color-border)" />
      <text x={x + 58} y={51} textAnchor="middle" fill="var(--color-fg)" fontSize="12" fontWeight="600">{t}</text>
      <text x={x + 58} y={67} textAnchor="middle" fill="var(--color-fg-subtle)" fontSize="10">{sub}</text>
    </g>
  );
  const arr = (x: number) => <line x1={x} y1={55} x2={x + 18} y2={55} stroke="var(--color-fg-subtle)" strokeWidth="1.4" markerEnd="url(#pp-a)" />;
  const xs = [10, 144, 278, 412, 546];
  const S = [
    [es ? 'Datos/sim' : 'Data/sim', es ? 'etiquetado' : 'labelled', 'var(--color-surface)'],
    [es ? 'SBAS' : 'SBAS', es ? 'decomp+vel' : 'decomp+vel', 'var(--color-surface)'],
    [es ? 'Entrenar' : 'Train', 'AE + CNN', 'color-mix(in oklab, #bc8cff 16%, var(--color-surface))'],
    ['ONNX', es ? 'export' : 'export', 'color-mix(in oklab, var(--color-accent) 14%, var(--color-surface))'],
    [es ? 'Artefactos' : 'Artifacts', es ? 'JSON+bin' : 'JSON+bin', 'var(--color-surface)'],
  ];
  return (
    <svg viewBox="0 0 680 110" width="100%" style={{ maxWidth: 680, display: 'block', margin: '0.5rem auto', font: '12px var(--font-sans, sans-serif)' }} role="img" aria-label={es ? 'Pipeline de precálculo' : 'Precompute pipeline'}>
      <defs><marker id="pp-a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="var(--color-fg-subtle)" /></marker></defs>
      {S.map((s, i) => <g key={i}>{stage(xs[i], s[0], s[1], s[2])}{i < 4 && arr(xs[i] + 116)}</g>)}
      <text x={340} y={100} textAnchor="middle" fill="var(--color-fg-subtle)" fontSize="10.5">{es ? '↑ offline (Python, semillado)            runtime liviano en el navegador ↓ (onnxruntime-web)' : '↑ offline (Python, seeded)            thin browser runtime ↓ (onnxruntime-web)'}</text>
    </svg>
  );
}
