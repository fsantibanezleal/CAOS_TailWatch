// ADR-0070 scenario focus view: one selected AOI, full page, nothing competing with the deformation map.
//
// ADDITIVE. The App (Tool.tsx) keeps every tab and all its explanation; this route is a second way to look
// at the SAME area through the SAME data and the SAME inverse-velocity fit. It renders OUTSIDE <AppShell>
// on purpose: the shell header and footer are exactly the chrome a focus view exists to escape.
//
// PROVENANCE STAYS ON SCREEN. The real lane is a Sentinel-1 InSAR cube over Campi Flegrei, a volcanic
// caldera and NOT a mine or tailings AOI. That caveat is the single most important thing a viewer needs,
// so it is in the rail rather than buried on a docs page, and the badge never implies a tailings reading.

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useShellLang } from '@fasl-work/caos-app-shell';
import {
  loadManifest, loadCase, velOf, seriesAt, gridOf,
  type Manifest, type CaseData, type CaseInfo,
} from '../data/demo';
import { inverseVelocity } from '../dsp/forecast';
import { vik, rgbCss } from '../lib/colormap';
import { FieldMap } from '../viz/FieldMap';

/** What the inverse-velocity fit MEANS, said on the stage.
 *
 *  Fukuzono's method projects a failure time from the x-intercept of 1/|v|. `credible` is the engine's own
 *  gate: when the terminal fit does not support a projection it says so instead of printing a date. A
 *  projected day is NOT a prediction of failure for this AOI; it is what the linear fit extrapolates to,
 *  and the wording keeps that distinction. */
function moveState(iv: { tFail: number | null; credible: boolean; r2: number }, es: boolean) {
  if (!iv.credible || iv.tFail === null) {
    return {
      label: es ? 'Sin proyeccion creible' : 'No credible projection',
      text: es
        ? 'La velocidad inversa no muestra una tendencia terminal lineal en este pixel: no hay aceleracion sostenida que extrapolar, y el motor se niega a imprimir una fecha.'
        : 'Inverse velocity shows no linear terminal trend at this pixel: there is no sustained acceleration to extrapolate, and the engine declines to print a date.',
    };
  }
  return {
    label: es ? 'Aceleracion en curso' : 'Sustained acceleration',
    text: es
      ? `El ajuste terminal de 1/|v| (R2 ${iv.r2.toFixed(2)}) corta el eje hacia el dia ${iv.tFail.toFixed(0)}. Es a donde extrapola la recta de Fukuzono para este pixel, no una prediccion de falla del sitio.`
      : `The terminal 1/|v| fit (R2 ${iv.r2.toFixed(2)}) crosses the axis near day ${iv.tFail.toFixed(0)}. That is where Fukuzono's line extrapolates for this pixel, not a prediction of failure for the site.`,
  };
}

