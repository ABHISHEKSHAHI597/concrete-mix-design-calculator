/**
 * The input worksheet. Sections follow the order of the standard and
 * carry the clause number they come from in the margin rail. The fields
 * shown depend on which part of the standard is in force.
 */
import React, { useState, useEffect } from 'react';
import {
  ORDINARY_GRADES,
  HIGH_STRENGTH_GRADES,
  MSA_ORDINARY,
  MSA_HIGH_STRENGTH,
  MSA_MASS,
  CEMENT_TYPES,
  CHEMICAL_ADMIXTURES,
  TABLE_9_MINERAL_DOSAGE,
  FA_ZONES,
  FA_TYPES,
  PLACING_METHODS,
  CA_SHAPE_WATER_ADJ,
  AGGREGATE_CONDITIONS,
  IS456_TABLE_3_EXPOSURE,
  MASS_TARGET_UPLIFT,
  MASS_AIR_ENTRAINED,
  SCC_SLUMP_FLOW,
  SCC_VISCOSITY,
  SCC_SEGREGATION,
  SCC_RANGES,
  SCC_LBOX_MIN_RATIO,
  assumedSD,
  valueOfX,
} from '../lib/tables.js';
import { Field, NumberInput, Select, Segmented, Toggle, Section, Callout } from './fields.jsx';
import SDCalculator from './SDCalculator.jsx';
import Fig1Plot from './Fig1Plot.jsx';
import { trim } from '../lib/format.js';

const opts = (obj) => Object.entries(obj).map(([value, v]) => ({ value, label: v.label }));

