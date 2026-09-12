/**
 * Combination of different coarse aggregate fractions   (clause 5.6)
 *
 * Clause 5.6: the coarse aggregate shall conform to IS 383. Coarse
 * aggregates of different sizes may be combined in suitable proportions
 * so as to result in an overall grading conforming to Table 7 of IS 383
 * for the particular nominal maximum size of aggregate. For mass
 * concrete, clause 9.9 sends 80 mm and 150 mm aggregate to Table 14 of
 * IS 10262 instead.
 *
 * Every worked example in the standard carries this step: Annex A and
 * Annex B reach 60:40 on two fractions, Annex D and Annex E reach 50:50,
 * and Annex F reaches 35:30:15:10:10 on five fractions.
 *
 * The combined percentage passing at a sieve is the weighted mean of the
 * percentages passing of the individual fractions:
 *
 *     combined(s) = Σ  passing_i(s) × proportion_i / 100
 */

const r = (v, dp = 2) => {
  const f = 10 ** dp;
  return Math.round((v + Number.EPSILON) * f) / f;
};

/** Sieve sizes used by the standard's coarse aggregate tables, coarse first. */
export const SIEVE_SET = [150, 80, 63, 40, 20, 16, 12.5, 10, 4.75, 2.36];

/**
 * Combine fractions at the given proportions.
 * @param fractions [{ name, passing: { [sieve]: percent } }]
 * @param proportions number[] percentages, summing to 100
 * @param sieves number[] sieve sizes to report
 */
export function combineGrading(fractions, proportions, sieves) {
  return sieves.map((sieve) => {
    const contributions = fractions.map((f, k) => {
      const p = f.passing?.[sieve];
      const pass = p === '' || p === null || p === undefined ? null : Number(p);
      const prop = Number(proportions[k]) || 0;
      return pass === null ? null : r((pass * prop) / 100, 2);
    });
    const known = contributions.filter((c) => c !== null);
    const combined = known.length ? r(known.reduce((a, b) => a + b, 0), 2) : null;
    return { sieve, contributions, combined };
  });
}

/** How far a combined grading sits outside the limits, and where. */
export function gradingCompliance(rows, limits) {
  const byS = new Map(limits.map((l) => [l.sieve, l]));
  const results = rows.map((row) => {
    const lim = byS.get(row.sieve);
    if (!lim || row.combined === null) return { ...row, limit: lim ?? null, status: 'none', off: 0 };
    const off =
      row.combined < lim.min ? lim.min - row.combined : row.combined > lim.max ? row.combined - lim.max : 0;
    return { ...row, limit: lim, status: off === 0 ? 'in' : 'out', off: r(off, 2) };
  });
  const checked = results.filter((x) => x.status !== 'none');
  return {
    rows: results,
    conforms: checked.length > 0 && checked.every((x) => x.status === 'in'),
    checkedCount: checked.length,
    worst: checked.reduce((a, b) => (b.off > (a?.off ?? -1) ? b : a), null),
  };
}

/** Penalty for a candidate blend: distance outside the limits, plus a
 *  gentle pull toward the middle of each band to break ties. */
function penalty(fractions, proportions, limits, sieves) {
  const rows = combineGrading(fractions, proportions, sieves);
  const byS = new Map(limits.map((l) => [l.sieve, l]));
  let outside = 0;
  let centring = 0;
  for (const row of rows) {
    const lim = byS.get(row.sieve);
    if (!lim || row.combined === null) continue;
    if (row.combined < lim.min) outside += (lim.min - row.combined) ** 2;
    else if (row.combined > lim.max) outside += (row.combined - lim.max) ** 2;
    const mid = (lim.min + lim.max) / 2;
    const half = Math.max((lim.max - lim.min) / 2, 1);
    centring += ((row.combined - mid) / half) ** 2;
  }
  return outside * 1000 + centring;
}

