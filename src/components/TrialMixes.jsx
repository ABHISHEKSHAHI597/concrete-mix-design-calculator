/** Trial mixes 2, 3 and 4 of clause 5.8 / 6.2.9. */
import React from 'react';
import { TABLE_9_MINERAL_DOSAGE } from '../lib/tables.js';
import { num, trim } from '../lib/format.js';
import { Callout } from './fields.jsx';

export default function TrialMixes({ result }) {
  const { input, trials, ssd } = result;
  const high = input.section === 'highStrength';
  const m1 = TABLE_9_MINERAL_DOSAGE[input.mineralType];
  const m2 = TABLE_9_MINERAL_DOSAGE[input.secondMineralType];
  const wcLabel = result.usesMineral ? 'w/cm' : 'w/c';

  const all = [
    {
      n: 1,
      label: 'Trial 1 — as proportioned',
      wc: result.usesMineral ? result.wcm : result.wc,
      cement: ssd.cement,
      mineral1: ssd.mineral1,
      mineral2: ssd.mineral2,
      cementitious: result.cementitious,
      water: result.water,
      chem: ssd.chem,
      ca: ssd.ca,
      fa: ssd.fa,
    },
    ...trials,
  ];

  return (
    <div>
      <p className="sec-note" style={{ maxWidth: '68ch' }}>
        The proportions are to be checked by trial batches. The workability of trial 1 is measured and
        the water or admixture adjusted to reach the stipulated value, which gives trial 2. Trials 3
        and 4 keep that water content and vary the free {wcLabel} by about ten percent either way.
        Plotting strength against the three ratios gives the proportions to carry to field trials.
      </p>

      <div className="tbl-wrap">
        <table className="data">
          <caption>Trial mixes, clause {high ? '6.2.9' : '5.8'}</caption>
          <thead>
            <tr>
              <th>Trial</th>
              <th className="num">{wcLabel}</th>
              <th className="num">Cement</th>
              {ssd.mineral1 > 0 && <th className="num">{m1.label}</th>}
              {ssd.mineral2 > 0 && <th className="num">{m2.label}</th>}
              <th className="num">Water</th>
              <th className="num">Fine agg.</th>
              <th className="num">Coarse agg.</th>
              {ssd.chem > 0 && <th className="num">Admixture</th>}
            </tr>
          </thead>
          <tbody>
            {all.map((t) => (
              <tr key={t.n}>
                <td>
                  {t.label}
                  <span className="ref" style={{ display: 'block' }}>
                    kg/m³, aggregate SSD
                  </span>
                </td>
                <td className="num">{trim(t.wc, 3)}</td>
                <td className="num">{num(t.cement, 0)}</td>
                {ssd.mineral1 > 0 && <td className="num">{num(t.mineral1, 1)}</td>}
                {ssd.mineral2 > 0 && <td className="num">{num(t.mineral2, 1)}</td>}
                <td className="num">{num(t.water, 0)}</td>
                <td className="num">{num(t.fa, 0)}</td>
                <td className="num">{num(t.ca, 0)}</td>
                {ssd.chem > 0 && <td className="num">{num(t.chem, 2)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <Callout kind="info" title="What to record from each trial">
          Slump, freedom from segregation and bleeding, finishing properties, and the 28 day
          compressive strength. Clause {high ? '6.2.10' : '5.8.1'} also asks the report to carry the
          period of testing, the details of the structure, all the data of clause 4.1 with any
          deviation from IS 456, the test data for the materials, the brand and manufacturing date of
          the cement with the percentage of pozzolana or slag, the source of the aggregates, the
          details of the trials, and the recommended proportions.
        </Callout>
      </div>
    </div>
  );
}
