/**
 * One cubic metre of concrete, drawn as the absolute volumes that the
 * standard actually proportions: aggregate, water, cementitious
 * material, admixture and entrapped air, stacked to unity.
 */
import React from 'react';
import { trim, num } from '../lib/format.js';

const SCALE = [1.0, 0.8, 0.6, 0.4, 0.2, 0];

export default function UnitCube({ result }) {
  const segs = result.segments;
  const total = segs.reduce((a, s) => a + s.volume, 0);

  return (
    <div>
      <div className="cube-head">
        <h2>One cubic metre</h2>
        <span className="cube-unit">Σ = {trim(total, 3)} m³</span>
      </div>
      <div className="cube">
        <div className="cube-scale" aria-hidden="true">
          {SCALE.map((v) => (
            <span key={v} style={{ top: `${(1 - v) * 100}%` }}>
              {v.toFixed(1)}
            </span>
          ))}
        </div>

        <div
          className="cube-bar"
          role="img"
          aria-label={`Volume breakdown of one cubic metre: ${segs
            .map((s) => `${s.label} ${trim(s.volume, 3)} cubic metres`)
            .join(', ')}`}
        >
          {segs.map((s) => (
            <div
              key={s.key}
              className="cube-seg"
              data-key={s.key}
              style={{
                flex: `${Math.max(s.volume, 0)} 0 0%`,
                background: `var(--m-${s.key}, var(--m-cement))`,
              }}
              title={`${s.label}: ${trim(s.volume, 4)} m³`}
            />
          ))}
        </div>

        <div className="cube-legend">
          <table>
            <thead>
              <tr>
                <td />
                <td className="qty vol">m³</td>
                <td className="qty">kg</td>
              </tr>
            </thead>
            <tbody>
              {segs.map((s) => (
                <tr key={s.key}>
                  <td className="name">
                    <span
                      className="sw"
                      style={{ background: `var(--m-${s.key}, var(--m-cement))` }}
                    />
                    {s.label}
                  </td>
                  <td className="qty vol">{trim(s.volume, 3)}</td>
                  <td className="qty">{s.mass ? num(s.mass, s.mass < 10 ? 2 : 0) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
