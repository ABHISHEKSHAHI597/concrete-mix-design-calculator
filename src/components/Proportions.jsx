/** Final mix proportions, per cubic metre, with the mix ratio. */
import React from 'react';
import { TABLE_9_MINERAL_DOSAGE, AGGREGATE_CONDITIONS } from '../lib/tables.js';
import { num, trim } from '../lib/format.js';
import { Callout } from './fields.jsx';

export default function Proportions({ result }) {
  const { input, ssd, field } = result;
  const corrected = input.aggCondition !== 'ssd';
  const m1 = TABLE_9_MINERAL_DOSAGE[input.mineralType];
  const m2 = TABLE_9_MINERAL_DOSAGE[input.secondMineralType];

  const rows = [
    { label: 'Cement', ssd: ssd.cement, field: field.cement, dp: 0 },
    ssd.mineral1 > 0 && {
      label: m1.label,
      ssd: ssd.mineral1,
      field: field.mineral1,
      dp: 2,
    },
    ssd.mineral2 > 0 && {
      label: m2.label,
      ssd: ssd.mineral2,
      field: field.mineral2,
      dp: 2,
    },
    {
      label: corrected ? 'Water, free (net mixing)' : 'Water',
      ssd: ssd.water,
      field: corrected ? null : ssd.water,
      dp: 0,
    },
    corrected && {
      label: 'Water to be added at the mixer',
      ssd: null,
      field: field.water,
      dp: 0,
      strong: true,
    },
    { label: 'Fine aggregate', ssd: ssd.fa, field: field.fa, dp: 0 },
    { label: 'Coarse aggregate', ssd: ssd.ca, field: field.ca, dp: 0 },
    ssd.chem > 0 && { label: 'Chemical admixture', ssd: ssd.chem, field: field.chem, dp: 2 },
    ssd.vma > 0 && { label: 'Viscosity modifying admixture', ssd: ssd.vma, field: field.vma ?? ssd.vma, dp: 2 },
  ].filter(Boolean);

  return (
    <div>
      <div className="tbl-wrap">
        <table className="data">
          <caption>Mix proportions for trial number 1, per cubic metre</caption>
          <thead>
            <tr>
              <th>Ingredient</th>
              <th className="num">
                Saturated surface dry
                <br />
                kg/m³
              </th>
              {corrected && (
                <th className="num">
                  {AGGREGATE_CONDITIONS[input.aggCondition].label.split(' (')[0]} condition
                  <br />
                  kg/m³
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} style={r.strong ? { fontWeight: 500 } : undefined}>
                <td>{r.label}</td>
                <td className="num">{r.ssd === null ? '—' : num(r.ssd, r.dp)}</td>
                {corrected && (
                  <td className="num">{r.field === null ? '—' : num(r.field, r.dp)}</td>
                )}
              </tr>
            ))}
            <tr className="total">
              <td>Fresh density</td>
              <td className="num">{num(result.density, 0)}</td>
              {corrected && <td className="num">{num(result.density, 0)}</td>}
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1.75rem', display: 'grid', gap: '1.25rem' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.125rem', marginBottom: '0.35rem' }}>
            Mix ratio by mass
          </h3>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '1.5rem', margin: '0 0 0.25rem' }}>
            {result.ratio.label}
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--ink-2)', margin: 0 }}>
            {result.usesMineral ? 'Total cementitious material' : 'Cement'} : fine aggregate : coarse
            aggregate, at a free water-{result.usesMineral ? 'cementitious materials' : 'cement'} ratio of{' '}
            {trim(result.usesMineral ? result.wcm : result.wc, 3)} (water {result.ratio.water} of the{' '}
            {result.ratio.basis}).
          </p>
        </div>

        <Callout kind="info" title="Aggregates are to be used in the saturated surface dry condition">
          Where they are not, the mixing water is adjusted for the moisture the aggregate absorbs or
          contributes, and the aggregate masses are adjusted to match. Surface water and water
          absorption are to be determined in accordance with IS 2386 (Part 3).
        </Callout>

        <Callout
          kind="info"
          title={`Coarse aggregate to be combined to the grading of ${
            input.section === 'mass' && Number(input.msa) > 40 ? 'IS 10262, Table 14' : 'IS 383, Table 7'
          }, for ${input.msa} mm nominal maximum size`}
        >
          The total mass of coarse aggregate is divided between the available single sized fractions in
          the ratio that satisfies the overall grading requirement, clause 5.6. The Aggregate grading
          panel combines your sieve analyses, checks the result against the limits and splits the
          coarse aggregate mass between the fractions.
        </Callout>
      </div>
    </div>
  );
}
