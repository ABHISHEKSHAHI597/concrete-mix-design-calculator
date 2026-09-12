import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { designMix, defaultInput } from './lib/mixDesign.js';
import { designSCC } from './lib/sccDesign.js';
import { initialGradingState } from './lib/grading.js';
import { saveDesign } from './lib/storage.js';
import Worksheet from './components/Worksheet.jsx';
import Instrument from './components/Instrument.jsx';
import CalculationSheet from './components/CalculationSheet.jsx';
import Proportions from './components/Proportions.jsx';
import BatchPanel from './components/BatchPanel.jsx';
import TrialMixes from './components/TrialMixes.jsx';
import GradingBlend from './components/GradingBlend.jsx';
import Verification from './components/Verification.jsx';
import Methodology from './components/Methodology.jsx';
import SavedDesigns from './components/SavedDesigns.jsx';
import ReportHeader from './components/ReportHeader.jsx';
import ChecksTable from './components/ChecksTable.jsx';
import { Callout } from './components/fields.jsx';
import { trim } from './lib/format.js';

const VIEWS = [
  { id: 'design', label: 'Mix design' },
  { id: 'verify', label: 'Verification' },
  { id: 'method', label: 'Methodology' },
  { id: 'saved', label: 'Saved designs' },
];

const SECTIONS = [
  { id: 'ordinary', num: 'Section 2', name: 'M 10 to M 60', clause: '5' },
  { id: 'highStrength', num: 'Section 3', name: 'High strength', clause: '6' },
  { id: 'scc', num: 'Section 4', name: 'Self compacting', clause: '8' },
  { id: 'mass', num: 'Section 5', name: 'Mass concrete', clause: '9' },
];

const OUTPUTS = [
  { id: 'proportions', label: 'Mix proportions' },
  { id: 'calc', label: 'Calculation sheet' },
  { id: 'grading', label: 'Aggregate grading' },
  { id: 'batch', label: 'Batch quantities' },
  { id: 'trials', label: 'Trial mixes' },
];

const TRIAL_CLAUSE = { ordinary: '5.8', highStrength: '6.2.9', scc: '8.2', mass: '9.11' };

