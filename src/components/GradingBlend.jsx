/**
 * Combined grading of coarse aggregate fractions, clause 5.6.
 * Controlled by App so the printed report shows the same blend.
 */
import React from 'react';
import {
  combineGrading,
  gradingCompliance,
  solveBlend,
  initialGradingState,
} from '../lib/grading.js';
import { num, trim } from '../lib/format.js';
import { Callout } from './fields.jsx';

const cell = {
  width: '4.4rem',
  textAlign: 'right',
  fontFamily: 'var(--mono)',
  fontSize: '0.8125rem',
  border: '1px solid var(--rule-strong)',
  background: '#fff',
  padding: '0.2rem 0.35rem',
};

const toNum = (v) => (v === '' ? '' : Number(v));

export default function GradingBlend({ result, state, setState, readOnly = false }) {
  const { input } = result;
  const { fractions, proportions, limits, sieves, source, note } = state;
  const total = proportions.reduce((a, b) => a + (Number(b) || 0), 0);
  const rows = combineGrading(fractions, proportions, sieves);
  const comp = gradingCompliance(rows, limits);
  const limitBy = new Map(limits.map((l) => [l.sieve, l]));

  const update = (patch) => setState((s) => ({ ...s, ...patch }));
  const setPassing = (k, sieve, v) =>
    update({
      fractions: fractions.map((f, j) =>
        j === k ? { ...f, passing: { ...f.passing, [sieve]: toNum(v) } } : f
      ),
    });
  const setName = (k, v) =>
    update({ fractions: fractions.map((f, j) => (j === k ? { ...f, name: v } : f)) });
  const setProp = (k, v) =>
    update({ proportions: proportions.map((p, j) => (j === k ? toNum(v) : p)) });
  const setLimit = (sieve, key, v) =>
    update({ limits: limits.map((l) => (l.sieve === sieve ? { ...l, [key]: toNum(v) } : l)) });
  const addFraction = () =>
    update({
      fractions: [
        ...fractions,
        {
          name: `Fraction ${fractions.length + 1}`,
          passing: Object.fromEntries(sieves.map((s) => [s, 100])),
        },
      ],
      proportions: [...proportions, 0],
    });
  const removeFraction = (k) => {
    if (fractions.length <= 1) return;
    update({
      fractions: fractions.filter((_, j) => j !== k),
      proportions: proportions.filter((_, j) => j !== k),
    });
  };
  const solve = () => update({ proportions: solveBlend(fractions, limits, { sieves }).proportions });
  const reset = () => setState(initialGradingState(input.msa, input.section));

  const ssdCA = result.ssd.ca;
  const fieldCA = result.field?.ca ?? ssdCA;
  const corrected = input.aggCondition !== 'ssd' && fieldCA !== ssdCA;

  const passingCell = (k, sieve) => {
    const v = fractions[k].passing?.[sieve];
    if (readOnly) return v === '' || v === undefined ? '—' : trim(v, 2);
    return (
      <input
        type="number"
        style={cell}
        value={v ?? ''}
        min={0}
        max={100}
        step="0.1"
        aria-label={`${fractions[k].name}, percent passing ${sieve} mm`}
        onChange={(e) => setPassing(k, sieve, e.target.value)}
      />
    );
  };

  return (
    <div>
      <p className="sec-note" style={{ maxWidth: '70ch' }}>
        Coarse aggregate arrives as single sized fractions. Clause 5.6 has them combined in
        proportions that give an overall grading conforming to{' '}
        {source ?? 'the grading limits'} for {input.msa} mm nominal maximum size. The combined
        percentage passing each sieve is the weighted mean of the fractions.
      </p>

      {source === 'IS 383 : 2016, Table 7' && !readOnly && (
        <Callout kind="warn" title="Confirm the IS 383 limits against your copy of that standard">
          IS 383 is not reproduced inside IS 10262, so the limits below are editable defaults. With
          them, the sieve analysis of Annex A combines to 60:40 inside the limits, as the annex
          states.
        </Callout>
      )}
      {note && !readOnly && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--ink-3)', margin: '0 0 1rem' }}>{note}</p>
      )}

      <div className="tbl-wrap">
        <table className="data">
          <caption>Sieve analysis of the available fractions, percent passing</caption>
          <thead>
            <tr>
              <th>Sieve, mm</th>
              {fractions.map((f, k) => (
                <th key={k} className="num">
                  {readOnly ? (
                    f.name
                  ) : (
                    <span style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={f.name}
                        onChange={(e) => setName(k, e.target.value)}
                        aria-label={`Name of fraction ${k + 1}`}
                        style={{ ...cell, width: '6.5rem', textAlign: 'left', fontFamily: 'var(--sans)' }}
                      />
                      {fractions.length > 1 && (
                        <button
                          type="button"
                          className="btn quiet"
                          onClick={() => removeFraction(k)}
                          aria-label={`Remove ${f.name}`}
                          title="Remove this fraction"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  )}
                </th>
              ))}
              <th className="num">Lower limit</th>
              <th className="num">Upper limit</th>
            </tr>
          </thead>
          <tbody>
            {sieves.map((sieve) => {
              const lim = limitBy.get(sieve);
              return (
                <tr key={sieve}>
                  <td className="num" style={{ textAlign: 'left' }}>{sieve}</td>
                  {fractions.map((_, k) => (
                    <td key={k} className="num">{passingCell(k, sieve)}</td>
                  ))}
                  <td className="num">
                    {lim ? (
                      readOnly ? lim.min : (
                        <input type="number" style={cell} value={lim.min}
                          aria-label={`Lower limit at ${sieve} mm`}
                          onChange={(e) => setLimit(sieve, 'min', e.target.value)} />
                      )
                    ) : '—'}
                  </td>
                  <td className="num">
                    {lim ? (
                      readOnly ? lim.max : (
                        <input type="number" style={cell} value={lim.max}
                          aria-label={`Upper limit at ${sieve} mm`}
                          onChange={(e) => setLimit(sieve, 'max', e.target.value)} />
                      )
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
            <tr className="total">
              <td>Proportion in the blend, percent</td>
              {fractions.map((_, k) => (
                <td key={k} className="num">
                  {readOnly ? (
                    trim(proportions[k], 1)
                  ) : (
                    <input
                      type="number"
                      style={{ ...cell, fontWeight: 500 }}
                      value={proportions[k] ?? ''}
                      min={0}
                      max={100}
                      step="1"
                      aria-label={`Proportion of ${fractions[k].name}`}
                      onChange={(e) => setProp(k, e.target.value)}
                    />
                  )}
                </td>
              ))}
              <td className="num" colSpan={2}>
                Σ = {trim(total, 1)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="btnrow" style={{ margin: '0.9rem 0 1.25rem' }}>
          <button className="btn" type="button" onClick={solve} disabled={!limits.length}>
            Find a conforming blend
          </button>
          <button className="btn ghost" type="button" onClick={addFraction}>
            Add a fraction
          </button>
          <button className="btn quiet" type="button" onClick={reset}>
            Reset to the worked example
          </button>
        </div>
      )}

      {Math.abs(total - 100) > 0.01 && (
        <Callout kind="err" title="The proportions do not add up to 100 percent">
          They total {trim(total, 1)} percent. Adjust them, or use Find a conforming blend.
        </Callout>
      )}

      <div className="tbl-wrap" style={{ marginTop: readOnly ? '1rem' : 0 }}>
        <table className="data">
          <caption>Combined grading</caption>
          <thead>
            <tr>
              <th>Sieve, mm</th>
              {fractions.map((f, k) => (
                <th key={k} className="num">
                  {f.name}
                  <br />at {trim(proportions[k], 1)}%
                </th>
              ))}
              <th className="num">Combined</th>
              <th className="num">Required</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {comp.rows.map((row) => (
              <tr key={row.sieve}>
                <td className="num" style={{ textAlign: 'left' }}>{row.sieve}</td>
                {row.contributions.map((c, k) => (
                  <td key={k} className="num">{c === null ? '—' : trim(c, 2)}</td>
                ))}
                <td className="num" style={{ fontWeight: 500 }}>
                  {row.combined === null ? '—' : trim(row.combined, 2)}
                </td>
                <td className="num">
                  {row.limit
                    ? row.limit.min === row.limit.max
                      ? row.limit.min
                      : `${row.limit.min} to ${row.limit.max}`
                    : '—'}
                </td>
                <td>
                  {row.status === 'in' && <span className="mark exact">within</span>}
                  {row.status === 'out' && <span className="mark fail">off by {trim(row.off, 2)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1rem' }}>
        {comp.checkedCount === 0 ? (
          <Callout kind="info">
            No grading limits apply to this nominal maximum size. Enter the limits in the table above
            to check the blend.
          </Callout>
        ) : comp.conforms ? (
          <Callout kind="ok" title="The combined grading conforms">
            Every sieve with a requirement lies within its limits
            {source ? `, per ${source}` : ''}.
          </Callout>
        ) : (
          <Callout kind="err" title="The combined grading does not conform">
            The {comp.worst.sieve} mm sieve is {trim(comp.worst.off, 2)} percent outside its limits.
            Change the proportions, add a fraction, or use Find a conforming blend.
          </Callout>
        )}
      </div>

      <div className="tbl-wrap" style={{ marginTop: '1.25rem' }}>
        <table className="data">
          <caption>Coarse aggregate by fraction, per cubic metre</caption>
          <thead>
            <tr>
              <th>Fraction</th>
              <th className="num">Proportion</th>
              <th className="num">SSD, kg/m³</th>
              {corrected && <th className="num">{input.aggCondition === 'dry' ? 'Dry' : 'Wet'}, kg/m³</th>}
            </tr>
          </thead>
          <tbody>
            {fractions.map((f, k) => (
              <tr key={k}>
                <td>{f.name}</td>
                <td className="num">{trim(proportions[k], 1)}%</td>
                <td className="num">{num((ssdCA * (Number(proportions[k]) || 0)) / 100, 0)}</td>
                {corrected && (
                  <td className="num">{num((fieldCA * (Number(proportions[k]) || 0)) / 100, 0)}</td>
                )}
              </tr>
            ))}
            <tr className="total">
              <td>Total coarse aggregate</td>
              <td className="num">{trim(total, 1)}%</td>
              <td className="num">{num((ssdCA * total) / 100, 0)}</td>
              {corrected && <td className="num">{num((fieldCA * total) / 100, 0)}</td>}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
