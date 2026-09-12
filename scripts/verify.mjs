#!/usr/bin/env node
/**
 * Runs the four illustrative examples of IS 10262 : 2019 through the
 * mix design engine and prints the comparison against the values the
 * standard itself publishes.
 *
 *   npm run verify
 *
 * Exits non-zero if any check falls outside tolerance.
 */

import { runAllVerification } from '../src/lib/verification.js';

const fmt = (v) =>
  typeof v === 'number' ? String(Math.round(v * 10000) / 10000) : String(v);

const cases = runAllVerification();
let failures = 0;
let exact = 0;
let total = 0;

for (const c of cases) {
  console.log(`\n${'='.repeat(96)}`);
  console.log(`${c.title}   (${c.clause})`);
  console.log(
    `  ${c.exact}/${c.total} exact, ${c.passed}/${c.total} within tolerance` +
      `   [cementitious rounded ${c.input.roundCementitious}, aggregate volume to ${c.input.aggVolDp} dp]`
  );
  console.log('-'.repeat(96));
  console.log(
    'St'.padEnd(6) +
      'Clause'.padEnd(10) +
      'Quantity'.padEnd(48) +
      'Standard'.padStart(11) +
      'Calculated'.padStart(12) +
      'Δ'.padStart(9)
  );
  for (const r of c.rows) {
    total += 1;
    if (r.exact) exact += 1;
    if (!r.pass) failures += 1;
    const mark = r.exact ? 'exact' : r.pass ? 'ok' : 'FAIL';
    console.log(
      mark.padEnd(6) +
        r.ref.padEnd(10) +
        r.label.slice(0, 46).padEnd(48) +
        fmt(r.std).padStart(11) +
        fmt(r.calc).padStart(12) +
        (r.exact ? '0' : fmt(r.delta)).padStart(9)
    );
  }
  if (c.result.warnings.length) {
    console.log(`\n  Notes carried into the trials:`);
    c.result.warnings.forEach((w) => console.log(`    - ${w}`));
  }
}

console.log(`\n${'='.repeat(96)}`);
console.log(
  `${total - failures}/${total} checks agree with the standard; ${exact}/${total} reproduce the printed figure exactly.`
);
if (failures) {
  console.error(`\n${failures} check(s) outside tolerance.`);
  process.exit(1);
}
console.log('Verification passed.\n');