export default function App() {
  const [input, setInput] = useState(() => defaultInput('ordinary'));
  const [view, setView] = useState('design');
  const [output, setOutput] = useState('proportions');
  const [savedTick, setSavedTick] = useState(0);
  const [flash, setFlash] = useState(null);
  const [grading, setGrading] = useState(() => initialGradingState(20, 'ordinary'));

  const set = useCallback((patch) => setInput((prev) => ({ ...prev, ...patch })), []);

  const result = useMemo(
    () =>
      input.section === 'scc'
        ? designSCC({ ...defaultInput('scc'), ...input })
        : designMix(input),
    [input]
  );

  /* The grading panel follows the aggregate size and the section. */
  useEffect(() => {
    const key = `${input.section}-${Number(input.msa)}`;
    if (grading.key !== key) setGrading(initialGradingState(input.msa, input.section));
  }, [input.section, input.msa]);

  const section = SECTIONS.find((s) => s.id === input.section) ?? SECTIONS[0];

  const switchSection = (id) => {
    if (id === input.section) return;
    setInput(defaultInput(id));
  };

  const onSave = () => {
    const name =
      window.prompt(
        'Name for this design',
        input.project || `M ${input.fck}, ${section.name} · ${new Date().toLocaleDateString('en-IN')}`
      ) ?? null;
    if (name === null) return;
    saveDesign(name, input, {
      wc: result.usesMineral ? result.wcm : result.wc,
      wcLabel: result.usesMineral ? 'w/cm' : 'w/c',
      cementitious: result.cementitious,
      ratio: result.ratio.label,
      target: result.targetStrength,
    });
    setSavedTick((t) => t + 1);
    setFlash(`Saved as “${name}”.`);
    window.setTimeout(() => setFlash(null), 4000);
  };

  const loadInput = (next) => {
    setInput({ ...defaultInput(next.section || 'ordinary'), ...next });
    setView('design');
    window.scrollTo({ top: 0 });
  };

  const panel = (id, node) => <div style={output === id ? undefined : { display: 'none' }}>{node}</div>;

  return (
    <>
      <header className="masthead no-print">
        <div className="shell">
          <div className="masthead-inner">
            <div>
              <span className="standard-mark">IS 10262 : 2019 · Second revision</span>
              <h1>Concrete mix proportioning</h1>
              <p className="sub">A calculator that shows its working, clause by clause</p>
            </div>
            <div>
              <span className="section-switch" role="group" aria-label="Part of the standard">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={input.section === s.id}
                    onClick={() => switchSection(s.id)}
                  >
                    <span className="sw-num">{s.num}</span>
                    <span className="sw-name">{s.name}</span>
                  </button>
                ))}
              </span>
            </div>
          </div>
          <nav className="nav" aria-label="Sections of this calculator">
            {VIEWS.map((v) => (
              <button key={v.id} onClick={() => setView(v.id)} aria-current={view === v.id ? 'page' : undefined}>
                {v.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="shell" style={{ paddingBottom: '1rem' }}>
        <ReportHeader result={result} />

        {flash && (
          <div className="no-print" style={{ paddingTop: '1rem' }}>
            <Callout kind="ok">{flash}</Callout>
          </div>
        )}

        {view === 'design' && (
          <>
            <div className="work">
              <Worksheet input={input} set={set} result={result} />
              <Instrument result={result} onSave={onSave} />
            </div>

            <div className="outputs">
              <div className="otabs no-print">
                {OUTPUTS.map((o) => (
                  <button key={o.id} type="button" aria-pressed={output === o.id} onClick={() => setOutput(o.id)}>
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="opanel">
                {panel('proportions', <Proportions result={result} />)}
                {panel('calc', <CalculationSheet result={result} />)}
                {panel('grading', <GradingBlend result={result} state={grading} setState={setGrading} />)}
                {panel('batch', <BatchPanel result={result} />)}
                {panel('trials', <TrialMixes result={result} />)}
              </div>
            </div>

            {/* The printed report, assembled in report order. The
                worksheet and the on screen output panel do not print. */}
            <div className="print-only">
              <h2 className="report-h2">Calculation sheet</h2>
              <CalculationSheet result={result} />

              <div className="page-break" />
              <h2 className="report-h2">Mix proportions</h2>
              <Proportions result={result} />

              <div style={{ marginTop: '14pt' }}>
                <ChecksTable result={result} />
              </div>

              <div className="page-break" />
              <h2 className="report-h2">Combined grading of coarse aggregate</h2>
              <GradingBlend result={result} state={grading} setState={setGrading} readOnly />

              <div style={{ marginTop: '14pt' }}>
                <TrialMixes result={result} />
              </div>

              <p className="report-foot">
                Proportioned to IS 10262 : 2019, {section.num}. Durability limits from IS 456 : 2000,
                Tables 3, 5 and 6. Aggregate grading to{' '}
                {input.section === 'mass' && Number(input.msa) > 40 ? 'IS 10262, Table 14' : 'IS 383 : 2016'}. These
                proportions are the starting point for the trial batches required by clause{' '}
                {TRIAL_CLAUSE[input.section]} and are not a substitute for them.
              </p>
            </div>
          </>
        )}

        {view === 'verify' && <Verification onLoadCase={loadInput} />}
        {view === 'method' && <Methodology />}
        {view === 'saved' && (
          <div className="page">
            <div className="prose" style={{ maxWidth: '76ch', marginBottom: '1.5rem' }}>
              <h2>Saved designs</h2>
              <p className="lede">
                Designs are held in this browser's local storage. Nothing is sent anywhere, and clearing
                the browser's site data will clear them, so export anything you need to keep.
              </p>
            </div>
            <SavedDesigns
              onLoad={(d) => loadInput(d.input)}
              refreshKey={savedTick}
              onChanged={() => setSavedTick((t) => t + 1)}
            />
          </div>
        )}
      </main>

      <footer className="foot shell no-print">
        <p>
          Built on the procedure of IS 10262 : 2019, <em>Concrete mix proportioning — Guidelines</em>{' '}
          (second revision), with durability limits from IS 456 : 2000 and aggregate grading from IS 383
          : 2016. Sections 2 to 5 of the standard are implemented: ordinary and standard grades, high
          strength grades, self compacting concrete and mass concrete, with the combination of coarse
          aggregate fractions of clause 5.6.
        </p>
        <p>
          The calculated proportions are a starting point for the trial batches the standard requires,
          not a substitute for them. Current design, {section.num.toLowerCase()}:{' '}
          {result.usesMineral ? 'w/cm' : 'w/c'} {trim(result.usesMineral ? result.wcm : result.wc, 3)},
          cementitious {result.cementitious} kg/m³, {result.ratio.label}.
        </p>
      </footer>
    </>
  );
}
