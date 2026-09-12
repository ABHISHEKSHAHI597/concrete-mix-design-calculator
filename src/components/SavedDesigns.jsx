/** Designs kept in this browser. */
import React, { useState } from 'react';
import { listDesigns, deleteDesign, exportDesigns, importDesigns } from '../lib/storage.js';
import { num, trim } from '../lib/format.js';
import { Callout } from './fields.jsx';

export default function SavedDesigns({ onLoad, refreshKey, onChanged }) {
  const [message, setMessage] = useState(null);
  const designs = listDesigns();

  const doExport = () => {
    const blob = new Blob([exportDesigns()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'is10262-designs.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const added = importDesigns(String(reader.result));
        setMessage({ kind: 'ok', text: `${added} design${added === 1 ? '' : 's'} added.` });
        onChanged();
      } catch {
        setMessage({ kind: 'err', text: 'That file could not be read as a saved design list.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div>
      {message && <Callout kind={message.kind}>{message.text}</Callout>}

      {designs.length === 0 ? (
        <p className="empty">
          No designs saved yet. Work through the worksheet and use Save this design; it is kept in
          this browser only, and never sent anywhere.
        </p>
      ) : (
        <div>
          {designs.map((d) => (
            <div className="saved-item" key={d.id}>
              <div>
                <div className="si-t">{d.name}</div>
                <div className="si-m">
                  M {d.input.fck} · {d.summary?.wcLabel ?? 'w/c'}{' '}
                  {trim(d.summary?.wc ?? 0, 3)} · cementitious {num(d.summary?.cementitious ?? 0, 0)}{' '}
                  kg/m³ · {d.summary?.ratio ?? ''} ·{' '}
                  {new Date(d.savedAt).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="btnrow">
                <button className="btn ghost" type="button" onClick={() => onLoad(d)}>
                  Open
                </button>
                <button
                  className="btn danger"
                  type="button"
                  onClick={() => {
                    deleteDesign(d.id);
                    onChanged();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="btnrow" style={{ marginTop: '1.5rem' }}>
        <button className="btn ghost" type="button" onClick={doExport} disabled={designs.length === 0}>
          Export all as JSON
        </button>
        <label className="btn ghost" style={{ cursor: 'pointer' }}>
          Import from JSON
          <input type="file" accept="application/json" onChange={doImport} style={{ display: 'none' }} />
        </label>
      </div>
    </div>
  );
}
