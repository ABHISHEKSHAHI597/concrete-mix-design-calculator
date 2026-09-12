/**
 * IS 10262 : 2019, Section 4  —  Self compacting concrete.
 *
 * SCC is not proportioned by the ladder of Section 2. Clause 8.1 sets
 * the principles: a lower coarse aggregate content, an increased paste
 * content, a low water to powder ratio by volume, an increased
 * superplasticiser dose and sometimes a viscosity modifying admixture.
 * Clause 8.2 gives the order of the approach, which this follows:
 *
 *   a) target average compressive strength         clause 4.2
 *   b) air content                                 Table 3
 *   c) water-cement / cementitious ratio           Figure 1
 *   e) water content and cement / fly ash content  clause 8.3 (b)
 *   f) admixture content
 *   g) powder content and fine aggregate content   clause 8.3 (a)
 *   h) coarse aggregate content                    by subtraction
 *   j) volume of powder and the water powder ratio clause 8.1, Note
 *
 * The fine aggregate is not taken from a table: it is whatever supplies
 * the balance of the powder requirement through its own fraction finer
 * than 0.125 mm. The coarse aggregate is then simply what is left of the
 * cubic metre. Annex E works the procedure through for M 30.
 */

import { moistureCorrection } from './moisture.js';
import {
  valueOfX,
  assumedSD,
  TABLE_3_AIR,
  TABLE_9_MINERAL_DOSAGE,
  CEMENT_TYPES,
  curveForCement,
  IS456_TABLE_5,
  IS456_TABLE_6_CEMENT_ADJ,
  IS456_TABLE_3_EXPOSURE,
  CHEMICAL_ADMIXTURES,
  FIG_1_CURVE_NOTES,
  SCC_RANGES,
  SCC_SLUMP_FLOW,
  SCC_VISCOSITY,
  SCC_SEGREGATION,
  SCC_LBOX_MIN_RATIO,
} from './tables.js';
import { fig1WaterCementRatio, absVolume } from './mixDesign.js';

const r = (v, dp = 2) => {
  const f = 10 ** dp;
  return Math.round((v + Number.EPSILON) * f) / f;
};

