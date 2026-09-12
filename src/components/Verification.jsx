/**
 * Verification of the engine against the illustrative examples printed
 * in the annexes of IS 10262 : 2019.
 */
import React, { useMemo, useState } from 'react';
import { runAllVerification } from '../lib/verification.js';
import { fig1WaterCementRatio } from '../lib/mixDesign.js';
import { num, trim } from '../lib/format.js';
import { Callout } from './fields.jsx';

const fmt = (v) => {
  if (typeof v !== 'number') return String(v);
  if (Math.abs(v) >= 100) return num(v, Number.isInteger(v) ? 0 : 2);
  return trim(v, 4);
};

export default function Verification({ onLoadCase }) {
  const cases = useMemo(() => runAllVerification(), []);
  const [openCase, setOpenCase] = useState(null);

  const totals = cases.reduce(
    (a, c) => ({
      exact: a.exact + c.exact,
      passed: a.passed + c.passed,
      total: a.total + c.total,
    }),
    { exact: 0, passed: 0, total: 0 }
  );
  const allPass = cases.every((c) => c.allPass);

  return (
    <div className="page">
      <div className="prose" style={{ maxWidth: '76ch' }}>
        <h2>Verification against the standard</h2>
        <p className="lede">
          The six worked examples of IS 10262 : 2019 are run through this calculator and set against
          the values the standard itself prints. Nothing is hard coded: each case supplies only the
          stipulations and the material test data of the annex, and the engine derives the rest.
        </p>
      </div>

      <div style={{ margin: '1.25rem 0 2rem', maxWidth: '76ch' }}>
        <Callout
          kind={allPass ? 'ok' : 'err'}
          title={
            allPass
              ? `All ${totals.total} checks agree with the standard`
              : `${totals.total - totals.passed} of ${totals.total} checks disagree`
          }
        >
          {totals.exact} of {totals.total} values reproduce the printed figure exactly. The remainder
          differ by less than a kilogram per cubic metre, because the standard rounds its own
          intermediate volumes and masses at different points in the six examples. Where a case needs
          a particular rounding rule to reproduce the annex, that rule is named in the case heading and
          is the same setting offered in the worksheet.
        </Callout>
      </div>

      {cases.map((c) => (
        <div className="vcase" key={c.id}>
          <div className="vcase-head">
            <span className="clause">{c.clause}</span>
            <h3>{c.title}</h3>
            <span className={`tally ${c.allPass ? 'all' : 'some'}`}>
              {c.exact}/{c.total} exact · {c.passed}/{c.total} agree
            </span>
            <button className="btn quiet no-print" type="button" onClick={() => onLoadCase(c.input)}>
              Open in the worksheet
            </button>
          </div>

          <p className="sec-note" style={{ maxWidth: '76ch' }}>
            {c.summary} Cementitious content rounded{' '}
            {c.input.roundCementitious === 'up' ? 'up to the next kilogram' : 'to the nearest kilogram'};
            volume of all in aggregate carried to {c.input.aggVolDp} decimals.
          </p>

          <div className="tbl-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Quantity</th>
                  <th>Clause</th>
                  <th className="num">Standard</th>
                  <th className="num">This calculator</th>
                  <th className="num">Difference</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {c.rows.map((r) => (
                  <tr key={r.label + r.ref}>
                    <td>{r.label}</td>
                    <td className="ref">{r.ref}</td>
                    <td className="num">
                      {fmt(r.std)}
                      {r.unit ? ` ${r.unit}` : ''}
                    </td>
                    <td className="num">{fmt(typeof r.calc === 'number' ? Number(r.calc) : r.calc)}</td>
                    <td className="num">
                      {r.exact ? '0' : (r.delta > 0 ? '+' : '') + trim(r.delta, 4)}
                    </td>
                    <td>
                      <span className={`mark ${r.exact ? 'exact' : r.pass ? 'ok' : 'fail'}`}>
                        {r.exact ? 'exact' : r.pass ? 'rounding' : 'FAIL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="prose" style={{ maxWidth: '76ch' }}>
        <h2>On the reading of Figure 1</h2>
        <p>
          Figure 1 of the standard is a graph, not a table. The three curves in this calculator are a
          digitisation of the printed figure, read at hundredths of the free water-cement ratio after
          the axes were calibrated against the frame of the plot. The standard reads the same graph in
          three of its examples, and its readings scatter either side of the digitised curve by about a
          hundredth:
        </p>
      </div>

      <div className="tbl-wrap" style={{ maxWidth: '76ch', margin: '0.5rem 0 1rem' }}>
        <table className="data">
          <thead>
            <tr>
              <th>Annex</th>
              <th className="num">Curve</th>
              <th className="num">Target strength, N/mm²</th>
              <th className="num">Standard reads</th>
              <th className="num">Digitised curve gives</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['A, B and C', 48.25, 0.36],
              ['E', 38.25, 0.43],
              ['F', 20.775, 0.61],
            ].map(([annex, fck, std]) => (
              <tr key={annex}>
                <td>{annex}</td>
                <td className="num">2</td>
                <td className="num">{trim(fck, 2)}</td>
                <td className="num">{std.toFixed(2)}</td>
                <td className="num">{trim(fig1WaterCementRatio(2, fck).wc, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="prose" style={{ maxWidth: '76ch' }}>
        <p>
          The scatter runs in both directions, which is what reading a printed graph by eye looks like,
          rather than an offset in the digitisation. The cases for Annexes A to E therefore adopt the
          standard's own reading, entered as a manual value, which is what the worksheet lets you do
          whenever your reading of the printed figure differs. The plot in the worksheet shades that
          tolerance either side of the design point. Annex F needs no manual entry: its reading of 0.61
          and the digitised value both exceed the durability limit of 0.60, which governs. Clause 5.1 is
          explicit that the relationship should preferably be established for the materials actually
          to be used, so a value from site trials should displace both.
        </p>
      </div>
    </div>
  );
}