export default function Worksheet({ input, set, result }) {
  const high = input.section === 'highStrength';
  const mass = input.section === 'mass';
  const scc = input.section === 'scc';

  const [open, setOpen] = useState({
    data: true,
    scc: true,
    target: true,
    materials: false,
    admix: false,
    assume: false,
  });
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const grades = high ? HIGH_STRENGTH_GRADES : ORDINARY_GRADES;
  const sizes = high ? MSA_HIGH_STRENGTH : mass ? MSA_MASS : MSA_ORDINARY;
  const mineral = TABLE_9_MINERAL_DOSAGE[input.mineralType];
  const second = TABLE_9_MINERAL_DOSAGE[input.secondMineralType];
  const chem = CHEMICAL_ADMIXTURES[input.chemType];
  const airTableNo = high ? 6 : mass ? 11 : 3;
  const caTableNo = high ? 10 : mass ? 13 : 5;

  /* Keep the nominal maximum size legal for the section in force */
  useEffect(() => {
    if (!sizes.includes(Number(input.msa))) set({ msa: mass ? 150 : 20 });
  }, [input.msa, input.section]);

  return (
    <div className="worksheet">
      {/* ---------------------------------------------------------- */}
      <Section
        clause={mass ? '4.1, 9.1' : '4.1'}
        title="Data for mix proportioning"
        open={open.data}
        onToggle={() => toggle('data')}
        note={
          mass
            ? 'Mass concrete is used for dams and other massive structures, generally at lower grades with large aggregate. Exposure condition fixes the durability limits that every result is later checked against.'
            : scc
            ? 'Self compacting concrete is specified by its fresh properties as well as its grade. Exposure condition fixes the durability limits that every result is later checked against.'
            : 'The standard asks for this data before any calculation begins. Exposure condition fixes the durability limits that every result is later checked against.'
        }
      >
        <Field label="Project or structure" hint="Appears on the printed report.">
          <span className="control">
            <input
              type="text"
              value={input.project}
              onChange={(e) => set({ project: e.target.value })}
              style={{ textAlign: 'left', fontFamily: 'var(--sans)' }}
              placeholder="Optional"
            />
          </span>
        </Field>

        <Field label="Grade designation" cite="(a)">
          <Select
            value={String(input.fck)}
            onChange={(v) => set({ fck: Number(v) })}
            options={grades.map((g) => ({ value: String(g), label: `M ${g}` }))}
          />
        </Field>

        <Field label="Type and grade of cement" cite="(b)">
          <Select
            value={input.cementType}
            onChange={(v) => set({ cementType: v, cementSG: CEMENT_TYPES[v].sg })}
            options={Object.entries(CEMENT_TYPES).map(([value, v]) => ({ value, label: v.label }))}
          />
        </Field>

        <Field
          label="28 day compressive strength of the cement"
          hint={
            high
              ? 'Table 8, Note: the tabulated w/cm are for a cement strength of 53 MPa and above. For cement of other strength, the w/cm is to be reduced by a suitable adjustment established by trial.'
              : input.cementStrengthKnown
              ? `Figure 1 curve chosen from this actual strength: Curve ${result.curve}.`
              : 'Not known. Figure 1 Notes 1 and 2 choose the curve from the cement type.'
          }
        >
          <span style={{ display: 'grid', gap: '0.35rem' }}>
            <Toggle
              checked={input.cementStrengthKnown}
              onChange={(v) => set({ cementStrengthKnown: v })}
              label="Actual strength known"
            />
            {input.cementStrengthKnown && (
              <NumberInput
                value={input.cementStrength}
                onChange={(v) => set({ cementStrength: v })}
                unit="N/mm²"
                step="0.5"
              />
            )}
          </span>
        </Field>

        <Field
          label="Maximum nominal size of aggregate"
          cite="(c)"
          hint={
            mass && MASS_TARGET_UPLIFT[input.msa]
              ? `Clause 9.2 raises the cube target by ${MASS_TARGET_UPLIFT[input.msa]} percent for this size.`
              : undefined
          }
        >
          <Segmented
            value={String(input.msa)}
            onChange={(v) => set({ msa: Number(v) })}
            options={sizes.map((s) => ({ value: String(s), label: `${s} mm` }))}
          />
        </Field>

        <Field label="Concrete" hint="Selects the relevant half of IS 456, Table 5.">
          <Segmented
            value={input.concreteType}
            onChange={(v) => set({ concreteType: v })}
            options={[
              { value: 'reinforced', label: 'Reinforced' },
              { value: 'plain', label: 'Plain' },
            ]}
          />
        </Field>

        <Field
          label="Exposure condition"
          cite="(d) · IS 456, Table 3"
          hint={IS456_TABLE_3_EXPOSURE[input.exposure].description}
        >
          <Select
            value={input.exposure}
            onChange={(v) => set({ exposure: v })}
            options={opts(IS456_TABLE_3_EXPOSURE)}
          />
        </Field>

        {!scc && (
          <Field label="Workability required at placing" cite="(e)">
            <NumberInput value={input.slump} onChange={(v) => set({ slump: v })} unit="mm slump" step="5" min={0} />
          </Field>
        )}

        {!scc && !mass && (
          <Field label="Method of placing" cite="(g)">
            <Select
              value={input.placing}
              onChange={(v) =>
                set({
                  placing: v,
                  pumpableReduction: PLACING_METHODS[v].caReduction
                    ? Math.min(PLACING_METHODS[v].caReduction, high ? 5 : 10)
                    : 0,
                })
              }
              options={opts(PLACING_METHODS)}
            />
          </Field>
        )}

        <Field
          label="Type of coarse aggregate"
          cite="(j)"
          hint={
            mass
              ? 'Clause 9.4 reduces the water for rounded gravel by an amount that depends on the aggregate size.'
              : scc
              ? 'Recorded with the stipulations; the water content of SCC is selected directly.'
              : undefined
          }
        >
          <Select value={input.caShape} onChange={(v) => set({ caShape: v })} options={opts(CA_SHAPE_WATER_ADJ)} />
        </Field>

        <Field label="Type of fine aggregate" cite="(k)">
          <Select value={input.faType} onChange={(v) => set({ faType: v })} options={opts(FA_TYPES)} />
        </Field>

        {!scc && (
          <Field label="Grading zone of fine aggregate" cite="IS 383, Table 9" hint={FA_ZONES[input.faZone].note}>
            <Segmented
              value={input.faZone}
              onChange={(v) => set({ faZone: v })}
              options={(high ? ['I', 'II', 'III'] : ['I', 'II', 'III', 'IV']).map((z) => ({ value: z, label: z }))}
            />
          </Field>
        )}

        {mass && (
          <Field
            label="Air entrained concrete"
            cite="9.1 (b), 9.3"
            hint={
              input.airEntrained
                ? `Clause 9.3 recommends ${
                    MASS_AIR_ENTRAINED[input.msa]
                      ? `${MASS_AIR_ENTRAINED[input.msa][0]} to ${MASS_AIR_ENTRAINED[input.msa][1]} percent air for ${input.msa} mm aggregate`
                      : 'an air content range to be stipulated'
                  }; enter it under Selections. Table 12 takes 8 kg off the water.`
                : 'Air entrainment improves durability under freezing and thawing, plasticity and workability, and reduces segregation and bleeding.'
            }
          >
            <Toggle checked={input.airEntrained} onChange={(v) => set({ airEntrained: v })} label="Air entrained" />
          </Field>
        )}

        <Field label="Maximum cement content, not including mineral admixture" cite="(m) · IS 456, 8.2.4.2">
          <NumberInput value={input.maxCement} onChange={(v) => set({ maxCement: v })} unit="kg/m³" step="10" />
        </Field>

        <Field label="Degree of site control" cite="(h) · Table 2, Note 1">
          <Segmented
            value={input.siteControl}
            onChange={(v) => set({ siteControl: v })}
            options={[
              { value: 'good', label: 'Good' },
              { value: 'fair', label: 'Fair, +1 N/mm²' },
            ]}
          />
        </Field>
      </Section>

      {/* ---------------------------------------------------------- */}
      {scc && (
        <Section
          clause="7.2, 8.3"
          title="Fresh properties, water and powder"
          open={open.scc}
          onToggle={() => toggle('scc')}
          note="The classes set what the fresh concrete must achieve. The water and powder contents are chosen within the typical ranges of clause 8.3 to reach those classes, then confirmed by trial."
        >
          <Field
            label="Slump flow class"
            cite="7.2.1"
            hint={SCC_SLUMP_FLOW[input.slumpFlowClass].use}
          >
            <Select
              value={input.slumpFlowClass}
              onChange={(v) => set({ slumpFlowClass: v })}
              options={Object.entries(SCC_SLUMP_FLOW).map(([value, c]) => ({
                value,
                label: `${c.label}, ${c.range[0]} to ${c.range[1]} mm`,
              }))}
            />
          </Field>
          <Field label="Viscosity class" cite="7.2.4" hint={SCC_VISCOSITY[input.viscosityClass].use}>
            <Select
              value={input.viscosityClass}
              onChange={(v) => set({ viscosityClass: v })}
              options={Object.entries(SCC_VISCOSITY).map(([value, c]) => ({
                value,
                label: `${c.label}, ${c.range[0] === 0 ? `up to ${c.range[1]}` : `${c.range[0]} to ${c.range[1]}`} s`,
              }))}
            />
          </Field>
          <Field label="Segregation resistance class" cite="7.2.3" hint={SCC_SEGREGATION[input.segregationClass].use}>
            <Select
              value={input.segregationClass}
              onChange={(v) => set({ segregationClass: v })}
              options={Object.entries(SCC_SEGREGATION).map(([value, c]) => ({
                value,
                label: `${c.label}, ${c.range[0] === 0 ? `under ${c.range[1]}` : `${c.range[0]} to ${c.range[1]}`} percent`,
              }))}
            />
          </Field>
          <Field
            label="Passing ability, L box ratio h2/h1"
            cite="7.2.2"
            hint={`At least ${SCC_LBOX_MIN_RATIO}. A mix flowing as freely as water would give 1.0.`}
          >
            <NumberInput value={input.lBoxRatio} onChange={(v) => set({ lBoxRatio: v })} step="0.05" min={0} max={1} />
          </Field>

          <Field
            label="Water content"
            cite="8.3 (b)"
            hint={`Typical range ${SCC_RANGES.water[0]} to ${SCC_RANGES.water[1]} kg/m³. It can be reduced further by raising the superplasticiser dose.`}
          >
            <NumberInput value={input.sccWater} onChange={(v) => set({ sccWater: v })} unit="kg/m³" step="5" />
          </Field>
          <Field
            label="Powder content, all material finer than 0.125 mm"
            cite="8.3 (a)"
            hint={`Preferred range ${SCC_RANGES.powder[0]} to ${SCC_RANGES.powder[1]} kg/m³. Low viscosity or high segregation resistance classes need a more cohesive mix and so more powder.`}
          >
            <NumberInput value={input.sccPowder} onChange={(v) => set({ sccPowder: v })} unit="kg/m³" step="10" />
          </Field>
          <Field
            label="Fine aggregate finer than 0.125 mm"
            hint="From the sieve analysis of the sand. It decides how much sand supplies the balance of the powder."
          >
            <NumberInput value={input.sccFaFinesPct} onChange={(v) => set({ sccFaFinesPct: v })} unit="%" step="0.5" />
          </Field>
        </Section>
      )}

      {/* ---------------------------------------------------------- */}
      <Section
        clause={mass ? '4.2, 9.2' : '4.2'}
        title="Target strength"
        open={open.target}
        onToggle={() => toggle('target')}
        note="The mix is proportioned for a target mean strength above the characteristic strength, so that not more than the specified proportion of results falls below it. The margin is the greater of 1.65 S and the factor X of Table 1."
      >
        <Field
          label="Standard deviation, S"
          cite="4.2.1"
          hint={
            input.sdMode === 'table'
              ? `Table 2 gives ${assumedSD(input.fck, 'good')} N/mm² for M ${input.fck} at good site control${
                  input.siteControl === 'fair' ? ', raised by 1 for fair control' : ''
                }.`
              : 'Calculated from test results, or entered directly.'
          }
        >
          <Segmented
            value={input.sdMode}
            onChange={(v) => set({ sdMode: v })}
            options={[
              { value: 'table', label: 'Table 2' },
              { value: 'manual', label: 'From results' },
            ]}
          />
        </Field>

        {input.sdMode === 'manual' && (
          <>
            <Field label="Standard deviation adopted">
              <NumberInput value={input.sdManual} onChange={(v) => set({ sdManual: v })} unit="N/mm²" step="0.1" />
            </Field>
            <div className="field wide">
              <SDCalculator onAdopt={(S) => set({ sdManual: S })} />
            </div>
          </>
        )}

        <div className="field wide" style={{ paddingTop: '0.75rem' }}>
          <Callout kind="info" title={`Target mean strength f'ck = ${trim(result.targetStrength, 2)} N/mm²`}>
            fck + 1.65 S = {trim(result.targetStrengthParts.byS, 2)} and fck + X ={' '}
            {trim(result.targetStrengthParts.byX, 2)}, with X = {valueOfX(input.fck)} from Table 1. The
            higher governs.
            {result.massUplift > 0 && (
              <>
                {' '}
                For {input.msa} mm aggregate clause 9.2 raises the cube test target by{' '}
                {result.massUplift} percent to {trim(result.targetStrengthCubes, 2)} N/mm², for the wet
                sieving effect. The water-cement ratio is still selected at{' '}
                {trim(result.targetStrength, 2)} N/mm².
              </>
            )}
          </Callout>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      <Section
        clause="4.1"
        title="Material test data"
        open={open.materials}
        onToggle={() => toggle('materials')}
        note="Specific gravities are needed to convert masses into the absolute volumes that must sum to one cubic metre. Absorption and moisture content decide how the batch weights are corrected for the condition the aggregate is actually in."
      >
        <Field label="Specific gravity of cement">
          <NumberInput value={input.cementSG} onChange={(v) => set({ cementSG: v })} step="0.01" />
        </Field>
        <Field label="Specific gravity of coarse aggregate" hint="At the saturated surface dry condition.">
          <NumberInput value={input.caSG} onChange={(v) => set({ caSG: v })} step="0.01" />
        </Field>
        <Field label="Specific gravity of fine aggregate" hint="At the saturated surface dry condition.">
          <NumberInput value={input.faSG} onChange={(v) => set({ faSG: v })} step="0.01" />
        </Field>
        <Field label="Water absorption of coarse aggregate" cite="IS 2386 (Part 3)">
          <NumberInput value={input.caAbsorption} onChange={(v) => set({ caAbsorption: v })} unit="%" step="0.1" />
        </Field>
        <Field label="Water absorption of fine aggregate" cite="IS 2386 (Part 3)">
          <NumberInput value={input.faAbsorption} onChange={(v) => set({ faAbsorption: v })} unit="%" step="0.1" />
        </Field>

        <Field
          label="Condition of the aggregate at batching"
          hint={
            input.aggCondition === 'ssd'
              ? 'No correction to the mixing water.'
              : input.aggCondition === 'dry'
              ? 'Mixing water is increased by the moisture the aggregate will absorb.'
              : 'Mixing water is reduced by the free surface moisture the aggregate carries.'
          }
        >
          <Select value={input.aggCondition} onChange={(v) => set({ aggCondition: v })} options={opts(AGGREGATE_CONDITIONS)} />
        </Field>

        {input.aggCondition === 'wet' && (
          <>
            <Field label="Total moisture content of coarse aggregate">
              <NumberInput value={input.caMoisture} onChange={(v) => set({ caMoisture: v })} unit="%" step="0.1" />
            </Field>
            <Field label="Total moisture content of fine aggregate">
              <NumberInput value={input.faMoisture} onChange={(v) => set({ faMoisture: v })} unit="%" step="0.1" />
            </Field>
          </>
        )}
      </Section>

      {/* ---------------------------------------------------------- */}
      <Section
        clause={high ? '6.2.4' : scc ? '8.3 (c)' : mass ? '9.4, 9.6' : '5.3-5.4'}
        title="Admixtures"
        open={open.admix}
        onToggle={() => toggle('admix')}
        note={
          scc
            ? 'Self compacting concrete relies on a high range water reducing admixture, usually PCE based, and sometimes a viscosity modifying admixture. Fly ash supplies much of the powder.'
            : 'A water reducing admixture lets the water content be cut at the same workability. A mineral admixture replaces part of the cement and may call for the cementitious content to be increased.'
        }
      >
        <Field label="Chemical admixture" cite="IS 9103 · Annex G" hint={chem.note}>
          <Select
            value={input.chemType}
            onChange={(v) =>
              set({
                chemType: v,
                chemSG: CHEMICAL_ADMIXTURES[v].sg,
                chemDosage: CHEMICAL_ADMIXTURES[v].dose[1],
                chemWaterReduction: Math.round(
                  (CHEMICAL_ADMIXTURES[v].reduction[0] + CHEMICAL_ADMIXTURES[v].reduction[1]) / 2
                ),
              })
            }
            options={opts(CHEMICAL_ADMIXTURES)}
          />
        </Field>

        {input.chemType !== 'none' && (
          <>
            <Field
              label="Dosage"
              hint={`Annex G-3 gives ${chem.dose[0]} to ${chem.dose[1]} percent by mass of cementitious material.`}
            >
              <NumberInput value={input.chemDosage} onChange={(v) => set({ chemDosage: v })} unit="% cm" step="0.1" />
            </Field>
            {!scc && (
              <Field
                label="Water reduction achieved"
                hint={
                  mass
                    ? 'Clause 9.4: water reducing admixtures usually reduce water in mass concrete by 5 to 10 percent. Establish the figure by trial.'
                    : `Annex G-3 gives ${chem.reduction[0]} to ${chem.reduction[1]} percent. Establish the figure by trial for the cement and admixture actually used.`
                }
              >
                <NumberInput value={input.chemWaterReduction} onChange={(v) => set({ chemWaterReduction: v })} unit="%" step="1" />
              </Field>
            )}
            <Field label="Specific gravity of chemical admixture">
              <NumberInput value={input.chemSG} onChange={(v) => set({ chemSG: v })} step="0.005" />
            </Field>
          </>
        )}

        {scc && (
          <Field
            label="Viscosity modifying admixture"
            cite="8.3 (c)"
            hint="Annex E-10 found a small dose, 0.2 percent by mass of cementitious material, improved the cohesiveness of its mix. Leave at zero unless trials call for it."
          >
            <NumberInput value={input.vmaDosage} onChange={(v) => set({ vmaDosage: v })} unit="% cm" step="0.05" min={0} />
          </Field>
        )}

        <Field label="Mineral admixture" cite={high ? 'Table 9' : scc ? 'Annex E-7.1' : '5.4.2'}>
          <Select
            value={input.mineralType}
            onChange={(v) =>
              set({
                mineralType: v,
                mineralSG: TABLE_9_MINERAL_DOSAGE[v]?.sg ?? 2.2,
                mineralPct:
                  v === 'none'
                    ? 0
                    : scc && v === 'flyAsh'
                    ? 35
                    : Math.round((TABLE_9_MINERAL_DOSAGE[v].min + TABLE_9_MINERAL_DOSAGE[v].max) / 2),
                increaseCementitious: v !== 'none' && !scc,
              })
            }
            options={[
              { value: 'none', label: 'None' },
              ...Object.entries(TABLE_9_MINERAL_DOSAGE).map(([value, v]) => ({ value, label: v.label })),
            ]}
          />
        </Field>

        {input.mineralType !== 'none' && (
          <>
            <Field
              label={`${mineral.label} content`}
              hint={
                scc && input.mineralType === 'flyAsh'
                  ? `Annex E-7.1: a fly ash content of ${SCC_RANGES.flyAshPct[0]} to ${SCC_RANGES.flyAshPct[1]} percent is generally adopted for SCC.`
                  : `Table 9 recommends ${mineral.min} to ${mineral.max} percent by mass of total cementitious material for high strength mixes. Conforming to ${mineral.is}.`
              }
            >
              <NumberInput value={input.mineralPct} onChange={(v) => set({ mineralPct: v })} unit="% cm" step="1" />
            </Field>
            <Field label={`Specific gravity of ${mineral.label.toLowerCase()}`}>
              <NumberInput value={input.mineralSG} onChange={(v) => set({ mineralSG: v })} step="0.05" />
            </Field>

            {!scc && (
              <Field label="Second mineral admixture" hint="Silica fume is often combined with fly ash or GGBS.">
                <Select
                  value={input.secondMineralType}
                  onChange={(v) =>
                    set({
                      secondMineralType: v,
                      secondMineralSG: TABLE_9_MINERAL_DOSAGE[v]?.sg ?? 2.2,
                      secondMineralPct: v === 'none' ? 0 : TABLE_9_MINERAL_DOSAGE[v].min,
                    })
                  }
                  options={[
                    { value: 'none', label: 'None' },
                    ...Object.entries(TABLE_9_MINERAL_DOSAGE)
                      .filter(([k]) => k !== input.mineralType)
                      .map(([value, v]) => ({ value, label: v.label })),
                  ]}
                />
              </Field>
            )}

            {!scc && input.secondMineralType !== 'none' && (
              <>
                <Field label={`${second.label} content`} hint={`Table 9 recommends ${second.min} to ${second.max} percent.`}>
                  <NumberInput value={input.secondMineralPct} onChange={(v) => set({ secondMineralPct: v })} unit="% cm" step="1" />
                </Field>
                <Field label={`Specific gravity of ${second.label.toLowerCase()}`}>
                  <NumberInput value={input.secondMineralSG} onChange={(v) => set({ secondMineralSG: v })} step="0.05" />
                </Field>
              </>
            )}

            {!scc && (
              <Field
                label="Increase the cementitious materials content"
                cite={high ? '6.2.6' : mass ? '9.6.1' : '5.4.1'}
                hint={
                  mass
                    ? 'Clause 9.6.1: an increase may be warranted where fly ash is 20 percent or more, or GGBS 30 percent or more. Annex F uses 15 percent; the water-cementitious materials ratio is recalculated on the increased content.'
                    : 'The standard allows a 10 percent increase for a preliminary trial, particularly where fly ash is 20 percent or more. The water-cementitious materials ratio is then recalculated on the increased content.'
                }
              >
                <span style={{ display: 'grid', gap: '0.35rem' }}>
                  <Toggle
                    checked={input.increaseCementitious}
                    onChange={(v) => set({ increaseCementitious: v })}
                    label="Apply an increase"
                  />
                  {input.increaseCementitious && (
                    <NumberInput
                      value={input.increaseCementitiousPct}
                      onChange={(v) => set({ increaseCementitiousPct: v })}
                      unit="%"
                      step="1"
                    />
                  )}
                </span>
              </Field>
            )}
          </>
        )}
      </Section>

      {/* ---------------------------------------------------------- */}
      <Section
        clause={high ? '6.2.5' : mass ? '9.3-9.7' : '5.1-5.5'}
        title="Selections and rounding"
        open={open.assume}
        onToggle={() => toggle('assume')}
        note="Every value the standard asks you to read off a table or a graph can be overridden here with your own reading or your own site data. The rounding controls decide how intermediate figures are carried forward, which is how the worked examples in the annexes reach the numbers they print."
      >
        <Field
          label={high ? 'Water-cementitious materials ratio' : 'Free water-cement ratio'}
          cite={high ? 'Table 8' : mass ? 'Figure 1, clause 9.5' : 'Figure 1'}
          hint={
            high
              ? `Table 8 interpolated at f'ck = ${trim(result.targetStrength, 2)} N/mm² for ${input.msa} mm aggregate.`
              : `Curve ${result.curve} at f'ck = ${trim(result.targetStrength, 2)} N/mm². Reading a printed graph carries about ±0.01, shaded on the plot; enter your own reading if it differs.`
          }
        >
          <Segmented
            value={input.wcMode}
            onChange={(v) => set({ wcMode: v, wcManual: result.wcSelected })}
            options={[
              { value: 'auto', label: high ? 'From Table 8' : 'From Figure 1' },
              { value: 'manual', label: 'Enter' },
            ]}
          />
        </Field>

        {input.wcMode === 'manual' && (
          <Field label={high ? 'w/cm adopted' : 'w/c adopted'}>
            <NumberInput value={input.wcManual} onChange={(v) => set({ wcManual: v })} step="0.005" />
          </Field>
        )}

        {!high && (
          <div className="field wide">
            <Fig1Plot activeCurve={result.curve} wc={result.wcSelected} strength={result.targetStrength} />
            <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginTop: '0.4rem' }}>
              Figure 1 redrawn from the published curves. The marked point is the reading for the design
              in the worksheet, before the durability limit is applied, and the shaded band is the ±0.01
              tolerance of reading the printed graph. Curve {result.curve} is in use.
            </p>
          </div>
        )}

        <Field
          label="Entrapped air content"
          cite={`Table ${airTableNo}`}
          hint={
            mass && input.airEntrained
              ? 'For air entrained mass concrete enter the stipulated air content as site data.'
              : 'Site data of at least 5 results for a similar mix may be used instead.'
          }
        >
          <Segmented
            value={input.airMode}
            onChange={(v) => set({ airMode: v, airManual: result.airPct })}
            options={[
              { value: 'table', label: `Table ${airTableNo}` },
              { value: 'manual', label: 'Site data' },
            ]}
          />
        </Field>

        {input.airMode === 'manual' && (
          <Field label="Air content">
            <NumberInput value={input.airManual} onChange={(v) => set({ airManual: v })} unit="%" step="0.1" />
          </Field>
        )}

        {!scc && (
          <Field label="Volume of coarse aggregate per unit volume of total aggregate" cite={`Table ${caTableNo}`}>
            <Segmented
              value={input.caVolMode}
              onChange={(v) => set({ caVolMode: v, caVolManual: result.caVolFraction })}
              options={[
                { value: 'table', label: `Table ${caTableNo}` },
                { value: 'manual', label: 'Enter' },
              ]}
            />
          </Field>
        )}

        {!scc && input.caVolMode === 'manual' && (
          <Field
            label="Tabulated volume, before adjustment"
            hint={`Entered at the reference ratio of ${high ? '0.30' : '0.50'}; the adjustment for the actual ratio is still applied.`}
          >
            <NumberInput value={input.caVolManual} onChange={(v) => set({ caVolManual: v })} step="0.01" />
          </Field>
        )}

        {!scc && !mass && (
          <Field
            label="Reduction of coarse aggregate for workability"
            cite={high ? '6.2.7' : '5.5.2'}
            hint={`Up to ${high ? 5 : 10} percent where the concrete is pumped or worked around congested reinforcement.`}
          >
            <NumberInput
              value={input.pumpableReduction}
              onChange={(v) => set({ pumpableReduction: v })}
              unit="%"
              step="1"
              min={0}
              max={high ? 5 : 10}
            />
          </Field>
        )}

        <Field
          label="Rounding of the cementitious materials content"
          hint="Annexes A, B, E and F round the figure up to the next kilogram; Annex D rounds to the nearest. The choice moves the result by about one kilogram."
        >
          <Segmented
            value={input.roundCementitious}
            onChange={(v) => set({ roundCementitious: v })}
            options={[
              { value: 'up', label: 'Up, as Annex A' },
              { value: 'nearest', label: 'Nearest, as Annex D' },
            ]}
          />
        </Field>

        <Field
          label={scc ? 'Decimals carried on the coarse aggregate volume' : 'Decimals carried on the aggregate volume'}
          hint="The worked examples carry this volume to three or four decimals before multiplying out the aggregate masses."
        >
          <Segmented
            value={String(input.aggVolDp)}
            onChange={(v) => set({ aggVolDp: Number(v) })}
            options={[
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '0', label: 'Full' },
            ]}
          />
        </Field>
      </Section>
    </div>
  );
}
