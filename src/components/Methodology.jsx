/**
 * Methodology: what the calculator does at each step and where in the
 * standard the provision comes from.
 */
import React from 'react';
import {
  TABLE_1_X,
  TABLE_2_SD,
  TABLE_3_AIR,
  TABLE_4_WATER,
  TABLE_5_CA_VOLUME,
  TABLE_6_AIR,
  TABLE_7_WATER,
  TABLE_8_WCM,
  TABLE_9_MINERAL_DOSAGE,
  TABLE_10_CA_VOLUME,
  IS456_TABLE_5,
  TABLE_11_AIR,
  TABLE_12_WATER,
  TABLE_13_CA_VOLUME,
  TABLE_14_GRADING,
  TABLE_15_MORTAR,
  MASS_ROUNDED_WATER_ADJ,
  SCC_SLUMP_FLOW,
  SCC_VISCOSITY,
  SCC_SEGREGATION,
  SCC_LBOX_MIN_RATIO,
  SCC_RANGES,
} from '../lib/tables.js';

function Table({ caption, head, rows }) {
  return (
    <div className="tbl-wrap" style={{ margin: '0.75rem 0 1.5rem' }}>
      <table className="data">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h} className={i === 0 ? undefined : 'num'}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, n) => (
            <tr key={n}>
              {r.map((c, i) => (
                <td key={i} className={i === 0 ? undefined : 'num'}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Methodology() {
  return (
    <div className="page">
      <div className="prose">
        <h2>Methodology</h2>
        <p className="lede">
          The calculator follows the procedure of IS 10262 : 2019 in the order the standard sets it
          out. Section 2 governs ordinary and standard grades from M 10 to M 60, Section 3 high strength
          grades of M 65 and above, Section 4 self compacting concrete and Section 5 mass concrete. Durability limits throughout are those of IS 456 :
          2000. Every figure the calculator produces carries the clause or table it came from, so the
          output can be checked by hand.
        </p>

        <h2>Step 1 · Target strength, clause 4.2</h2>
        <p>
          The mix is proportioned for a target mean compressive strength above the characteristic
          strength, so that not more than the specified proportion of test results falls below it. The
          margin is the greater of the two relations
        </p>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '0.9375rem' }}>
          f′ck = fck + 1.65 S &nbsp;&nbsp;or&nbsp;&nbsp; f′ck = fck + X
        </p>
        <p>
          where S is the standard deviation and X the factor of Table 1. The second relation is new to
          the 2019 revision and guarantees a minimum margin whatever the standard deviation happens to
          be, which matters for the low grades where 1.65 S is small.
        </p>
        <Table
          caption="Table 1  Value of X, clause 4.2"
          head={['Grade of concrete', 'X, N/mm²']}
          rows={TABLE_1_X.map((r) => [r.grades, r.X.toFixed(1)])}
        />
        <h3>Standard deviation</h3>
        <p>
          Where at least thirty test results exist for the grade, clause 4.2.1.2 gives the standard
          deviation from them, for one group or for two groups of the same grade combined. The
          calculator implements both formulae and will adopt the result. Until that record exists,
          Table 2 supplies an assumed value; Note 1 of that table raises it by 1 N/mm² where site
          control is fair rather than good.
        </p>
        <Table
          caption="Table 2  Assumed standard deviation, clause 4.2.1.3"
          head={['Grade of concrete', 'S, N/mm² (good control)']}
          rows={TABLE_2_SD.map((r) => [r.grades, r.S.toFixed(1)])}
        />

        <h2>Step 2 · Air content, clause 5.2 and clause 6.2.3</h2>
        <p>
          A volume of entrapped air is expected in normal, non air entrained concrete, and it has to
          come out of the cubic metre before the aggregate is proportioned. Its reintroduction into the
          calculation for non air entrained mixes is one of the changes made in the 2019 revision. Site
          data of at least five results for a similar mix may be used instead of the table.
        </p>
        <Table
          caption="Table 3 and Table 6  Approximate air content, percent of concrete volume"
          head={['Nominal maximum size, mm', 'Table 3, M 10 to M 60', 'Table 6, M 65 and above']}
          rows={[
            ['10', TABLE_3_AIR[10].toFixed(1), TABLE_6_AIR[10].toFixed(1)],
            ['12.5', '—', TABLE_6_AIR[12.5].toFixed(1)],
            ['20', TABLE_3_AIR[20].toFixed(1), TABLE_6_AIR[20].toFixed(1)],
            ['40', TABLE_3_AIR[40].toFixed(1), '—'],
          ]}
        />

        <h2>Step 3 · Free water-cement ratio, clause 5.1 and clause 6.2.5</h2>
        <p>
          For ordinary and standard grades the preliminary free water-cement ratio is read off Figure
          1 against the target strength, on the curve matching the expected 28 day strength of the
          cement. Curves 1, 2 and 3 stand for cement strengths of 33 and above, 43 and above, and 53
          and above; in the absence of data on the actual strength of the cement they are used for OPC
          33, OPC 43 and OPC 53 respectively, and Note 2 directs PPC and PSC to Curve 2. Clause 5.1
          asks that the relationship be established for the materials actually in use wherever
          possible, and Figure 1 serve only in the absence of such data.
        </p>
        <p>
          For high strength grades the ratio comes instead from Table 8, which is drawn up for mixes
          made with silica fume and a high range water reducing admixture, and is interpolated between
          rows on the target strength.
        </p>
        <Table
          caption="Table 8  Recommended w/cm for high strength concrete made with HRWRA, clause 6.2.5"
          head={["Target strength, N/mm²", '10 mm', '12.5 mm', '20 mm']}
          rows={TABLE_8_WCM.map((r) => [r.fck, r[10].toFixed(2), r[12.5].toFixed(2), r[20].toFixed(2)])}
        />
        <p>
          Whichever source is used, clause 5.1.1 requires the value to be checked against the limiting
          ratio for durability and the lower of the two adopted. The calculator applies that check and
          reports which of the two governs.
        </p>

        <h2>Step 4 · Water content, clause 5.3 and clause 6.2.4</h2>
        <p>
          The tabulated water content is for angular coarse aggregate at a slump of 50 mm, with the
          aggregate in the saturated surface dry condition. Three adjustments follow, in order.
        </p>
        <ol>
          <li>
            For the shape of the coarse aggregate, the estimate is reduced by about 10 kg for sub
            angular aggregate, 15 kg for gravel with some crushed particles and 20 kg for rounded
            gravel.
          </li>
          <li>
            For a workability other than 50 mm slump, the water is changed by about 3 percent for each
            25 mm of slump.
          </li>
          <li>
            For a water reducing admixture, the water is reduced by the percentage the admixture
            achieves: 8 to 12 percent for a plasticizer, 15 to 30 percent for a superplasticizer, and
            30 percent or more for a polycarboxylate ether type, as Annex G sets out. The figure has
            to be established by trial for the cement and admixture actually in use.
          </li>
        </ol>
        <Table
          caption="Table 4 and Table 7  Water content per cubic metre, kg, at 50 mm slump"
          head={['Nominal maximum size, mm', 'Table 4, M 10 to M 60', 'Table 7, M 65 and above']}
          rows={[
            ['10', TABLE_4_WATER[10], TABLE_7_WATER[10]],
            ['12.5', '—', TABLE_7_WATER[12.5]],
            ['20', TABLE_4_WATER[20], TABLE_7_WATER[20]],
            ['40', TABLE_4_WATER[40], '—'],
          ]}
        />

        <h2>Step 5 · Cementitious materials content, clause 5.4 and clause 6.2.6</h2>
        <p>
          The content follows from the water content and the adopted ratio as{' '}
          <code>cementitious = water / (w/c)</code>. Where cement is part replaced by fly ash, GGBS,
          silica fume or metakaolin, clause 5.4.1 notes that an increase in cementitious content may be
          warranted, particularly when fly ash reaches 20 percent or more, and allows a 10 percent
          increase for a preliminary trial. The water-cementitious materials ratio is then recalculated
          on the increased content, and it is that recalculated ratio which governs the aggregate
          proportioning that follows.
        </p>
        <Table
          caption="Table 9  Recommended dosages of mineral admixtures for high strength mixes, clause 6.2.6"
          head={['Mineral admixture', 'Percent by mass of total cementitious material']}
          rows={Object.values(TABLE_9_MINERAL_DOSAGE).map((m) => [m.label, `${m.min} to ${m.max}`])}
        />
        <p>
          The content is then checked against the minimum for the exposure condition and the maximum
          cement content, both from IS 456. Where the calculated content falls below the durability
          minimum, the calculator raises it to the minimum and recalculates the ratio, and says so in
          the calculation sheet.
        </p>
        <Table
          caption="IS 456 : 2000, Table 5  Durability limits for 20 mm nominal maximum size aggregate"
          head={[
            'Exposure',
            'Plain: min cement, kg/m³',
            'Plain: max w/c',
            'Reinforced: min cement, kg/m³',
            'Reinforced: max w/c',
            'Reinforced: min grade',
          ]}
          rows={Object.keys(IS456_TABLE_5.reinforced).map((k) => {
            const p = IS456_TABLE_5.plain[k];
            const rc = IS456_TABLE_5.reinforced[k];
            const label = k === 'verySevere' ? 'Very severe' : k[0].toUpperCase() + k.slice(1);
            return [label, p.minCement, p.maxWC.toFixed(2), rc.minCement, rc.maxWC.toFixed(2), `M ${rc.minGrade}`];
          })}
        />
        <p>
          Table 6 of IS 456 adjusts the minimum cement content for aggregate of a size other than 20
          mm: up by 40 kg/m³ for 10 mm aggregate and down by 30 kg/m³ for 40 mm. The calculator applies
          that adjustment and names it where it bites.
        </p>

        <h2>Step 6 · Aggregate proportions, clause 5.5 and clause 6.2.7</h2>
        <p>
          The volume of coarse aggregate in a unit volume of total aggregate depends only on the
          nominal maximum size and the grading zone of the fine aggregate. Table 5 tabulates it at a
          ratio of 0.50, Table 10 at 0.30. For any other ratio the proportion is increased by 0.01 for
          every 0.05 the ratio falls, and decreased at the same rate as it rises. Where mineral
          admixtures are used it is the water-cementitious materials ratio that drives this adjustment.
        </p>
        <Table
          caption="Table 5  Volume of coarse aggregate per unit volume of total aggregate, at w/c 0.50"
          head={['Nominal maximum size, mm', 'Zone I', 'Zone II', 'Zone III', 'Zone IV']}
          rows={Object.entries(TABLE_5_CA_VOLUME).map(([msa, z]) => [
            msa,
            z.I.toFixed(2),
            z.II.toFixed(2),
            z.III.toFixed(2),
            z.IV.toFixed(2),
          ])}
        />
        <Table
          caption="Table 10  Volume of coarse aggregate per unit volume of total aggregate, at w/cm 0.30"
          head={['Nominal maximum size, mm', 'Zone I', 'Zone II', 'Zone III']}
          rows={Object.entries(TABLE_10_CA_VOLUME).map(([msa, z]) => [
            msa,
            z.I.toFixed(2),
            z.II.toFixed(2),
            z.III.toFixed(2),
          ])}
        />
        <p>
          Where the concrete is to be pumped or worked around congested reinforcement, clause 5.5.2
          allows the coarse aggregate content to be reduced by up to 10 percent, and clause 6.2.7 by up
          to 5 percent for high strength mixes. The fine aggregate takes up the balance of the unit
          volume.
        </p>

        <h2>Step 7 · Absolute volumes, clause 5.7 and clause 6.2.8</h2>
        <p>
          Everything but the aggregate is now known by mass. Each is turned into an absolute volume by
          dividing its mass by its specific gravity and by 1 000. What is left of the cubic metre, once
          the entrapped air and those volumes are taken out, is the volume of all in aggregate:
        </p>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '0.875rem' }}>
          V<sub>agg</sub> = (1 − V<sub>air</sub>) − (V<sub>cement</sub> + V<sub>mineral</sub> + V
          <sub>water</sub> + V<sub>admixture</sub>)
        </p>
        <p>
          That volume is split in the coarse to fine ratio already found, and each part multiplied by
          its specific gravity and by 1 000 to give a mass in kilograms per cubic metre. This is the
          step that makes the method a volumetric one: the constituents are proportioned so that their
          absolute volumes, with the air, come to exactly one cubic metre.
        </p>

        <h2>Step 8 · Correction for the condition of the aggregate</h2>
        <p>
          The design assumes aggregate in the saturated surface dry condition. Aggregate at site is
          rarely in that condition, and Annex A-11 and Annex B-11 show the two corrections.
        </p>
        <h3>Dry aggregate</h3>
        <p>
          Dry aggregate will absorb part of the mixing water. Its mass is reduced to the dry basis as{' '}
          <code>m_dry = m_SSD / (1 + absorption/100)</code>, and the water it will absorb, the
          difference between the two masses, is added to the mixing water.
        </p>
        <h3>Wet aggregate</h3>
        <p>
          Wet aggregate carries free surface moisture over and above its absorption, which it gives to
          the mix. The free moisture is the total moisture content less the water absorption. The
          aggregate mass is raised as <code>m_wet = m_SSD × (1 + free/100)</code>, and the water it
          contributes, the difference between the two masses, is taken out of the mixing water.
        </p>
        <p>
          Surface water and water absorption are to be determined in accordance with IS 2386 (Part 3).
        </p>

        <h2>Step 9 · Trial mixes, clause 5.8 and clause 6.2.9</h2>
        <p>
          The proportions are a starting point, not an answer. The workability of trial 1 is measured
          and the mix observed for segregation, bleeding and finish. Water or admixture is adjusted to
          reach the stipulated workability, and the proportions recalculated at the pre-selected ratio,
          giving trial 2. Trials 3 and 4 hold that water content and vary the free ratio by about ten
          percent either way. Plotting strength against the three ratios gives the proportions to carry
          to field trials, subject always to the durability requirements being met.
        </p>

        <h2>On rounding</h2>
        <p>
          The worked examples in the annexes round their intermediate figures, and they do not round
          them consistently. Annex A takes a cement content of 411.11 kg/m³ up to 412; Annex D takes
          486.2 down to 486. Annex A carries the volume of all in aggregate to three decimals, Annex C
          to four. Because those roundings propagate into the aggregate masses, the calculator exposes
          them as settings rather than hiding a choice inside the engine. The defaults reproduce Annex
          A exactly, and the verification page names the setting each case needs.
        </p>

        <h2>Step 10 · Combining coarse aggregate fractions, clause 5.6</h2>
        <p>
          Coarse aggregate usually arrives as single sized fractions. Clause 5.6 has them combined in
          proportions that give an overall grading conforming to Table 7 of IS 383 for the nominal
          maximum size, and every worked example in the standard carries the step: Annexes A and B reach
          60:40 on two fractions, Annexes D and E reach 50:50, and Annex F reaches 35:30:15:10:10 on
          five. The combined percentage passing each sieve is the weighted mean of the fractions:
        </p>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '0.875rem' }}>
          combined(s) = Σ passing<sub>i</sub>(s) × proportion<sub>i</sub> / 100
        </p>
        <p>
          The calculator combines the sieve analyses you enter, checks each sieve against its limits,
          splits the coarse aggregate mass between the fractions, and can search for proportions that
          bring every sieve inside its band, preferring the middle of each band. Run on the sieve
          analysis printed in Annex F at the standard's 35:30:15:10:10, it reproduces the combined
          grading of that annex exactly: 100, 62.6, 35, 20.3, 8.8 and 1.2 percent passing. The limits of
          IS 383 are offered as editable defaults, since that standard is not reproduced inside IS
          10262.
        </p>

        <h2>Section 4 · Self compacting concrete, clauses 7 and 8</h2>
        <p>
          Self compacting concrete fills the formwork and encapsulates the reinforcement under its own
          weight, without vibration. It is not proportioned by the ladder above. Clause 8.1 sets
          different principles: a lower coarse aggregate content, an increased paste content, a low
          water to powder ratio, an increased superplasticiser dose and sometimes a viscosity modifying
          admixture.
        </p>
        <h3>Specifying the fresh properties, clause 7.2</h3>
        <Table
          caption="Clause 7.2  Classes of self compacting concrete"
          head={['Property, and the test', 'Class', 'Requirement']}
          rows={[
            ...Object.values(SCC_SLUMP_FLOW).map((c) => ['Filling ability, slump flow', c.label, `${c.range[0]} to ${c.range[1]} mm`]),
            ...Object.values(SCC_VISCOSITY).map((c) => ['Viscosity, V funnel', c.label, c.text]),
            ...Object.values(SCC_SEGREGATION).map((c) => ['Segregation resistance, sieve', c.label, c.text]),
            ['Passing ability, L box', '—', `h2/h1 at least ${SCC_LBOX_MIN_RATIO}`],
          ]}
        />
        <h3>The proportioning, clause 8.2</h3>
        <ol>
          <li>
            Target strength, air content and free water-cement ratio exactly as for Section 2, the
            ratio read from Figure 1 and checked against IS 456.
          </li>
          <li>
            Water content chosen rather than tabulated: clause 8.3 (b) gives {SCC_RANGES.water[0]} to{' '}
            {SCC_RANGES.water[1]} kg/m³, picked to suit the slump flow class. The cementitious content
            follows as water divided by the ratio, split between cement and fly ash; Annex E notes 25 to
            50 percent fly ash as typical.
          </li>
          <li>
            Powder content, meaning everything finer than 0.125 mm, chosen in the preferred range of{' '}
            {SCC_RANGES.powder[0]} to {SCC_RANGES.powder[1]} kg/m³, towards the top where a low viscosity
            class or a high segregation resistance calls for a more cohesive mix.
          </li>
          <li>
            Fine aggregate sized to supply the powder the cementitious material does not:{' '}
            <code>FA = (powder − cementitious) / fraction of the sand finer than 0.125 mm</code>.
          </li>
          <li>
            Coarse aggregate by subtraction: whatever is left of the cubic metre after air, water,
            cementitious material, admixtures and fine aggregate.
          </li>
          <li>
            The water to powder ratio by volume checked against {SCC_RANGES.waterPowderRatio[0]} to{' '}
            {SCC_RANGES.waterPowderRatio[1].toFixed(2)}. Below the range the fine aggregate is reduced;
            above it the fine aggregate is increased, and every value is recalculated.
          </li>
        </ol>
        <p>
          Clause 8.3 (a) also expects fine aggregate to make up about {SCC_RANGES.fineAggregatePct[0]} to{' '}
          {SCC_RANGES.fineAggregatePct[1]} percent of the total aggregate by mass. The calculator
          reports it as a check alongside the ranges above.
        </p>

        <h2>Section 5 · Mass concrete, clause 9</h2>
        <p>
          Dams and other massive structures generate heat of hydration faster than it can escape, so
          mass concrete is proportioned for the least temperature rise that still gives the strength,
          durability and workability required. The procedure is that of Section 2 with its own tables
          for large aggregate and two provisions of its own.
        </p>
        <h3>Target strength and the wet sieving effect, clause 9.2</h3>
        <p>
          The target strength of clause 4.2 is raised by 20 percent for 80 mm aggregate and by 25
          percent for 150 mm, because test cubes are cast from concrete wet sieved through a 40 mm sieve
          and come out stronger than the full mix. That increase applies to the cube result only:
          clause 9.5 selects the water-cement ratio from Figure 1 at the target strength without it.
        </p>
        <Table
          caption="Tables 11, 12 and 13  Air, water and coarse aggregate volume for mass concrete"
          head={['Nominal maximum size, mm', 'Air, percent', 'Water, kg/m³', 'Less for rounded gravel, kg', 'CA volume, Zone I', 'Zone II', 'Zone III', 'Zone IV']}
          rows={[40, 80, 150].map((m) => [
            m,
            TABLE_11_AIR[m].toFixed(1),
            TABLE_12_WATER[m],
            Math.abs(MASS_ROUNDED_WATER_ADJ[m]),
            TABLE_13_CA_VOLUME[m].I.toFixed(2),
            TABLE_13_CA_VOLUME[m].II.toFixed(2),
            TABLE_13_CA_VOLUME[m].III.toFixed(2),
            TABLE_13_CA_VOLUME[m].IV.toFixed(2),
          ])}
        />
        <p>
          The water of Table 12 is for angular aggregate at 50 mm slump, and Note 1 of that table takes
          8 kg off for air entrained concrete. IS 456 tabulates its aggregate size adjustment to the
          minimum cement content only up to 40 mm; Annex F applies the 40 mm figure of −30 kg/m³ to 150
          mm aggregate, and the calculator does the same.
        </p>
        <h3>Mortar content, clause 9.10</h3>
        <p>
          Mixes with 80 mm and 150 mm aggregate need a minimum volume of mortar, the absolute volume of
          cement, pozzolana, water, admixture, air and fine aggregate, to place and work properly. Where
          the computed mortar content falls outside the range of Table 15, the fine aggregate and
          cementitious contents are adjusted and the mix recalculated.
        </p>
        <Table
          caption="Table 15  Approximate mortar content, m³ per m³ of concrete"
          head={['Nominal maximum size, mm', 'Crushed aggregate', 'Rounded aggregate']}
          rows={Object.entries(TABLE_15_MORTAR)
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([m, v]) => [m, `${v.crushed.toFixed(2)} ± ${v.tol.toFixed(2)}`, `${v.rounded.toFixed(2)} ± ${v.tol.toFixed(2)}`])}
        />
        <Table
          caption="Table 14  Grading requirements for coarse aggregate for mass concrete, percent passing"
          head={['IS sieve, mm', '150 mm aggregate', '80 mm aggregate']}
          rows={TABLE_14_GRADING[150].map((row, k) => {
            const b = TABLE_14_GRADING[80][k];
            const fmt = (x) => (x.min === x.max ? String(x.min) : `${x.min} to ${x.max}`);
            return [row.sieve, fmt(row), fmt(b)];
          })}
        />

        <h2>Scope</h2>
        <p>
          Sections 2 to 5 of the standard are implemented, together with the combination of coarse
          aggregate fractions of clause 5.6, and all six illustrative examples of Annexes A to F are
          reproduced on the verification page.
        </p>
        <p>
          The calculator proportions a mix. It does not replace the trial batches that clauses 5.8,
          6.2.9, 8.2 and 9.11 require, and the reduction claimed for a chemical admixture, the strength of
          the cement and the properties of the aggregate all have to come from testing of the materials
          actually to be used.
        </p>
      </div>
    </div>
  );
}
