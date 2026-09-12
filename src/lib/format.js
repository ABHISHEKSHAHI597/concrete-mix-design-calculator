/** Number formatting for the readouts and tables. */

export function num(v, dp = 2) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

/** Trims trailing zeros: 0.6480 reads as 0.648, 412.00 as 412. */
export function trim(v, dp = 4) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  const s = n.toFixed(dp);
  return s.replace(/\.?0+$/, '') || '0';
}

export const kg = (v) => num(v, 0);

export function today() {
  return new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