/**
 * Search for proportions that bring the combined grading inside the
 * limits. Coordinate descent on the simplex from several starts, with a
 * decreasing step, which is ample for the two to five fractions the
 * standard's examples use.
 *
 * @returns { proportions, penalty, conforms }
 */
export function solveBlend(fractions, limits, options = {}) {
  const n = fractions.length;
  const sieves = options.sieves ?? limits.map((l) => l.sieve);
  if (n === 0) return { proportions: [], penalty: Infinity, conforms: false };
  if (n === 1) {
    const p = [100];
    const c = gradingCompliance(combineGrading(fractions, p, sieves), limits);
    return { proportions: p, penalty: penalty(fractions, p, limits, sieves), conforms: c.conforms };
  }

  const starts = [Array.from({ length: n }, () => 100 / n)];
  for (let k = 0; k < n; k += 1) {
    const s = Array.from({ length: n }, () => 20 / Math.max(n - 1, 1));
    s[k] = 80;
    const total = s.reduce((a, b) => a + b, 0);
    starts.push(s.map((v) => (v * 100) / total));
  }

  let best = null;

  for (const start of starts) {
    let cur = start.slice();
    let curP = penalty(fractions, cur, limits, sieves);

    for (const stepSize of [10, 5, 2, 1]) {
      let improved = true;
      let guard = 0;
      while (improved && guard < 400) {
        improved = false;
        guard += 1;
        for (let a = 0; a < n; a += 1) {
          for (let b = 0; b < n; b += 1) {
            if (a === b) continue;
            const move = Math.min(stepSize, cur[a]);
            if (move <= 0) continue;
            const trial = cur.slice();
            trial[a] -= move;
            trial[b] += move;
            const tp = penalty(fractions, trial, limits, sieves);
            if (tp < curP - 1e-9) {
              cur = trial;
              curP = tp;
              improved = true;
            }
          }
        }
      }
    }

    if (!best || curP < best.penalty) best = { proportions: cur, penalty: curP };
  }

  const proportions = best.proportions.map((v) => r(v, 0));
  /* Rounding to whole percent must still total 100. */
  const drift = 100 - proportions.reduce((a, b) => a + b, 0);
  if (drift !== 0) {
    const idx = proportions.indexOf(Math.max(...proportions));
    proportions[idx] = r(proportions[idx] + drift, 0);
  }
  const compliance = gradingCompliance(combineGrading(fractions, proportions, sieves), limits);
  return { proportions, penalty: best.penalty, conforms: compliance.conforms };
}

/** Fraction templates, prefilled with the sieve analyses printed in the
 *  annexes so the calculator opens on a worked case. */