export function designSCC(raw) {
  const i = raw;
  const steps = [];
  const warnings = [];
  const errors = [];
  const checks = [];
  const step = (clause, title, lines, note) =>
    steps.push({ clause, title, lines: lines.filter(Boolean), note });

  /* Inputs the procedure cannot work without. A cleared field arrives
   * as an empty string and must not pass as zero. */
  const requirePositive = (value, name) => {
    if (value === '' || !(Number(value) > 0))
      errors.push(`Enter the ${name}; it must be a number greater than zero.`);
  };
  requirePositive(i.cementSG, 'specific gravity of the cement');
  requirePositive(i.caSG, 'specific gravity of the coarse aggregate');
  requirePositive(i.faSG, 'specific gravity of the fine aggregate');
  if (i.mineralType !== 'none') requirePositive(i.mineralSG, 'specific gravity of the mineral admixture');
  if (i.chemType !== 'none' && Number(i.chemDosage) > 0) requirePositive(i.chemSG, 'specific gravity of the chemical admixture');
  if (i.wcMode === 'manual') requirePositive(i.wcManual, 'water-cement ratio');
  if (i.sdMode === 'manual') requirePositive(i.sdManual, 'standard deviation');
  requirePositive(i.sccWater, 'water content');
  requirePositive(i.sccPowder, 'powder content');

  const cement = CEMENT_TYPES[i.cementType];
  const exposure = IS456_TABLE_3_EXPOSURE[i.exposure];
  const durability = IS456_TABLE_5[i.concreteType][i.exposure];
  const sf = SCC_SLUMP_FLOW[i.slumpFlowClass];
  const vis = SCC_VISCOSITY[i.viscosityClass];
  const sr = SCC_SEGREGATION[i.segregationClass];

  /* ---------------------------------------------------------------- *
   * Stipulations   (clause 4.1 with the characteristics of clause 7.2)
   * ---------------------------------------------------------------- */
  step('4.1, 7.2', 'Data for mix proportioning', [
    { label: 'Grade designation', value: `M ${i.fck}`, kind: 'text' },
    { label: 'Type of cement', value: `${cement.label}, ${cement.is}`, kind: 'text' },
    { label: 'Nominal maximum size of aggregate', value: i.msa, unit: 'mm' },
    {
      label: 'Exposure condition (IS 456, Table 3)',
      value: `${exposure.label}, ${i.concreteType} concrete`,
      kind: 'text',
    },
    {
      label: 'Slump flow class (clause 7.2.1)',
      value: `${sf.label}, slump flow ${sf.range[0]} mm to ${sf.range[1]} mm`,
      kind: 'text',
    },
    {
      label: 'Viscosity class by V funnel (clause 7.2.4)',
      value: `${vis.label}, ${vis.text}`,
      kind: 'text',
    },
    {
      label: 'Segregation resistance class (clause 7.2.3)',
      value: `${sr.label}, ${sr.text}`,
      kind: 'text',
    },
    {
      label: 'Passing ability by L box, h2/h1 (clause 7.2.2)',
      value: i.lBoxRatio,
      unit: `minimum ${SCC_LBOX_MIN_RATIO}`,
    },
    { label: 'Chemical admixture', value: CHEMICAL_ADMIXTURES[i.chemType].label, kind: 'text' },
    i.mineralType !== 'none' && {
      label: 'Mineral admixture',
      value: `${TABLE_9_MINERAL_DOSAGE[i.mineralType].label}, ${TABLE_9_MINERAL_DOSAGE[i.mineralType].is}`,
      kind: 'text',
    },
  ], `Clause 7.2.1: ${sf.use}`);

  if (Number(i.lBoxRatio) < SCC_LBOX_MIN_RATIO) {
    warnings.push(
      `Clause 7.2.2 requires the L box ratio h2/h1 to be at least ${SCC_LBOX_MIN_RATIO}. A value of ${i.lBoxRatio} indicates blocking at the reinforcement.`
    );
  }
  checks.push({
    id: 'lbox',
    label: 'Passing ability, L box ratio',
    ref: 'clause 7.2.2',
    pass: Number(i.lBoxRatio) >= SCC_LBOX_MIN_RATIO,
    detail: `${i.lBoxRatio} ≥ ${SCC_LBOX_MIN_RATIO}`,
  });

  /* ---------------------------------------------------------------- *
   * a)  Target strength   (clause 4.2)
   * ---------------------------------------------------------------- */
  const X = valueOfX(i.fck);
  const S = i.sdMode === 'manual' ? Number(i.sdManual) : assumedSD(i.fck, i.siteControl);
  const byS = i.fck + 1.65 * S;
  const byX = i.fck + X;
  const targetStrength = Math.max(byS, byX);

  step('4.2', 'Target strength for mix proportioning', [
    {
      label: 'Standard deviation, S',
      expr: i.sdMode === 'manual' ? 'established from test results, clause 4.2.1.2' : 'Table 2',
      value: S,
      unit: 'N/mm²',
    },
    { label: 'Factor X', expr: 'Table 1', value: X, unit: 'N/mm²' },
    { label: "f'ck = fck + 1.65 S", expr: `${i.fck} + 1.65 × ${S}`, value: r(byS, 2), unit: 'N/mm²' },
    { label: "f'ck = fck + X", expr: `${i.fck} + ${X}`, value: r(byX, 2), unit: 'N/mm²' },
    {
      label: 'Target mean compressive strength at 28 days',
      expr: 'the higher of the two',
      value: r(targetStrength, 2),
      unit: 'N/mm²',
      emphasis: true,
    },
  ]);

  /* ---------------------------------------------------------------- *
   * b)  Air content   (Table 3)
   * ---------------------------------------------------------------- */
  const airPct = i.airMode === 'manual' ? Number(i.airManual) : TABLE_3_AIR[i.msa];
  const airVol = airPct / 100;

  step('5.2', 'Approximate air content', [
    {
      label: 'Entrapped air in normal (non air entrained) concrete',
      expr: i.airMode === 'manual' ? 'site data' : `Table 3, for ${i.msa} mm nominal maximum size`,
      value: airPct,
      unit: '% of concrete volume',
    },
    { label: 'Volume of entrapped air', expr: `${airPct} / 100`, value: r(airVol, 4), unit: 'm³' },
  ]);

  /* ---------------------------------------------------------------- *
   * c)  Water-cement ratio   (Figure 1, checked against IS 456)
   * ---------------------------------------------------------------- */
  const curve = curveForCement(i.cementType, i.cementStrengthKnown ? Number(i.cementStrength) : null);
  const f1 = fig1WaterCementRatio(curve, targetStrength);
  const wcSelected = i.wcMode === 'manual' ? Number(i.wcManual) : r(f1.wc, Number(i.wcRoundDp) || 2);
  const maxWC = durability.maxWC;
  const wcGovernedBy = wcSelected <= maxWC ? 'Figure 1' : 'IS 456, Table 5';
  const wc = Math.min(wcSelected, maxWC);

  step('5.1', 'Selection of water-cement ratio', [
    { label: 'Figure 1 curve', value: `Curve ${curve} — ${FIG_1_CURVE_NOTES[curve]}`, kind: 'text' },
    {
      label: 'Free water-cement ratio read from the curve',
      expr: `at f'ck = ${r(targetStrength, 2)} N/mm²`,
      value: r(f1.wc, 4),
    },
    {
      label: 'Adopted free water-cement ratio',
      expr: i.wcMode === 'manual' ? 'entered by the user' : 'rounded',
      value: wcSelected,
    },
    {
      label: 'Maximum free water-cement ratio for durability',
      expr: `IS 456, Table 5, ${exposure.label} exposure, ${i.concreteType} concrete`,
      value: maxWC,
    },
    {
      label: 'Adopted free water-cement ratio',
      expr: `lower of the two, governed by ${wcGovernedBy}`,
      value: r(wc, 4),
      emphasis: true,
    },
  ]);

  checks.push({
    id: 'wc',
    label: 'Free water-cement ratio within the durability limit',
    ref: 'IS 456, Table 5',
    pass: wc <= maxWC + 1e-9,
    detail: `${r(wc, 3)} ≤ ${maxWC}`,
  });

  /* ---------------------------------------------------------------- *
   * e)  Water content and cementitious content   (clause 8.3)
   * The water content is chosen from the typical range rather than
   * from a table, to suit the slump flow class required.
   * ---------------------------------------------------------------- */
  const water = Math.round(Number(i.sccWater));
  const roundCem = (v) => (i.roundCementitious === 'up' ? Math.ceil(v - 1e-9) : Math.round(v));
  let cementitious = roundCem(water / wc);

  const sizeAdj = IS456_TABLE_6_CEMENT_ADJ[i.msa] ?? 0;
  const minCementitious = durability.minCement + sizeAdj;
  let bumpedToMinimum = false;
  if (cementitious < minCementitious) {
    cementitious = minCementitious;
    bumpedToMinimum = true;
  }
  const wcm = water / cementitious;

  const m1Pct = i.mineralType !== 'none' ? Number(i.mineralPct) || 0 : 0;
  const m1Mass = r(cementitious * (m1Pct / 100), 2);
  const cementMass = r(cementitious - m1Mass, 2);
  const chemDose = i.chemType === 'none' ? 0 : Number(i.chemDosage) || 0;
  const chemMass = r(cementitious * (chemDose / 100), 3);
  const vmaDose = Number(i.vmaDosage) || 0;
  const vmaMass = r(cementitious * (vmaDose / 100), 3);

  const [wLo, wHi] = SCC_RANGES.water;
  step('8.2 (e), 8.3 (b)', 'Selection of water content and cementitious content', [
    {
      label: 'Water content selected for the initial mix',
      expr: `clause 8.3 (b) gives a typical range of ${wLo} to ${wHi} kg/m³`,
      value: water,
      unit: 'kg/m³',
      emphasis: true,
    },
    {
      label: 'Cementitious materials content',
      expr: `${water} / ${r(wc, 4)}`,
      value: r(water / wc, 2),
      unit: 'kg/m³',
    },
    {
      label: 'Rounded',
      expr: i.roundCementitious === 'up' ? 'rounded up to the next kg' : 'rounded to the nearest kg',
      value: roundCem(water / wc),
      unit: 'kg/m³',
    },
    bumpedToMinimum && {
      label: 'Raised to the durability minimum',
      expr: 'IS 456, Table 5',
      value: minCementitious,
      unit: 'kg/m³',
    },
    {
      label: 'Total cementitious materials content',
      value: cementitious,
      unit: 'kg/m³',
      emphasis: true,
    },
    m1Pct > 0 && {
      label: `${TABLE_9_MINERAL_DOSAGE[i.mineralType].label} at ${m1Pct} percent of total cementitious material`,
      expr: `${cementitious} × ${m1Pct}/100`,
      value: m1Mass,
      unit: 'kg/m³',
    },
    {
      label: 'Cement (OPC) content',
      expr: m1Pct > 0 ? `${cementitious} − ${m1Mass}` : undefined,
      value: cementMass,
      unit: 'kg/m³',
      emphasis: true,
    },
  ], `The water content is not taken from a table for self compacting concrete: clause 8.3 (b) gives a typical range and the figure is chosen to suit the slump flow class required, then confirmed by trial. It can be reduced further by increasing the dose of superplasticiser. Annex E-7.1 notes that a fly ash content of 25 to 50 percent is generally adopted for SCC.`);

  checks.push({
    id: 'waterRange',
    label: 'Water content within the typical range',
    ref: 'clause 8.3 (b)',
    pass: water >= wLo && water <= wHi,
    warnOnly: true,
    detail: `${water} kg/m³, typical ${wLo} to ${wHi}`,
  });
  checks.push({
    id: 'minCementitious',
    label: 'Minimum cementitious materials content',
    ref: 'IS 456, Table 5',
    pass: cementitious >= minCementitious,
    detail: `${cementitious} ≥ ${minCementitious} kg/m³`,
  });
  checks.push({
    id: 'maxCement',
    label: 'Maximum cement (OPC) content',
    ref: 'IS 456, clause 8.2.4.2',
    pass: cementMass <= Number(i.maxCement) + 1e-9,
    warnOnly: true,
    detail: `${r(cementMass, 2)} ≤ ${i.maxCement} kg/m³`,
    failNote:
      'Cement content in excess of 450 kg/m³ is not to be used unless special consideration has been given in design to the increased risk of cracking from drying shrinkage or early thermal effects, and to the increased risk of damage from alkali silica reaction.',
  });

  if (m1Pct > 0 && i.mineralType === 'flyAsh') {
    const [fLo, fHi] = SCC_RANGES.flyAshPct;
    checks.push({
      id: 'flyAshPct',
      label: 'Fly ash content typical for SCC',
      ref: 'Annex E-7.1',
      pass: m1Pct >= fLo && m1Pct <= fHi,
      warnOnly: true,
      detail: `${m1Pct} percent, typically ${fLo} to ${fHi}`,
    });
  }

  /* ---------------------------------------------------------------- *
   * f)  Admixture content
   * ---------------------------------------------------------------- */
  step('8.2 (f)', 'Selection of admixture content', [
    {
      label: `${CHEMICAL_ADMIXTURES[i.chemType].label} at ${chemDose} percent by mass of cementitious material`,
      expr: `${chemDose}/100 × ${cementitious}`,
      value: chemMass,
      unit: 'kg/m³',
      emphasis: true,
    },
    vmaDose > 0 && {
      label: `Viscosity modifying admixture at ${vmaDose} percent by mass of cementitious material`,
      expr: `${vmaDose}/100 × ${cementitious}`,
      value: vmaMass,
      unit: 'kg/m³',
    },
  ], 'Clause 8.3 (c): a polycarboxylate ether based high range water reducing admixture, reducing water by more than 30 percent, and sometimes a viscosity modifying admixture at an appropriate dosage. Annex E-10 notes that a small dose of a viscosity modifying agent, of the order of 0.2 percent by mass of cementitious material, may be needed to improve the cohesiveness of the mix.');

  /* ---------------------------------------------------------------- *
   * g)  Powder content and fine aggregate content   (clause 8.3 (a))
   * Powder is everything finer than 0.125 mm: the whole of the cement
   * and mineral admixture, plus the fine fraction of the sand. The
   * fine aggregate is sized to supply the balance.
   * ---------------------------------------------------------------- */
  const powder = Number(i.sccPowder);
  const faFinesPct = Number(i.sccFaFinesPct);
  const finesFromFA = r(powder - cementitious, 2);
  let faMass = 0;

  if (finesFromFA < 0) {
    errors.push(
      `The cementitious content of ${cementitious} kg/m³ already exceeds the powder content of ${powder} kg/m³, so the fine aggregate cannot contribute any of the powder. Raise the powder content or lower the cementitious content.`
    );
  } else if (!(faFinesPct > 0)) {
    errors.push(
      'The fine aggregate must have a measured fraction finer than 0.125 mm for the powder balance of clause 8.3 (a) to be solved. Enter that percentage from the sieve analysis of the sand.'
    );
  } else {
    faMass = Math.round(finesFromFA / (faFinesPct / 100));
  }

  const [pLo, pHi] = SCC_RANGES.powder;
  step('8.2 (g), 8.3 (a)', 'Selection of powder content and fine aggregate content', [
    {
      label: 'Powder content selected, all material finer than 0.125 mm',
      expr: `clause 8.3 (a) gives a preferred range of ${pLo} to ${pHi} kg/m³`,
      value: powder,
      unit: 'kg/m³',
      emphasis: true,
    },
    {
      label: 'Powder supplied by the cementitious material',
      expr: m1Pct > 0 ? `${cementMass} cement + ${m1Mass} ${TABLE_9_MINERAL_DOSAGE[i.mineralType].label.toLowerCase()}` : 'the whole of the cement',
      value: cementitious,
      unit: 'kg/m³',
    },
    {
      label: 'Powder to be contributed by the fine aggregate',
      expr: `${powder} − ${cementitious}`,
      value: finesFromFA,
      unit: 'kg/m³',
    },
    {
      label: `Fine aggregate, having ${faFinesPct} percent finer than 0.125 mm`,
      expr: `${finesFromFA} / ${r(faFinesPct / 100, 4)}`,
      value: faMass,
      unit: 'kg/m³',
      emphasis: true,
    },
  ], 'Clause 8.3 (a): a sufficient amount of fines, preferably 400 to 600 kg/m³, inclusive of suitable quantities of fine aggregate and mineral admixtures such as fly ash, may be used for flowability while ensuring compliance with the engineering properties, particularly shrinkage. Where a low viscosity class or a high segregation resistance class is required, the mix has to be more cohesive and so carry more fines.');

  checks.push({
    id: 'powderRange',
    label: 'Powder content within the preferred range',
    ref: 'clause 8.3 (a)',
    pass: powder >= pLo && powder <= pHi,
    warnOnly: true,
    detail: `${powder} kg/m³, preferred ${pLo} to ${pHi}`,
  });

  /* ---------------------------------------------------------------- *
   * h)  Coarse aggregate content, by subtraction
   * ---------------------------------------------------------------- */
  const vCement = absVolume(cementMass, Number(i.cementSG));
  const vM1 = m1Mass > 0 ? absVolume(m1Mass, Number(i.mineralSG)) : 0;
  const vWater = absVolume(water, 1);
  const vChem = chemMass > 0 ? absVolume(chemMass, Number(i.chemSG)) : 0;
  const vVma = vmaMass > 0 ? absVolume(vmaMass, Number(i.chemSG)) : 0;
  const vFA = faMass > 0 ? absVolume(faMass, Number(i.faSG)) : 0;
  const known = vWater + vCement + vM1 + vChem + vVma + vFA;
  const vCAexact = 1 - airVol - known;
  const vCA = Number(i.aggVolDp) > 0 ? r(vCAexact, Number(i.aggVolDp)) : vCAexact;
  const caMass = Math.round(vCA * Number(i.caSG) * 1000);

  if (vCAexact <= 0 && errors.length === 0) {
    errors.push(
      'The paste, fine aggregate and air volumes already fill the cubic metre, leaving nothing for coarse aggregate. Lower the powder content, the water content or the fine aggregate fines percentage.'
    );
  }

  step('8.2 (h)', 'Selection of coarse aggregate content', [
    { label: 'Total volume', value: 1, unit: 'm³' },
    { label: 'Volume of entrapped air', value: r(airVol, 4), unit: 'm³' },
    { label: 'Volume of water', expr: `${water} / (1 × 1000)`, value: r(vWater, 5), unit: 'm³' },
    { label: 'Volume of cement', expr: `${cementMass} / (${i.cementSG} × 1000)`, value: r(vCement, 5), unit: 'm³' },
    m1Mass > 0 && {
      label: `Volume of ${TABLE_9_MINERAL_DOSAGE[i.mineralType].label.toLowerCase()}`,
      expr: `${m1Mass} / (${i.mineralSG} × 1000)`,
      value: r(vM1, 5),
      unit: 'm³',
    },
    chemMass > 0 && {
      label: 'Volume of chemical admixture',
      expr: `${chemMass} / (${i.chemSG} × 1000)`,
      value: r(vChem, 5),
      unit: 'm³',
    },
    vmaMass > 0 && {
      label: 'Volume of viscosity modifying admixture',
      expr: `${vmaMass} / (${i.chemSG} × 1000)`,
      value: r(vVma, 5),
      unit: 'm³',
    },
    { label: 'Volume of fine aggregate', expr: `${faMass} / (${i.faSG} × 1000)`, value: r(vFA, 5), unit: 'm³' },
    {
      label: 'Volume of coarse aggregate',
      expr: `(1 − ${r(airVol, 4)}) − (${r(known, 5)})`,
      value: vCA,
      unit: 'm³',
      emphasis: true,
    },
    {
      label: 'Mass of coarse aggregate',
      expr: `${vCA} × ${i.caSG} × 1000`,
      value: caMass,
      unit: 'kg/m³',
      emphasis: true,
    },
  ], 'Unlike Section 2, the coarse aggregate of a self compacting mix is not read from a table against the grading zone of the sand. Clause 8.1 (a) calls for a lower coarse aggregate content, and once the paste and the fine aggregate have been fixed by the powder requirement, what remains of the cubic metre is the coarse aggregate.');

  /* ---------------------------------------------------------------- *
   * j)  Volume of powder and the water to powder ratio
   *     (clause 8.1, Note)
   * ---------------------------------------------------------------- */
  const vFaFines = finesFromFA > 0 ? absVolume(finesFromFA, Number(i.faSG)) : 0;
  const vPowder = vCement + vM1 + vFaFines;
  const wpRatio = vPowder > 0 ? vWater / vPowder : 0;
  const [rLo, rHi] = SCC_RANGES.waterPowderRatio;

  step('8.2 (j), 8.1', 'Volume of powder content and water to powder ratio', [
    { label: 'Volume of cement', value: r(vCement, 5), unit: 'm³' },
    m1Mass > 0 && {
      label: `Volume of ${TABLE_9_MINERAL_DOSAGE[i.mineralType].label.toLowerCase()}`,
      value: r(vM1, 5),
      unit: 'm³',
    },
    {
      label: 'Volume of the fine aggregate fraction finer than 0.125 mm',
      expr: `${finesFromFA} / (${i.faSG} × 1000)`,
      value: r(vFaFines, 5),
      unit: 'm³',
    },
    { label: 'Volume of powder content', value: r(vPowder, 5), unit: 'm³', emphasis: true },
    {
      label: 'Ratio of water to powder, by volume',
      expr: `${r(vWater, 4)} / ${r(vPowder, 4)}`,
      value: r(wpRatio, 3),
      emphasis: true,
    },
    {
      label: 'Required range',
      value: `${rLo.toFixed(2)} to ${rHi.toFixed(2)}`,
      kind: 'text',
    },
  ], `Clause 8.1, Note: powder means material finer than 0.125 mm, taken from the cement, the mineral admixture and the aggregate, and the water to powder ratio shall be 0.85 to 1.10 by volume. Where the ratio falls below 0.85 the fine aggregate content is reduced to raise it; where it exceeds 1.10 the fine aggregate content is increased to lower it. In either case every value is recalculated.`);

  checks.push({
    id: 'waterPowder',
    label: 'Water to powder ratio by volume',
    ref: 'clause 8.1, Note',
    pass: wpRatio >= rLo && wpRatio <= rHi,
    detail: `${r(wpRatio, 3)}, required ${rLo.toFixed(2)} to ${rHi.toFixed(2)}`,
  });

  if (wpRatio < rLo) {
    warnings.push(
      `The water to powder ratio of ${r(wpRatio, 3)} is below the 0.85 required by the Note to clause 8.1. Reduce the fine aggregate content, which raises the ratio, and recalculate.`
    );
  } else if (wpRatio > rHi) {
    warnings.push(
      `The water to powder ratio of ${r(wpRatio, 3)} exceeds the 1.10 allowed by the Note to clause 8.1. Increase the fine aggregate content, which lowers the ratio, and recalculate.`
    );
  }

  /* Fine aggregate as a share of the total aggregate, clause 8.3 (a) */
  const totalAgg = faMass + caMass;
  const faPctOfAgg = totalAgg > 0 ? (faMass / totalAgg) * 100 : 0;
  const [aLo, aHi] = SCC_RANGES.fineAggregatePct;
  checks.push({
    id: 'faShare',
    label: 'Fine aggregate as a share of total aggregate',
    ref: 'clause 8.3 (a)',
    pass: faPctOfAgg >= aLo && faPctOfAgg <= aHi,
    warnOnly: true,
    detail: `${r(faPctOfAgg, 1)} percent by mass, typically ${aLo} to ${aHi}`,
  });

  /* ---------------------------------------------------------------- *
   * Mix proportions, moisture correction and the mix ratio
   * ---------------------------------------------------------------- */
  const ssd = {
    cement: cementMass,
    mineral1: m1Mass,
    mineral2: 0,
    cementitious,
    water,
    fa: faMass,
    ca: caMass,
    chem: chemMass,
    vma: vmaMass,
    wc: r(wcm, 4),
  };

  const mc = moistureCorrection(i, water, caMass, faMass, ssd);
  const field = mc.field;
  if (mc.warning) warnings.push(mc.warning);
  if (mc.lines.length) step(mc.clause, mc.title, mc.lines, mc.note);

  const ratio = {
    cement: 1,
    fa: r(faMass / cementitious, 2),
    ca: r(caMass / cementitious, 2),
    water: r(water / cementitious, 3),
    label: `1 : ${r(faMass / cementitious, 2)} : ${r(caMass / cementitious, 2)}`,
    basis: m1Pct > 0 ? 'total cementitious material' : 'cement',
  };

  /* Trial mixes, clause 8.2 (m) to (p) and Annex E-11 */
  const trials = [3, 4].map((n) => {
    const factor = n === 3 ? 0.9 : 1.1;
    const trialWC = r(wc * factor, 4);
    const trialCementitious = roundCem(water / trialWC);
    const tm1 = r(trialCementitious * (m1Pct / 100), 2);
    const tFines = r(powder - trialCementitious, 2);
    const tFa = tFines > 0 && faFinesPct > 0 ? Math.round(tFines / (faFinesPct / 100)) : 0;
    const tChem = r(trialCementitious * (chemDose / 100), 3);
    const tKnown =
      absVolume(trialCementitious - tm1, Number(i.cementSG)) +
      (tm1 > 0 ? absVolume(tm1, Number(i.mineralSG)) : 0) +
      absVolume(water, 1) +
      (tChem > 0 ? absVolume(tChem, Number(i.chemSG)) : 0) +
      (tFa > 0 ? absVolume(tFa, Number(i.faSG)) : 0);
    const tvCA = r(1 - airVol - tKnown, Number(i.aggVolDp) > 0 ? Number(i.aggVolDp) : 5);
    return {
      n,
      label: `Trial ${n} — w/c varied by ${n === 3 ? '−' : '+'}10 percent`,
      wc: trialWC,
      cement: r(trialCementitious - tm1, 2),
      mineral1: tm1,
      mineral2: 0,
      cementitious: trialCementitious,
      water,
      chem: tChem,
      ca: Math.round(tvCA * Number(i.caSG) * 1000),
      fa: tFa,
    };
  });

  const segments = [
    { key: 'ca', label: 'Coarse aggregate', volume: vCA, mass: caMass },
    { key: 'fa', label: 'Fine aggregate', volume: vFA, mass: faMass },
    { key: 'water', label: 'Water', volume: vWater, mass: water },
    { key: 'cement', label: 'Cement', volume: vCement, mass: cementMass },
    m1Mass > 0 && {
      key: i.mineralType,
      label: TABLE_9_MINERAL_DOSAGE[i.mineralType].label,
      volume: vM1,
      mass: m1Mass,
    },
    chemMass > 0 && { key: 'chem', label: 'Chemical admixture', volume: vChem + vVma, mass: chemMass + vmaMass },
    { key: 'air', label: 'Entrapped air', volume: airVol, mass: 0 },
  ].filter(Boolean);

  const density = cementMass + m1Mass + water + faMass + caMass + chemMass + vmaMass;

  return {
    input: i,
    ok: errors.length === 0,
    errors,
    warnings,
    checks,
    section: 'scc',
    curve,
    targetStrength: r(targetStrength, 2),
    targetStrengthCubes: r(targetStrength, 2),
    massUplift: 0,
    mortar: null,
    targetStrengthParts: { S, X, byS: r(byS, 2), byX: r(byX, 2) },
    airPct,
    wc: r(wc, 4),
    wcSelected: r(wcSelected, 4),
    wcm: r(wcm, 4),
    wcGovernedBy,
    maxWC,
    minCementitious,
    water,
    cementitious,
    usesMineral: m1Pct > 0,
    ssd,
    field,
    ratio,
    trials,
    segments,
    volumes: { vCement, vM1, vM2: 0, vWater, vChem: vChem + vVma, vAgg: vCA + vFA, vCA, vFA, air: airVol },
    caVolFraction: vCA + vFA > 0 ? r(vCA / (vCA + vFA), 3) : 0,
    faVolFraction: vCA + vFA > 0 ? r(vFA / (vCA + vFA), 3) : 0,
    density: Math.round(density),
    steps,
    /* self compacting specific */
    scc: {
      powder,
      finesFromFA,
      vPowder: r(vPowder, 5),
      waterPowderRatio: r(wpRatio, 3),
      faPctOfAgg: r(faPctOfAgg, 1),
      vmaMass,
      classes: { sf, vis, sr, lBox: Number(i.lBoxRatio) },
    },
  };
}
