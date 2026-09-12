/** The live readout beside the worksheet. */
import React from 'react';
import UnitCube from './UnitCube.jsx';
import { trim, num } from '../lib/format.js';

export default function Instrument({ result, onSave }) {
  const { input } = result;
  const usesMineral = result.usesMineral;

  return (
    <aside className="instrument">
      {!result.ok && (
        <div className="callout err" role="alert" style={{ marginBottom: '1.1rem' }}>
          <h4>The mix cannot be proportioned yet</h4>
          <div>{result.errors[0]}</div>
          {result.errors.length > 1 && (
            <div style={{ marginTop: '0.3rem', fontSize: '0.8125rem' }}>
              {result.errors.length - 1} more in the calculation sheet.
            </div>
          )}
        </div>
      )}
      <UnitCube result={result} />

      <div className="readouts">
        <div className="readout lead">
          <span className="rl">
            Target mean strength
            <small>clause 4.2</small>
          </span>
          <span className="rv">
            {trim(result.targetStrength, 2)}
            <em>N/mm²</em>
          </span>
        </div>

        <div className="readout lead">
          <span className="rl">
            {usesMineral ? 'Free water-cementitious ratio' : 'Free water-cement ratio'}
            <small>governed by {result.wcGovernedBy}</small>
          </span>
          <span className="rv">{trim(usesMineral ? result.wcm : result.wc, 3)}</span>
        </div>

        <div className="readout">
          <span className="rl">
            Total cementitious material
            <small>minimum {result.minCementitious} kg/m³</small>
          </span>
          <span className="rv">
            {num(result.cementitious, 0)}
            <em>kg/m³</em>
          </span>
        </div>

        <div className="readout">
          <span className="rl">Free water</span>
          <span className="rv">
            {num(result.water, 0)}
            <em>kg/m³</em>
          </span>
        </div>

        {result.section === 'scc' ? (
          <>
            <div className="readout">
              <span className="rl">
                Water to powder ratio, by volume
                <small>clause 8.1, required 0.85 to 1.10</small>
              </span>
              <span className="rv">{trim(result.scc.waterPowderRatio, 3)}</span>
            </div>
            <div className="readout">
              <span className="rl">
                Powder content
                <small>all material finer than 0.125 mm</small>
              </span>
              <span className="rv">
                {num(result.scc.powder, 0)}
                <em>kg/m³</em>
              </span>
            </div>
          </>
        ) : (
          <div className="readout">
            <span className="rl">
              Coarse to total aggregate, by volume
              <small>
                Table {input.section === 'highStrength' ? 10 : input.section === 'mass' ? 13 : 5}
              </small>
            </span>
            <span className="rv">{trim(result.caVolFraction, 3)}</span>
          </div>
        )}

        {result.massUplift > 0 && (
          <div className="readout">
            <span className="rl">
              Target for cube tests
              <small>clause 9.2, {result.massUplift} percent for wet sieving</small>
            </span>
            <span className="rv">
              {trim(result.targetStrengthCubes, 2)}
              <em>N/mm²</em>
            </span>
          </div>
        )}

        {result.mortar && (
          <div className="readout">
            <span className="rl">
              Mortar content
              <small>
                Table 15, {result.mortar.target.toFixed(2)} ± {result.mortar.tol.toFixed(2)}
              </small>
            </span>
            <span className="rv">
              {trim(result.mortar.value, 3)}
              <em>m³</em>
            </span>
          </div>
        )}

        <div className="readout">
          <span className="rl">Fresh density</span>
          <span className="rv">
            {num(result.density, 0)}
            <em>kg/m³</em>
          </span>
        </div>

        <div className="ratio-line">
          {result.ratio.label}
          <small>
            cementitious : fine aggregate : coarse aggregate, by mass, at w/c
            {usesMineral ? 'm' : ''} {trim(usesMineral ? result.wcm : result.wc, 3)}
          </small>
        </div>
      </div>

      <div className="lamps">
        <h3>Durability and limit checks</h3>
        {result.checks.map((c) => {
          const state = c.pass ? 'pass' : c.warnOnly ? 'warn' : 'fail';
          return (
            <div key={c.id} className={`lamp ${state}`}>
              <span className="dot" />
              <span>
                <span className="lt">{c.label}</span>
                <span className="ld">
                  {c.detail} · {c.ref}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="btnrow no-print" style={{ marginTop: '1.35rem' }}>
        <button className="btn" type="button" onClick={onSave}>
          Save this design
        </button>
        <button className="btn ghost" type="button" onClick={() => window.print()}>
          Print report
        </button>
      </div>
    </aside>
  );
}
