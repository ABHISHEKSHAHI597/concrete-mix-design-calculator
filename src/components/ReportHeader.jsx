/** Masthead for the printed report; hidden on screen. */
import React from 'react';
import { today, trim } from '../lib/format.js';
import { CEMENT_TYPES, IS456_TABLE_3_EXPOSURE } from '../lib/tables.js';

export default function ReportHeader({ result }) {
  const { input } = result;
  return (
    <div className="report-head print-only">
      <span className="standard-mark">IS 10262 : 2019 · Concrete mix proportioning, guidelines</span>
      <h1>Concrete mix design, M {input.fck}</h1>
      <div className="meta">
        <span>{input.project || 'Mix design report'}</span>
        <span>{CEMENT_TYPES[input.cementType].label}</span>
        <span>{input.msa} mm nominal maximum size</span>
        <span>{IS456_TABLE_3_EXPOSURE[input.exposure].label} exposure</span>
        <span>
          {input.section === 'scc' ? `${input.slumpFlowClass} slump flow class` : `${input.slump} mm slump`}
        </span>
        <span>
          Target {trim(result.targetStrength, 2)} N/mm² at w/c
          {result.usesMineral ? 'm' : ''} {trim(result.usesMineral ? result.wcm : result.wc, 3)}
        </span>
        <span>{today()}</span>
      </div>
    </div>
  );
}
