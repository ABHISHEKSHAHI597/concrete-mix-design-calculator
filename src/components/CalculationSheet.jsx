/**
 * The calculation sheet: every step in the order of the standard, with
 * the clause in the margin, the substituted expression under the label
 * and the value on the right.
 */
import React from 'react';
import { trim, num } from '../lib/format.js';
import { Callout } from './fields.jsx';

function value(line) {
  if (line.kind === 'text') return line.value;
  const v = Number(line.value);
  if (!Number.isFinite(v)) return String(line.value);
  if (Math.abs(v) >= 100) return num(v, Number.isInteger(v) ? 0 : 2);
  return trim(v, 5);
}

export default function CalculationSheet({ result }) {
  return (
    <div>
      {result.errors.map((e, n) => (
        <Callout key={n} kind="err" title="The mix cannot be proportioned">
          {e}
        </Callout>
      ))}

      {result.steps.map((s, n) => (
        <div className="calcstep" key={n}>
          <span className="clause">{s.clause}</span>
          <div className="ct">
            <h3>{s.title}</h3>
            {s.lines.map((l, m) => (
              <div className={`calcline${l.emphasis ? ' emph' : ''}`} key={m}>
                <span className="cl">
                  {l.label}
                  {l.expr && <span className="ce">{l.expr}</span>}
                </span>
                <span className="cv">
                  {value(l)}
                  {l.unit && <em>{l.unit}</em>}
                </span>
              </div>
            ))}
            {s.note && <p className="step-note">{s.note}</p>}
          </div>
        </div>
      ))}

      {result.warnings.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.125rem', marginBottom: '0.6rem' }}>
            Points to carry into the trials
          </h3>
          {result.warnings.map((w, n) => (
            <Callout key={n} kind="warn">
              {w}
            </Callout>
          ))}
        </div>
      )}
    </div>
  );
}
