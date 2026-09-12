/**
 * Standard deviation from strength test results, clause 4.2.1.2.
 * Single group by 4.2.1.2.1, two groups of the same grade by 4.2.1.2.2.
 */
import React, { useState } from 'react';
import { sdSingleGroup, sdTwoGroups } from '../lib/mixDesign.js';
import { num, trim } from '../lib/format.js';
import { Callout } from './fields.jsx';

const parse = (text) =>
  text
    .split(/[\s,;]+/)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);

export default function SDCalculator({ onAdopt }) {
  const [mode, setMode] = useState('one');
  const [g1, setG1] = useState('');
  const [g2, setG2] = useState('');

  const a = parse(g1);
  const b = parse(g2);
  const one = sdSingleGroup(a);
  const two = mode === 'two' ? sdTwoGroups(a, b) : null;
  const S = mode === 'one' ? one?.S : two?.S;

  const shortOne = one && one.n < 30;
  const shortTwo =
    two && (two.g1.n < 10 || two.g2.n < 10 || two.g1.n + two.g2.n < 30);

  return (
    <div style={{ paddingTop: '0.5rem' }}>
      <span className="segmented" style={{ marginBottom: '0.75rem' }}>
        <button type="button" aria-pressed={mode === 'one'} onClick={() => setMode('one')}>
          One group, 4.2.1.2.1
        </button>
        <button type="button" aria-pressed={mode === 'two'} onClick={() => setMode('two')}>
          Two groups, 4.2.1.2.2
        </button>
      </span>

      <label className="field wide">
        <span className="field-label">
          {mode === 'two' ? 'Group 1 test results' : 'Test results'}
          <span className="hint">
            28 day cube strengths in N/mm², separated by spaces or commas.
          </span>
        </span>
        <span className="control">
          <textarea
            value={g1}
            rows={3}
            onChange={(e) => setG1(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'none',
              font: 'inherit',
              fontFamily: 'var(--mono)',
              fontSize: '0.8125rem',
              padding: '0.45rem 0.5rem',
              resize: 'vertical',
            }}
            placeholder="47.5 49.0 51.2 48.8 …"
          />
        </span>
      </label>

      {mode === 'two' && (
        <label className="field wide">
          <span className="field-label">Group 2 test results</span>
          <span className="control">
            <textarea
              value={g2}
              rows={3}
              onChange={(e) => setG2(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'none',
                font: 'inherit',
                fontFamily: 'var(--mono)',
                fontSize: '0.8125rem',
                padding: '0.45rem 0.5rem',
                resize: 'vertical',
              }}
            />
          </span>
        </label>
      )}

      {mode === 'one' && one && (
        <div className="calcline">
          <span className="cl">
            n = {one.n}, mean = {num(one.mean, 2)} N/mm²
            <span className="ce">S = √[ Σ(Xi − X̄)² / (n − 1) ]</span>
          </span>
          <span className="cv">
            {num(one.S, 3)}
            <em>N/mm²</em>
          </span>
        </div>
      )}

      {mode === 'two' && two && (
        <div className="calcline">
          <span className="cl">
            n₁ = {two.g1.n}, s₁ = {num(two.g1.S, 3)}; n₂ = {two.g2.n}, s₂ = {num(two.g2.S, 3)}
            <span className="ce">S = √[ ((n₁−1)s₁² + (n₂−1)s₂²) / (n₁+n₂−2) ]</span>
          </span>
          <span className="cv">
            {num(two.S, 3)}
            <em>N/mm²</em>
          </span>
        </div>
      )}

      {(shortOne || shortTwo) && (
        <Callout kind="warn" title="Not yet an acceptable record">
          {shortOne
            ? `Clause 4.2.1.1 (a) requires not less than 30 test results. ${one.n} entered.`
            : `Clause 4.2.1.2.2 requires each group to hold at least 10 results and the two together at least 30. Entered: ${two.g1.n} and ${two.g2.n}.`}{' '}
          Until that record exists, the assumed value of Table 2 applies.
        </Callout>
      )}

      {S && (
        <div className="btnrow" style={{ marginTop: '0.6rem' }}>
          <button className="btn" type="button" onClick={() => onAdopt(Number(S.toFixed(2)))}>
            Use S = {trim(S, 2)} in the design
          </button>
        </div>
      )}
    </div>
  );
}
