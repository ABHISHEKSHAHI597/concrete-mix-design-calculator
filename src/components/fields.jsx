/** Form primitives, shaped like the ruled lines of a lab worksheet. */
import React from 'react';

export function Field({ label, hint, cite, children, wide }) {
  return (
    <label className={`field${wide ? ' wide' : ''}`}>
      <span className="field-label">
        {label}
        {cite && (
          <>
            {' '}
            <span className="ref">{cite}</span>
          </>
        )}
        {hint && <span className="hint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function NumberInput({ value, onChange, unit, step = 'any', min, max, disabled }) {
  return (
    <span className={`control${disabled ? ' locked' : ''}`}>
      <input
        type="number"
        value={value ?? ''}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) =>
          onChange(e.target.value === '' ? '' : Number(e.target.value))
        }
      />
      {unit && <span className="unit">{unit}</span>}
    </span>
  );
}

export function Select({ value, onChange, options, unit }) {
  return (
    <span className="control">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {unit && <span className="unit">{unit}</span>}
    </span>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <span className="segmented" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={String(value) === String(o.value)}
          onClick={() => onChange(o.value)}
          title={o.title}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <span className="check-row">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </span>
  );
}

export function Section({ clause, title, children, note, open, onToggle }) {
  return (
    <section className="wsec">
      <button className="wsec-head" onClick={onToggle} aria-expanded={open}>
        <span className="clause">{clause}</span>
        <span className="wsec-title">{title}</span>
        <span className="wsec-caret">{open ? '—' : '+'}</span>
      </button>
      {open && (
        <div className="wsec-body">
          <div className="rail">
            {note && <p className="sec-note">{note}</p>}
            <div className="fields">{children}</div>
          </div>
        </div>
      )}
    </section>
  );
}

export function Callout({ kind = 'info', title, children }) {
  return (
    <div className={`callout ${kind}`}>
      {title && <h4>{title}</h4>}
      <div>{children}</div>
    </div>
  );
}
