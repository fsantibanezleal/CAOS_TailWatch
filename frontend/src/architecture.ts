// In-app Architecture / "How it works" modal config (ADR-0058) for TailWatch.
// Passed to <AppShell config={{ ...config, architecture }}>. The ⓘ header button
// (provided by @fasl-work/caos-app-shell >= 0.1.2) opens the modal. Each tab pairs
// one hand-authored THEMED SVG (frontend/public/svg/tech/, shell CSS-var tokens →
// repaints with the active theme, fetched + inlined) with a bilingual ES/EN body.
import type { ArchitectureConfig } from '@fasl-work/caos-app-shell';

export const architecture: ArchitectureConfig = {
  tabs: [
    {
      id: 'app',
      en: 'The app',
      es: 'La app',
      svg: 'svg/tech/01-the-app.svg',
      body_en:
        'TailWatch is a tailings-storage-facility (TSF) monitoring product: from a stack of satellite InSAR images it ' +
        'derives the surface deformation velocity of the dam, flags anomalies, and projects a failure time, answering ' +
        '"is the dam wall subsiding / accelerating, and when would it fail?". You click any pixel to inspect its ' +
        'displacement series, its velocity (East/Up/LOS), its anomaly and its inverse-velocity forecast.\n\n' +
        'It is a real system, not a demo. The deformation engine (frontend/src/dsp/) recomputes velocity, the Fukuzono ' +
        'inverse-velocity fit and the TARP tier live in the browser. A 1-D CNN classifies a pixel’s series live ' +
        '(ONNX, client-side); the conv-autoencoder anomaly map is precomputed offline by the training pipeline. The ' +
        'velocity field is masked by interferometric coherence, and the failure projection is gated on fit quality ' +
        '(R², acceleration, window length) before any failure time is reported.',
      body_es:
        'TailWatch es un producto de monitoreo de depósitos de relaves (TSF): desde un stack de imágenes InSAR ' +
        'satelitales deriva la velocidad de deformación superficial del muro, marca anomalías y proyecta un tiempo de ' +
        'falla, respondiendo "¿se está hundiendo / acelerando el muro, y cuándo fallaría?". Haces clic en cualquier ' +
        'píxel para inspeccionar su serie de desplazamiento, su velocidad (Este/Up/LOS), su anomalía y su pronóstico de ' +
        'velocidad inversa.\n\n' +
        'Es un sistema real, no un demo. El motor de deformación (frontend/src/dsp/) recalcula la velocidad, el ajuste ' +
        'de velocidad inversa de Fukuzono y el nivel TARP en vivo en el navegador. Un CNN 1-D clasifica la serie de un ' +
        'píxel en vivo (ONNX, en el cliente); el mapa de anomalía del autoencoder convolucional se precalcula offline ' +
        'en el pipeline de entrenamiento. El campo de velocidad se enmascara por coherencia interferométrica, y la ' +
        'proyección de falla se filtra por calidad de ajuste (R², aceleración, largo de ventana) antes de reportar ' +
        'cualquier tiempo de falla.',
    },
    {
      id: 'lanes',
      en: 'Lanes, web / offline / compute',
      es: 'Carriles, web / offline / cómputo',
      svg: 'svg/tech/02-lanes.svg',
      body_en:
        'Three lanes, and the split is the point. WEB (live, in the browser): the TypeScript deformation engine ' +
        '(frontend/src/dsp/) re-runs on every pixel click / epoch and onnxruntime-web runs cnn.onnx on the picked ' +
        'pixel (ae.onnx ships exported; its anomaly map is baked offline), no ' +
        'server. OFFLINE / COMPUTE (your machine, isolated .venv): the Python pipeline bakes the canonical case ' +
        'artifacts (the velocity / anomaly / coherence fields) and the heavy lane (--retrain, .venv-precompute, torch) ' +
        'trains the 1-D CNN + the conv-AE and exports them to ONNX. REPLAY: the small, committed artifacts in ' +
        'data/derived are overlaid into the SPA by copy-data.mjs and loaded live; the typed mirror (contract.types.ts) ' +
        'fails the build if the web and the pipeline shapes ever diverge.',
      body_es:
        'Tres carriles, y la división es lo central. WEB (en vivo, en el navegador): el motor de deformación en ' +
        'TypeScript (frontend/src/dsp/) re-corre con cada clic de píxel / época y onnxruntime-web ejecuta cnn.onnx ' +
        'sobre el píxel elegido (ae.onnx se exporta; su mapa de anomalía se hornea offline) ' +
        ',  sin servidor. OFFLINE / CÓMPUTO (tu máquina, .venv aislado): el pipeline Python hornea los ' +
        'artefactos canónicos por caso (los campos de velocidad / anomalía / coherencia) y el carril pesado (--retrain, ' +
        '.venv-precompute, torch) entrena el CNN 1-D + el conv-AE y los exporta a ONNX. REPLAY: los artefactos pequeños ' +
        'y versionados en data/derived se superponen al SPA con copy-data.mjs y se cargan en vivo; el espejo tipado ' +
        '(contract.types.ts) rompe el build si la web y el pipeline divergen.',
    },
    {
      id: 'web-flow',
      en: 'Web-app flow',
      es: 'Flujo de la web',
      svg: 'svg/tech/03-web-flow.svg',
      body_en:
        'The App page recomputes live: inputs (the case selector or your own InSAR stack, plus the component, epoch and ' +
        'coherence-mask controls) feed the TypeScript deformation engine and the onnxruntime-web inference, which feed ' +
        'the interactive maps, the velocity / anomaly / coherence / cumulative fields, the displacement series, the ' +
        'inverse-velocity fit and the TARP gauge, each reading values back on hover/click. The six sibling pages (App · ' +
        'Introduction · Methodology · Implementation · Experiments · Benchmark) are identical across every CAOS ' +
        'product. The build is gated by the contract-type mirror, the artifacts are overlaid by copy-data, vite builds ' +
        'the static output, and GitHub Pages serves it at tailwatch.fasl-work.com.',
      body_es:
        'La página App recalcula en vivo: las entradas (el selector de casos o tu propio stack InSAR, más los controles ' +
        'de componente, época y máscara de coherencia) alimentan el motor de deformación en TypeScript y la inferencia ' +
        'onnxruntime-web, que alimentan los mapas interactivos, los campos de velocidad / anomalía / coherencia / ' +
        'acumulado, la serie de desplazamiento, el ajuste de velocidad inversa y el gauge TARP, cada uno devolviendo ' +
        'valores al pasar/hacer clic. Las seis páginas hermanas (App · Introducción · Metodología · Implementación · ' +
        'Experimentos · Benchmark) son idénticas en todos los productos CAOS. El build lo controla el espejo de tipos ' +
        'del contrato, los artefactos los superpone copy-data, vite construye el estático y GitHub Pages lo sirve en ' +
        'tailwatch.fasl-work.com.',
    },
    {
      id: 'science',
      en: 'The science',
      es: 'La ciencia',
      svg: 'svg/tech/04-the-science.svg',
      body_en:
        'The pipeline, step by step: ① the InSAR stack gives cumulative displacement (mm) per epoch per pixel; ② a ' +
        'robust slope gives the velocity, decomposed into East/Up/LOS by the viewing geometry and masked where the ' +
        'interferometric coherence γ < γ_min (water/beach are not trusted); ③ tertiary-creep onset is detected and a ' +
        'terminal window is picked; ④ a Fukuzono inverse-velocity fit 1/v(t)=a+b·t (b<0) projects the failure time ' +
        't_fail=−a/b, gated by R², acceleration and window length; ⑤ the TARP tier follows from |v| and the days-to-fail.\n\n' +
        'The deterministic engine is always on and transparent, the reference every alarm is measured against. The ' +
        'learned lane enriches the click-to-inspect: a 1-D CNN classifies a pixel’s 60-epoch series into 6 deformation ' +
        'patterns, and a conv-autoencoder reconstructs a 16×16 velocity patch (MSE = anomaly), computed offline into ' +
        'the anomaly map. The CNN runs client-side as ONNX; both are ' +
        'reported next to the physics, never as a black box. Refs: Fukuzono 1985, Voight 1988, Carlà 2017.',
      body_es:
        'El pipeline, paso a paso: ① el stack InSAR da el desplazamiento acumulado (mm) por época por píxel; ② una ' +
        'pendiente robusta da la velocidad, descompuesta en Este/Up/LOS por la geometría de vista y enmascarada donde la ' +
        'coherencia interferométrica γ < γ_min (agua/playa no se confían); ③ se detecta el onset de creep terciario y se ' +
        'elige una ventana terminal; ④ un ajuste de velocidad inversa de Fukuzono 1/v(t)=a+b·t (b<0) proyecta el tiempo ' +
        'de falla t_fail=−a/b, con compuerta por R², aceleración y largo de ventana; ⑤ el nivel TARP sigue de |v| y los ' +
        'días-a-falla.\n\n' +
        'El motor determinista está siempre activo y es transparente, la referencia contra la que se mide toda alarma. ' +
        'El carril aprendido enriquece el click-to-inspect: un CNN 1-D clasifica la serie de 60 épocas de un píxel en 6 ' +
        'patrones de deformación, y un autoencoder convolucional reconstruye un parche de velocidad de 16×16 (MSE = ' +
        'anomalía), computado offline en el mapa de anomalía. El CNN corre en el cliente como ONNX; ambos se reportan ' +
        'junto a la física, nunca como caja negra. Refs: ' +
        'Fukuzono 1985, Voight 1988, Carlà 2017.',
    },
    {
      id: 'design',
      en: 'Data contracts / design',
      es: 'Contratos de datos / diseño',
      svg: 'svg/tech/05-data-contracts.svg',
      body_en:
        'Two validated data contracts bracket the pipeline. Contract 1 (ingestion) defines a valid InSAR stack, the ' +
        'grid dimensions, epochs/days, the displacement + coherence fields and the viewing geometry, with range/NaN ' +
        'guards, so the app accepts your data, not just the built-in cases. Contract 2 (artifact) defines the output ' +
        'the web reads (per-case velocity/anomaly/coherence fields, the prognostics, the model index), mirrored exactly ' +
        'by contract.types.ts. Between them the staged, deterministic pipeline runs the lane gate (numpy-light by ' +
        'default, --retrain for the heavy torch lane) and writes a provenance manifest, so every result is reproducible ' +
        'and the web can never silently drift.',
      body_es:
        'Dos contratos de datos validados encierran el pipeline. El Contrato 1 (ingesta) define un stack InSAR válido, ' +
        'las dimensiones de la grilla, épocas/días, los campos de desplazamiento + coherencia y la geometría de vista, ' +
        'con guardas de rango/NaN, para que la app acepte tus datos, no sólo los casos incluidos. El Contrato 2 ' +
        '(artefacto) define la salida que lee la web (campos de velocidad/anomalía/coherencia por caso, los ' +
        'prognósticos, el índice de modelos), espejada exactamente por contract.types.ts. Entre ambos, el pipeline por ' +
        'etapas y determinista corre el lane gate (numpy-light por defecto, --retrain para el carril pesado de torch) y ' +
        'escribe un manifest de procedencia, de modo que cada resultado es reproducible y la web nunca diverge en silencio.',
    },
  ],
};