export const FRACTION_PRESETS = {
  20: {
    sieves: [40, 20, 10, 4.75, 2.36],
    fractions: [
      { name: '20 – 10 mm', passing: { 40: 100, 20: 100, 10: 0, 4.75: 0, 2.36: 0 } },
      { name: '10 – 4.75 mm', passing: { 40: 100, 20: 100, 10: 71.2, 4.75: 9.4, 2.36: 0 } },
    ],
    note: 'Sieve analysis as printed in Annex A-2 (g), which combines to 60:40.',
  },
  40: {
    sieves: [80, 40, 20, 10, 4.75],
    fractions: [
      { name: '40 – 20 mm', passing: { 80: 100, 40: 98, 20: 5, 10: 0, 4.75: 0 } },
      { name: '20 – 10 mm', passing: { 80: 100, 40: 100, 20: 98, 10: 4, 4.75: 0 } },
      { name: '10 – 4.75 mm', passing: { 80: 100, 40: 100, 20: 100, 10: 75, 4.75: 8 } },
    ],
    note: 'Typical single sized fractions. Replace with the sieve analysis of your own aggregate.',
  },
  12.5: {
    sieves: [20, 12.5, 10, 4.75],
    fractions: [
      { name: '12.5 – 10 mm', passing: { 20: 100, 12.5: 95, 10: 10, 4.75: 0 } },
      { name: '10 – 4.75 mm', passing: { 20: 100, 12.5: 100, 10: 78, 4.75: 9 } },
    ],
    note: 'Typical single sized fractions. Replace with the sieve analysis of your own aggregate.',
  },
  10: {
    sieves: [12.5, 10, 4.75, 2.36],
    fractions: [
      { name: '10 – 4.75 mm', passing: { 12.5: 100, 10: 92, 4.75: 10, 2.36: 1 } },
      { name: '4.75 mm and down', passing: { 12.5: 100, 10: 100, 4.75: 96, 2.36: 20 } },
    ],
    note: 'Typical single sized fractions. Replace with the sieve analysis of your own aggregate.',
  },
  80: {
    sieves: [150, 80, 40, 20, 10, 4.75],
    fractions: [
      { name: '80 – 40 mm', passing: { 150: 100, 80: 100, 40: 8, 20: 0, 10: 0, 4.75: 0 } },
      { name: '40 – 20 mm', passing: { 150: 100, 80: 100, 40: 90, 20: 4, 10: 0, 4.75: 0 } },
      { name: '20 – 10 mm', passing: { 150: 100, 80: 100, 40: 100, 20: 97, 10: 10, 4.75: 2 } },
      { name: '10 – 4.75 mm', passing: { 150: 100, 80: 100, 40: 100, 20: 100, 10: 78, 4.75: 10 } },
    ],
    note: 'Fractions II to V of Annex F-2 (h), with the 80 – 40 mm fraction screened to pass the 80 mm sieve entirely, as Table 14 requires for 80 mm aggregate. Replace with the sieve analysis of your own aggregate.',
  },
  150: {
    sieves: [150, 80, 40, 20, 10, 4.75],
    fractions: [
      { name: '150 – 80 mm', passing: { 150: 100, 80: 0, 40: 0, 20: 0, 10: 0, 4.75: 0 } },
      { name: '80 – 40 mm', passing: { 150: 100, 80: 92, 40: 5, 20: 0, 10: 0, 4.75: 0 } },
      { name: '40 – 20 mm', passing: { 150: 100, 80: 100, 40: 90, 20: 4, 10: 0, 4.75: 0 } },
      { name: '20 – 10 mm', passing: { 150: 100, 80: 100, 40: 100, 20: 97, 10: 10, 4.75: 2 } },
      { name: '10 – 4.75 mm', passing: { 150: 100, 80: 100, 40: 100, 20: 100, 10: 78, 4.75: 10 } },
    ],
    note: 'Sieve analysis as printed in Annex F-2 (h), which combines to 35:30:15:10:10.',
  },
};

/* ------------------------------------------------------------------ *
 * Initial state for the grading panel
 * ------------------------------------------------------------------ */

import { gradingLimitsFor } from './tables.js';

/* The blends the worked examples arrive at, used to open the panel on
 * the standard's own case where its sieve analysis is the preset. */
const ANNEX_BLEND = { 20: [60, 40], 150: [35, 30, 15, 10, 10] };

export function initialGradingState(msa, section) {
  const key = Number(msa);
  const preset = FRACTION_PRESETS[key] ?? FRACTION_PRESETS[20];
  const lim = gradingLimitsFor(key, section);
  const limits = lim ? lim.rows.map((x) => ({ ...x })) : [];
  const fractions = preset.fractions.map((f) => ({ name: f.name, passing: { ...f.passing } }));
  const sieves = Array.from(new Set([...preset.sieves, ...limits.map((l) => l.sieve)])).sort(
    (a, b) => b - a
  );

  let proportions = ANNEX_BLEND[key];
  if (!proportions || proportions.length !== fractions.length) {
    proportions = limits.length
      ? solveBlend(fractions, limits, { sieves }).proportions
      : fractions.map(() => Math.round(100 / fractions.length));
  }

  return {
    key: `${section}-${key}`,
    fractions,
    proportions: [...proportions],
    limits,
    sieves,
    note: preset.note,
    source: lim?.source ?? null,
  };
}
