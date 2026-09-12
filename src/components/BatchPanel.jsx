/** Batch quantities for an arbitrary volume of concrete. */
import React, { useState } from 'react';
import { batchQuantities } from '../lib/mixDesign.js';
import { num } from '../lib/format.js';
import { Field, NumberInput, Segmented } from './fields.jsx';

const PRESETS = [
  { v: 0.015, label: 'Six 150 mm cubes' },
  { v: 0.05, label: 'Laboratory pan, 50 L' },
  { v: 1, label: 'One cubic metre' },
  { v: 6, label: 'Transit mixer, 6 m³' },
];

export default function BatchPanel({ result }) {
  const [volume, setVolume] = useState(1);
  const [basis, setBasis] = useState('field');
  const corrected = result.input.aggCondition !== 'ssd';
  const batch = batchQuantities(result, volume, basis === 'field');

  return (
    <div>
      <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '30rem', marginBottom: '1.5rem' }}>
        <Field label="Volume of concrete to batch">
          <NumberInput value={volume} onChange={setVolume} unit="m³" step="0.01" min={0} />
        </Field>

        {corrected && (
          <Field
            label="Aggregate basis"
            hint="Field weights are the ones to give the batching plant; the SSD basis is the design condition."
          >
            <Segmented
              value={basis}
              onChange={setBasis}
              options={[
                { value: 'field', label: 'Field condition' },
                { value: 'ssd', label: 'SSD' },
              ]}
            />
          </Field>
        )}

        <div className="btnrow">
          {PRESETS.map((p) => (
            <button key={p.v} className="btn quiet" type="button" onClick={() => setVolume(p.v)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tbl-wrap">
        <table className="data">
          <caption>Batch quantities for {num(volume, volume < 1 ? 3 : 2)} m³</caption>
          <thead>
            <tr>
              <th>Ingredient</th>
              <th className="num">Per m³, kg</th>
              <th className="num">Batch, kg</th>
            </tr>
          </thead>
          <tbody>
            {batch.rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td className="num">{num(r.perM3, r.perM3 < 10 ? 2 : 0)}</td>
                <td className="num">{num(r.qty, r.qty < 10 ? 3 : 1)}</td>
              </tr>
            ))}
            <tr className="total">
              <td>Total mass</td>
              <td className="num">{num(result.density, 0)}</td>
              <td className="num">{num(batch.totalMass, 1)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--ink-2)' }}>
        Cement for this batch is <strong>{num(batch.bags, 2)} bags</strong> of 50 kg. Water of{' '}
        {num(batch.rows.find((r) => r.label.startsWith('Water'))?.qty ?? 0, 2)} kg is{' '}
        {num(batch.rows.find((r) => r.label.startsWith('Water'))?.qty ?? 0, 2)} litres.
      </p>
    </div>
  );
}
