/**
 * Figure 1 of IS 10262:2019 redrawn from the digitised curves, with the
 * point actually used by the design marked on it.
 */
import React from 'react';
import { FIG_1_WC_AXIS, FIG_1_CURVES } from '../lib/tables.js';

const W = 320;
const H = 210;
const PAD = { l: 30, r: 10, t: 10, b: 28 };
const X0 = 0.25;
const X1 = 0.65;
const Y1 = 80;

const px = (wc) => PAD.l + ((wc - X0) / (X1 - X0)) * (W - PAD.l - PAD.r);
const py = (s) => H - PAD.b - (s / Y1) * (H - PAD.t - PAD.b);

export default function Fig1Plot({ activeCurve, wc, strength, tolerance = 0.01 }) {
  const paths = [1, 2, 3].map((c) => ({
    c,
    d: FIG_1_CURVES[c]
      .map((s, i) => `${i === 0 ? 'M' : 'L'}${px(FIG_1_WC_AXIS[i]).toFixed(1)},${py(s).toFixed(1)}`)
      .join(' '),
  }));

  const showMarker =
    Number.isFinite(wc) && Number.isFinite(strength) && wc >= X0 && wc <= X1 && strength <= Y1;

  return (
    <div className="fig1">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Figure 1 of IS 10262:2019. Curve ${activeCurve} is in use; the design point is at a free water-cement ratio of ${wc} and ${strength} newtons per square millimetre.`}>
        {[0, 10, 20, 30, 40, 50, 60, 70, 80].map((s) => (
          <line key={s} className="grid" x1={PAD.l} x2={W - PAD.r} y1={py(s)} y2={py(s)} />
        ))}
        {[0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65].map((v) => (
          <line key={v} className="grid" y1={PAD.t} y2={H - PAD.b} x1={px(v)} x2={px(v)} />
        ))}
        <line className="axis" x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} />
        <line className="axis" x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} />

        {[0, 20, 40, 60, 80].map((s) => (
          <text key={s} className="tick" x={PAD.l - 4} y={py(s) + 2.5} textAnchor="end">
            {s}
          </text>
        ))}
        {[0.25, 0.35, 0.45, 0.55, 0.65].map((v) => (
          <text key={v} className="tick" x={px(v)} y={H - PAD.b + 10} textAnchor="middle">
            {v.toFixed(2)}
          </text>
        ))}

        <text className="axlabel" x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle">
          Free water-cement ratio
        </text>
        <text className="axlabel" x={9} y={(PAD.t + H - PAD.b) / 2}
          textAnchor="middle" transform={`rotate(-90 9 ${(PAD.t + H - PAD.b) / 2})`}>
          28 day strength, N/mm²
        </text>

        {paths.map((p) => (
          <path key={p.c} className={`curve${p.c === activeCurve ? ' live' : ''}`} d={p.d} />
        ))}
        {paths.map((p) => (
          <text key={`l${p.c}`} className="curvelabel"
            x={px(0.255) + 2} y={py(FIG_1_CURVES[p.c][0]) - 3}>
            {p.c}
          </text>
        ))}

        {showMarker && (
          <>
            <rect
              className="band"
              x={px(Math.max(X0, wc - tolerance))}
              y={PAD.t}
              width={px(Math.min(X1, wc + tolerance)) - px(Math.max(X0, wc - tolerance))}
              height={H - PAD.t - PAD.b}
            />
            <line className="markerline" x1={px(wc)} x2={px(wc)} y1={py(strength)} y2={H - PAD.b} />
            <line className="markerline" x1={PAD.l} x2={px(wc)} y1={py(strength)} y2={py(strength)} />
            <circle className="marker" cx={px(wc)} cy={py(strength)} r={2.6} />
          </>
        )}
      </svg>
    </div>
  );
}
