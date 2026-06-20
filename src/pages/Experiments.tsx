import { Refs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Experiments() {
  const es = useShellLang() === 'es';
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Experimentos' : 'Experiments'}</h1>
        <p className="lede">{es ? 'El diseño experimental honesto: verdad de terreno etiquetada, split sin fuga, y la confrontación de los métodos aprendidos contra el baseline clásico — además de los casos reales documentados que acotan el método.' : 'The honest experimental design: labelled ground truth, leakage-safe splits, and the learned methods confronted with the classical baseline — plus the documented real cases that bound the method.'}</p>
      </div>
      <section>
        <h2>{es ? 'Diseño' : 'Design'}</h2>
        <p>{es ? 'Cada escena sintética se genera con verdad de terreno conocida (campo de deformación + clase por píxel) y emite el formato LiCSBAS, así que el MISMO motor corre sobre sintético y real. Se generan 20 escenas con semillas distintas. El split es POR ESCENA: 16 para entrenar, 4 HELD-OUT para evaluar — nunca por píxel aleatorio (los píxeles vecinos comparten la misma realización de APS y error-DEM, lo que filtraría). El AE se entrena solo con parches NORMALES.' : 'Each synthetic scene is generated with known ground truth (deformation field + per-pixel class) and emits the LiCSBAS format, so the SAME engine runs on synthetic and real. 20 scenes with distinct seeds are generated. The split is BY SCENE: 16 to train, 4 HELD-OUT to evaluate — never random per pixel (neighbouring pixels share the same APS and DEM-error realisation, which would leak). The AE trains on NORMAL patches only.'}</p>
        <h2>{es ? 'Qué se mide' : 'What is measured'}</h2>
        <ul>
          <li>{es ? <><b>Clasificación (CNN):</b> precisión/recall/F1 por clase + macro-F1 y la matriz de confusión 6×6 sobre las escenas held-out.</> : <><b>Classification (CNN):</b> per-class precision/recall/F1 + macro-F1 and the 6×6 confusion matrix on the held-out scenes.</>}</li>
          <li>{es ? <><b>Detección de anomalía (AE vs clásico):</b> la curva ROC del puntaje de anomalía del AE vs el umbral de |velocidad| clásico para detectar píxeles de falla, sobre las escenas no vistas. Honesto: el clásico es fuerte cuando la falla tiene firma de velocidad.</> : <><b>Anomaly detection (AE vs classical):</b> the ROC of the AE anomaly score vs the classical |velocity| threshold for detecting failure pixels, on the unseen scenes. Honest: the classical baseline is strong when failure carries a velocity signature.</>}</li>
          <li>{es ? <><b>Pronóstico (velocidad inversa):</b> recuperación del tiempo de falla vs el t_f inyectado a varios adelantos — la exactitud depende del adelanto (firma distintiva del método).</> : <><b>Forecasting (inverse velocity):</b> recovery of the failure time vs the injected t_f at several lead times — accuracy is lead-time-dependent (the method's hallmark).</>}</li>
        </ul>
        <h2>{es ? 'Casos reales que acotan el método' : 'Real cases that bound the method'}</h2>
        <p>{es ? 'Tres referencias publicadas acotan lo que InSAR + estos métodos pueden y no pueden hacer: Brumadinho (2019) — falla súbita por licuefacción con precursor solo retrospectivo (Grebby 2021); Cadia (2018) — falla con precursor claro y pronosticable; y los taludes de rajo, donde la velocidad inversa funciona condicionalmente (Carlà 2017). Nunca enfocamos SAR ni re-alojamos productos: estos casos se consumen como hechos citados.' : 'Three published references bound what InSAR + these methods can and cannot do: Brumadinho (2019) — a sudden liquefaction failure with only a retrospective precursor (Grebby 2021); Cadia (2018) — a failure with a clear, forecastable precursor; and open-pit slopes, where inverse velocity works conditionally (Carlà 2017). We never focus SAR nor re-host products: these cases are consumed as cited facts.'}</p>
        <h2>{es ? 'Honestidad' : 'Honesty'}</h2>
        <p>{es ? 'Sin fuga (split por escena); sin números fabricados (todo desde los artefactos versionados); sin umbral mágico (la calibración fija el FPR sobre el control estable). Una transferencia sim-a-real no está garantizada: un modelo entrenado en el simulador puede no transferir a datos reales — se declara como riesgo. Los resultados cuantificados están en la página Benchmark.' : 'No leakage (split by scene); no fabricated numbers (everything from the versioned artifacts); no magic threshold (calibration fixes the FPR on the stable control). A sim-to-real transfer is not guaranteed: a model trained on the simulator may not transfer to real data — stated as a risk. The quantified results are on the Benchmark page.'}</p>
        <Refs ids={['grebby2021', 'carla2017', 'bouman2025']} label="Refs" />
      </section>
    </div>
  );
}
