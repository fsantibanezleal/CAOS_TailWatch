import { useShellLang } from '@fasl-work/caos-app-shell';

export default function Experiments() {
  const es = useShellLang() === 'es';
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Experimentos' : 'Experiments'}</h1>
        <p className="lede">{es ? 'Cómo se mide honestamente si el método funciona — recuperación de velocidad contra verdad inyectada, acuerdo con precursores publicados, y tasa de falsa alarma en el control estable.' : 'How we honestly measure whether the method works — velocity recovery against injected truth, agreement with published precursors, and false-alarm rate on the stable control.'}</p>
      </div>
      <section>
        <h2>{es ? 'Diseño experimental' : 'Experimental design'}</h2>
        <p>{es
          ? 'Cada caso sintético se genera con una verdad de terreno conocida (campo de deformación + t_f inyectado) y emite el formato LiCSBAS real, así que el MISMO motor de inversión/análisis corre sobre sintético y real. Se mide: (1) RMSE de velocidad recuperada vs. velocidad inyectada por píxel; (2) error de t_f recuperado por velocidad inversa vs. t_f verdadero, y el adelanto (lead time); (3) tasa de falsa alarma en el control de roca estable (debe dar verde); (4) sesgo removido por GACOS (caso señuelo con APS estratificada, on/off).'
          : 'Each synthetic case is generated with a known ground truth (deformation field + injected t_f) and emits the real LiCSBAS format, so the SAME inversion/analysis engine runs on synthetic and real. We measure: (1) recovered-velocity RMSE vs injected per-pixel velocity; (2) inverse-velocity recovered t_f error vs true t_f, and the lead time; (3) false-alarm rate on the stable-rock control (must read green); (4) the bias removed by GACOS (stratified-APS decoy case, on/off).'}</p>
        <h2>{es ? 'Casos reales como objetivos de validación' : 'Real cases as validation targets'}</h2>
        <p>{es
          ? 'Para Brumadinho (Córrego do Feijão B1, 25-ene-2019; dos tracks descendentes 53 y 155, ISBAS 20 m) el objetivo es reproducir el precursor publicado: deformación lenta descendente <36 mm/yr en la cara de la presa, con aceleración no lineal desde fines de octubre 2018, y una proyección retrospectiva de velocidad inversa dentro de "unos pocos días" del colapso (Grebby et al. 2021). Para Cadia (9-mar-2018) los valores primarios son objetivos hasta 68.9 mm (ene–mar 2018), señal emergiendo ~2 meses antes (Carlà et al. 2019).'
          : 'For Brumadinho (Córrego do Feijão B1, 25 Jan 2019; two descending tracks 53 & 155, ISBAS 20 m) the target is to reproduce the published precursor: slow downward deformation <36 mm/yr on the dam face, with nonlinear acceleration from late October 2018, and a retrospective inverse-velocity projection within "a few days" of collapse (Grebby et al. 2021). For Cadia (9 Mar 2018) the primary values are targets up to 68.9 mm (Jan–Mar 2018), signal emerging ~2 months prior (Carlà et al. 2019).'}</p>
        <h2>{es ? 'Presentación de resultados' : 'Results presentation'}</h2>
        <p>{es
          ? 'Los resultados comparativos método×caso se renderizarán desde un artefacto de métricas versionado (un archivo JSON pequeño commiteado, nunca los datos crudos): RMSE de velocidad, error de t_f / lead time, tasa de falsa alarma y sesgo GACOS-on/off, con celdas vacías honestas donde una métrica no se corrió — sin números fabricados. (Esta página crece a medida que se computan los artefactos offline por caso.)'
          : 'Comparative method×case results will render from a versioned metrics artifact (a small committed JSON file, never the raw data): velocity RMSE, t_f error / lead time, false-alarm rate and GACOS-on/off bias, with honest empty cells where a metric was not run — no fabricated numbers. (This page grows as the per-case offline artifacts are computed.)'}</p>
      </section>
    </div>
  );
}
