import { Callout, Equation, Refs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Decision() {
  const es = useShellLang() === 'es';
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{es ? 'Capa de decisión / alerta temprana' : 'Decision / early-warning layer'}</h1>
        <p className="lede">{es ? 'Velocidad inversa (Fukuzono) para proyectar el tiempo de falla, y una alarma TARP escalonada alineada con GISTM — siempre con incertidumbre y un disclaimer honesto.' : 'Inverse velocity (Fukuzono) to project the failure time, and a tiered GISTM-aligned TARP alarm — always with uncertainty and an honest disclaimer.'}</p>
      </div>
      <section>
        <h2>{es ? 'Creep terciario + velocidad inversa' : 'Tertiary creep + inverse velocity'}</h2>
        <p>{es
          ? 'Una pendiente que falla pasa por creep primario, secundario y terciario (acelerante). La ley de potencia de Voight, para exponente α ≈ 2, integra a la relación lineal de velocidad inversa de Fukuzono: el intercepto en x de un ajuste lineal a los datos terminales (post-inicio-de-aceleración) de 1/v es el tiempo de falla t_f.'
          : 'A failing slope passes through primary, secondary and tertiary (accelerating) creep. Voight’s power law, for exponent α ≈ 2, integrates to Fukuzono’s linear inverse-velocity relation: the x-intercept of a linear fit to the terminal (post-onset-of-acceleration) 1/v data is the failure time t_f.'}</p>
        <Equation tex={String.raw`\ddot{\Omega} = A\,\dot{\Omega}^{\alpha}\ \xrightarrow{\ \alpha=2\ }\ \frac{1}{v(t)} = A\,(t_f - t)\ \Rightarrow\ t_f = \text{x-intercept of the linear fit to }1/v`} />
        <p>{es
          ? 'TailWatch reporta t_f como un INTERVALO de confianza, nunca una fecha desnuda, con R² y una compuerta de credibilidad que suprime el número cuando el ajuste es pobre o no hay aceleración. La ventana de ajuste es seleccionable por el usuario — esa elección domina la respuesta, así que exponerla es el acto de honestidad. Más suavizado da un 1/v más limpio pero un t_f sesgado/retrasado.'
          : 'TailWatch reports t_f as a confidence INTERVAL, never a bare date, with R² and a credibility gate that suppresses the number when the fit is poor or there is no acceleration. The fit window is user-selectable — that choice dominates the answer, so exposing it is the honesty move. More smoothing gives a cleaner 1/v but a biased/delayed t_f.'}</p>
        <Refs ids={['fukuzono1985', 'voight1988', 'rosehungr2007', 'carla2017', 'cruden1987']} label="Refs" />

        <h2>{es ? 'Alarma TARP escalonada' : 'Tiered TARP alarm'}</h2>
        <p>{es
          ? 'Un TARP (Trigger Action Response Plan) verde/ámbar/rojo con dos disparadores paralelos —velocidad/aceleración de estado Y tiempo-a-falla pronosticado—, escalado por el más severo, cada banda mapeada a una acción concreta (vigilancia rutinaria → aumentar cadencia + verificar en campo + notificar al EoR → escalar a EoR+IRB + activar el plan de emergencia). La ESTRUCTURA de bandas es práctica de industria (GISTM Principios 6/11/12/14, ANCOLD, CDA); los puntos de corte en mm/yr son valores por defecto configurables por el EoR, NO límites regulatorios universales — y eso se declara en la cara del tablero.'
          : 'A green/amber/red TARP (Trigger Action Response Plan) with two parallel triggers — state velocity/acceleration AND forecast time-to-failure — escalated by the more severe, each band mapped to a concrete action (routine surveillance → increase cadence + field-verify + notify the EoR → escalate to EoR+IRB + trigger the emergency plan). The band STRUCTURE is industry practice (GISTM Principles 6/11/12/14, ANCOLD, CDA); the mm/yr cut-points are EoR-configurable defaults, NOT universal regulatory limits — and that is stated on the dashboard face.'}</p>

        <Callout variant="honest" title={es ? 'Compuerta honesta de la decisión' : 'Decision honest gate'}>
          {es
            ? 'No es un sistema certificado de seguridad. InSAR es vigilancia, no un sistema de disparo: el revisita de 6–12 días puede perder la aceleración final (en Brumadinho el creep lento precursor era detectable; el instante del colapso no era cronometrable por InSAR). La línea 1/v es lineal solo en las últimas semanas. Los umbrales son valores por defecto configurables. La auto-engaño atmosférica/de desenrollado alimenta la alarma (compuerta de QC). Solo LOS. La decorrelación oculta la superficie más activa. El terreno sintético está etiquetado.'
            : 'Not a certified safety system. InSAR is surveillance, not a trip system: the 6–12-day revisit can miss the final acceleration (at Brumadinho the slow precursor creep was detectable; the collapse instant was not InSAR-timed). The 1/v line is linear only in the final weeks. Thresholds are configurable defaults. APS/unwrapping self-deception feeds the alarm (a QC gate). LOS-only. Decorrelation hides the most active surface. Synthetic ground truth is labelled.'}
        </Callout>
        <Refs ids={['grebby2021', 'carla2019']} label="Refs" />
      </section>
    </div>
  );
}
