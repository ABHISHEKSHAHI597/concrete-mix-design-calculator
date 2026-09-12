/** Durability and limit checks, as a table for the printed report. */
import React from 'react';

export default function ChecksTable({ result }) {
  return (
    <div className="tbl-wrap">
      <table className="data">
        <caption>Durability and limit checks</caption>
        <thead>
          <tr>
            <th>Check</th>
            <th>Provision</th>
            <th>Result</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          {result.checks.map((c) => (
            <tr key={c.id}>
              <td>{c.label}</td>
              <td className="ref">{c.ref}</td>
              <td className="ref">{c.detail}</td>
              <td style={{ color: c.pass ? 'var(--ok)' : c.warnOnly ? 'var(--warn)' : 'var(--flag)' }}>
                {c.pass ? 'Satisfied' : c.warnOnly ? 'Needs special consideration' : 'Not satisfied'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.checks.some((c) => !c.pass && c.failNote) && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--ink-2)', marginTop: '0.6rem', maxWidth: '68ch' }}>
          {result.checks.find((c) => !c.pass && c.failNote).failNote}
        </p>
      )}
    </div>
  );
}