export default function Focus() {
  const { caseId } = useParams();
  const es = useShellLang() === 'es';

  const [m, setM] = useState<Manifest | null>(null);
  const [cd, setCd] = useState<CaseData | null>(null);
  const [sel, setSel] = useState({ x: 32, y: 32 });
  useEffect(() => { loadManifest().then(setM).catch(() => setM(null)); }, []);

  const info: CaseInfo | null = useMemo(
    () => (m ? (m.cases.find((c) => c.id === caseId) ?? m.cases[0]) : null),
    [m, caseId],
  );

  useEffect(() => {
    if (!m || !info) return;
    let cancel = false;
    setCd(null);
    loadCase(m, info).then((d) => { if (!cancel) setCd(d); }).catch(() => { if (!cancel) setCd(null); });
    return () => { cancel = true; };
  }, [m, info]);

  // Selecting a different AOI must reset the picked pixel, or the readout keeps a coordinate from an area
  // that is no longer on screen and silently reports the wrong series.
  useEffect(() => { setSel({ x: 32, y: 32 }); }, [caseId]);

  const grid = useMemo(() => (m && info ? gridOf(m, info) : null), [m, info]);
  const W = grid?.W ?? 64, H = grid?.H ?? 64;
  // `days` comes from the GRID, not from CaseInfo: CaseInfo.days is optional and empty for most cases, so
  // reading it there left the inverse-velocity fit with no time axis and the badge stuck on "Loading"
  // forever while the map rendered fine. gridOf() is exactly what the App uses.
  const vel = useMemo(() => (cd ? velOf(cd, 'up') : null), [cd]);
  const days = grid?.days ?? [];

  const series = useMemo(
    () => (grid && cd ? seriesAt(grid, m?.cumScale ?? 1, cd, sel.x, sel.y) : []),
    [grid, cd, m, sel],
  );
  const iv = useMemo(
    () => (series.length && days.length ? inverseVelocity(series, days.slice(0, series.length)) : null),
    [series, days],
  );

  const velColor = (i: number): [number, number, number] => vik(vel?.[i] ?? 0, 60);
  const st = iv
    ? moveState(iv, es)
    : { label: es ? 'Cargando' : 'Loading', text: es ? 'Leyendo el cubo de deformacion.' : 'Reading the deformation cube.' };

  const last = series.length ? series[series.length - 1] : 0;
  const meanVel = useMemo(() => {
    if (!vel) return 0;
    let s = 0; for (let i = 0; i < vel.length; i++) s += vel[i];
    return s / Math.max(1, vel.length);
  }, [vel]);

  const hud = [
    { v: `${last.toFixed(0)} mm`, l: es ? 'acumulado' : 'cumulative', tone: 'accent' },
    { v: `${meanVel.toFixed(1)}`, l: es ? 'vel media mm/yr' : 'mean vel mm/yr', tone: 'blue' },
    { v: iv?.credible && iv.tFail !== null ? `d${iv.tFail.toFixed(0)}` : '-', l: es ? 'proyeccion' : 'projection' },
    { v: iv ? iv.r2.toFixed(2) : '-', l: 'R2' },
    { v: `${days.length}`, l: es ? 'epocas' : 'epochs' },
    { v: `${sel.x},${sel.y}`, l: es ? 'pixel' : 'pixel' },
  ];

  const isReal = info?.source === 'real';

  return (
    <div className="twf">
      <div className="twf-stage">
        {cd && vel
          ? <FieldMap W={W} H={H} colorAt={velColor} sel={sel} onPick={(x, y) => setSel({ x, y })}
                      readout={(x, y, k) => `${x},${y} · ${(vel[k] ?? 0).toFixed(1)} mm/yr`} />
          : <div className="twf-empty">{es ? 'Cargando…' : 'Loading…'}</div>}

        <div className="twf-badge">
          <div className="twf-badge-t">{st.label}</div>
          <div className="twf-badge-d">{st.text}</div>
        </div>

        <div className="twf-hud">
          {hud.map((h) => (
            <div className="twf-hud-item" key={h.l}>
              <div className={`twf-hud-v${h.tone ? ' ' + h.tone : ''}`}>{h.v}</div>
              <div className="twf-hud-l">{h.l}</div>
            </div>
          ))}
        </div>

        <Link className="twf-exit" to="/">{es ? 'Volver a la app' : 'Back to the app'}</Link>
      </div>

      <aside className="twf-rail">
        <div className="twf-title">{info ? (es ? info.es : info.en) : ''}</div>
        <div className="twf-sub">{info?.id} · {isReal ? 'real' : 'synthetic'}</div>

        {isReal && (
          <div className="twf-prov">
            {es
              ? 'Cubo Sentinel-1 InSAR real (COMET LiCSAR + LiCSBAS). AVISO: la escena es la caldera volcanica de Campi Flegrei, NO un deposito de relaves. Demuestra el mismo flujo InSAR sobre datos reales; la interpretacion de relaves no se transfiere.'
              : 'Real Sentinel-1 InSAR cube (COMET LiCSAR + LiCSBAS). CAVEAT: the scene is the Campi Flegrei volcanic caldera, NOT a tailings facility. It demonstrates the identical InSAR workflow on real data; a tailings reading does not transfer.'}
          </div>
        )}

        <div className="twf-note">
          {es
            ? 'Clic en el mapa para inspeccionar otro pixel: la serie y el ajuste de velocidad inversa se recalculan en vivo sobre ese pixel. Fukuzono proyecta el tiempo de falla desde el corte del eje de 1/|v|; cuando el ajuste terminal no lo sostiene, el motor no imprime fecha.'
            : 'Click the map to inspect another pixel: the series and the inverse-velocity fit are recomputed live for it. Fukuzono projects a failure time from the x-intercept of 1/|v|; when the terminal fit does not support one, the engine prints no date.'}
        </div>

        <div className="twf-cases">
          {(m?.cases ?? []).slice(0, 12).map((c) => (
            <Link key={c.id} to={`/focus/${c.id}`} className={c.id === info?.id ? 'on' : ''}>{c.id}</Link>
          ))}
        </div>

        <div className="twf-cbar">
          <span>{es ? '← hundimiento' : '← subsiding'}</span>
          <i style={{ background: `linear-gradient(90deg, ${rgbCss(vik(-60, 60))}, ${rgbCss(vik(0, 60))}, ${rgbCss(vik(60, 60))})` }} />
          <span>{es ? 'alza →' : 'uplift →'}</span>
        </div>
      </aside>
    </div>
  );
}
