/**
 * IS 10262 : 2019  —  mix proportioning engine.
 *
 * designMix(input) walks the procedure of the standard in order and
 * returns both the numeric result and a step list carrying the clause,
 * the substituted expression and the value for every line, so that the
 * output can be checked by hand against the standard.
 *
 * Section 2  clauses 4.2, 5.1 to 5.7   grades M 10 to M 60
 * Section 3  clauses 4.2, 6.2.1 to 6.2.8   grades M 65 to M 100
 */

import { moistureCorrection } from './moisture.js';
import {
  valueOfX,
  assumedSD,
  TABLE_3_AIR,
  TABLE_4_WATER,
  TABLE_5_CA_VOLUME,
  TABLE_5_REFERENCE_WC,
  TABLE_6_AIR,
  TABLE_7_WATER,
  TABLE_8_WCM,
  TABLE_9_MINERAL_DOSAGE,
  TABLE_10_CA_VOLUME,
  TABLE_10_REFERENCE_WCM,
  CA_SHAPE_WATER_ADJ,
  FIG_1_WC_AXIS,
  FIG_1_CURVES,
  FIG_1_CURVE_NOTES,
  CEMENT_TYPES,
  curveForCement,
  IS456_TABLE_5,
  IS456_TABLE_6_CEMENT_ADJ,
  IS456_MAX_CEMENT,
  IS456_TABLE_3_EXPOSURE,
  CHEMICAL_ADMIXTURES,
  PLACING_METHODS,
  TABLE_11_AIR,
  TABLE_12_WATER,
  TABLE_13_CA_VOLUME,
  TABLE_15_MORTAR,
  MASS_TARGET_UPLIFT,
  MASS_ROUNDED_WATER_ADJ,
  MASS_AIR_ENTRAINED_WATER_ADJ,
  SCC_RANGES,
  SCC_SLUMP_FLOW,
  SCC_VISCOSITY,
  SCC_SEGREGATION,
  SCC_LBOX_MIN_RATIO,
} from './tables.js';

/* ================================================================== *
 * Numeric helpers
 * ================================================================== */

const r = (v, dp = 2) => {
  const f = 10 ** dp;
  return Math.round((v + Number.EPSILON) * f) / f;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Absolute volume, m3, of a mass in kg with the given specific gravity. */
export const absVolume = (mass, sg) => mass / (sg * 1000);

/* ================================================================== *
 * Figure 1  —  free water-cement ratio from target strength
 * ================================================================== */

/** Strength in N/mm2 on a Figure 1 curve at a given free w/c. */
export function fig1Strength(curve, wc) {
  const ys = FIG_1_CURVES[curve];
  const xs = FIG_1_WC_AXIS;
  if (wc <= xs[0]) return ys[0];
  if (wc >= xs[xs.length - 1]) return ys[ys.length - 1];
  const i = Math.floor((wc - xs[0]) / 0.01);
  const t = (wc - xs[i]) / 0.01;
  return ys[i] + t * (ys[i + 1] - ys[i]);
}

/**
 * Free w/c read off a Figure 1 curve for a target strength.
 * The curves fall monotonically, so this is an inverse interpolation.
 * Returns { wc, clamped } where clamped names the bound that was hit.
 */
export function fig1WaterCementRatio(curve, targetStrength) {
  const ys = FIG_1_CURVES[curve];
  const xs = FIG_1_WC_AXIS;
  if (targetStrength >= ys[0]) return { wc: xs[0], clamped: 'high' };
  if (targetStrength <= ys[ys.length - 1])
    return { wc: xs[xs.length - 1], clamped: 'low' };
  for (let i = 0; i < ys.length - 1; i += 1) {
    if (targetStrength <= ys[i] && targetStrength >= ys[i + 1]) {
      const t = (ys[i] - targetStrength) / (ys[i] - ys[i + 1]);
      return { wc: xs[i] + t * 0.01, clamped: null };
    }
  }
  return { wc: xs[xs.length - 1], clamped: 'low' };
}

/* ================================================================== *
 * Table 8  —  w/cm for high strength concrete
 * ================================================================== */

export function table8Wcm(targetStrength, msa) {
  const rows = TABLE_8_WCM;
  const key = String(msa);
  if (targetStrength <= rows[0].fck)
    return { wcm: rows[0][key], clamped: 'low' };
  const last = rows[rows.length - 1];
  if (targetStrength >= last.fck) return { wcm: last[key], clamped: 'high' };
  for (let i = 0; i < rows.length - 1; i += 1) {
    const a = rows[i];
    const b = rows[i + 1];
    if (targetStrength >= a.fck && targetStrength <= b.fck) {
      const t = (targetStrength - a.fck) / (b.fck - a.fck);
      return { wcm: a[key] + t * (b[key] - a[key]), clamped: null };
    }
  }
  return { wcm: last[key], clamped: 'high' };
}

/* ================================================================== *
 * Standard deviation from test results   (clause 4.2.1.2)
 * ================================================================== */

/** Clause 4.2.1.2.1 — a single group of consecutive test results. */
export function sdSingleGroup(values) {
  const n = values.length;
  if (n < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const ss = values.reduce((a, b) => a + (b - mean) ** 2, 0);
  return { n, mean, S: Math.sqrt(ss / (n - 1)) };
}

/** Clause 4.2.1.2.2 — two groups of the same grade combined. */
export function sdTwoGroups(g1, g2) {
  const a = sdSingleGroup(g1);
  const b = sdSingleGroup(g2);
  if (!a || !b) return null;
  const S = Math.sqrt(
    ((a.n - 1) * a.S ** 2 + (b.n - 1) * b.S ** 2) / (a.n + b.n - 2)
  );
  return { S, g1: a, g2: b, n: a.n + b.n };
}

/* ================================================================== *
 * Defaults
 * ================================================================== */

export function defaultInput(section = 'ordinary') {
  const high = section === 'highStrength';
  const mass = section === 'mass';
  const scc = section === 'scc';
  return {
    section,
    project: '',
    fck: high ? 70 : mass ? 15 : scc ? 30 : 40,
    concreteType: mass ? 'plain' : 'reinforced',
    cementType: high ? 'opc53' : mass || scc ? 'opc43' : 'ppc',
    cementStrengthKnown: false,
    cementStrength: 43,
    cementSG: high || mass || scc ? 3.15 : 2.88,
    exposure: mass ? 'moderate' : 'severe',
    msa: mass ? 150 : 20,
    slump: high ? 120 : mass ? 50 : 75,
    placing: high ? 'pumping' : 'chute',
    siteControl: 'good',
    sdMode: 'table',
    sdManual: 5,
    caShape: mass ? 'roundedGravel' : 'angular',
    faZone: 'II',
    faType: 'natural',
    caSG: 2.74,
    faSG: 2.65,
    caAbsorption: 0.5,
    faAbsorption: 1.0,
    aggCondition: 'ssd',
    caMoisture: 2.0,
    faMoisture: 5.0,
    chemType: high ? 'pce' : scc ? 'pce' : mass ? 'none' : 'superplasticizer',
    chemDosage: high ? 0.5 : scc ? 0.6 : 1.0,
    chemWaterReduction: high ? 30 : scc ? 0 : mass ? 0 : 23,
    chemSG: high ? 1.08 : scc ? 1.08 : 1.145,
    mineralType: high || scc || mass ? 'flyAsh' : 'none',
    mineralPct: high ? 15 : scc ? 35 : mass ? 25 : 30,
    mineralSG: 2.2,
    secondMineralType: high ? 'silicaFume' : 'none',
    secondMineralPct: high ? 5 : 0,
    secondMineralSG: 2.2,
    increaseCementitious: high || mass,
    increaseCementitiousPct: mass ? 15 : 10,
    wcMode: 'auto',
    wcManual: scc ? 0.43 : mass ? 0.6 : 0.36,
    wcRoundDp: 2,
    airMode: 'table',
    airManual: 1.0,
    caVolMode: 'table',
    caVolManual: 0.62,
    pumpableReduction: high ? 0 : 0,
    maxCement: IS456_MAX_CEMENT,
    roundCementitious: 'up',
    aggVolDp: mass ? 4 : 3,
    caVolDp: 'auto',

    /* Section 5, mass concrete */
    airEntrained: false,

    /* Section 4, self compacting concrete */
    sccWater: 190,
    sccPowder: 520,
    sccFaFinesPct: 8,
    slumpFlowClass: 'SF3',
    viscosityClass: 'V1',
    segregationClass: 'SR1',
    lBoxRatio: 0.9,
    vmaDosage: 0,
  };
}

/* ================================================================== *
 * The engine
 * ================================================================== */

export function designMix(raw) {
  const i = { ...defaultInput(raw.section || 'ordinary'), ...raw };
  const high = i.section === 'highStrength';
  const mass = i.section === 'mass';
  const steps = [];
  const warnings = [];
  const errors = [];
  const checks = [];

  const step = (clause, title, lines, note) =>
    steps.push({ clause, title, lines: lines.filter(Boolean), note });

  /* Inputs the absolute volume method cannot work without. A cleared
   * field arrives as an empty string and must not pass as zero. */
  const requirePositive = (value, name) => {
    if (value === '' || !(Number(value) > 0))
      errors.push(`Enter the ${name}; it must be a number greater than zero.`);
  };
  requirePositive(i.cementSG, 'specific gravity of the cement');
  requirePositive(i.caSG, 'specific gravity of the coarse aggregate');
  requirePositive(i.faSG, 'specific gravity of the fine aggregate');
  if (i.mineralType !== 'none') requirePositive(i.mineralSG, 'specific gravity of the mineral admixture');
  if (i.secondMineralType !== 'none') requirePositive(i.secondMineralSG, 'specific gravity of the second mineral admixture');
  if (i.chemType !== 'none' && Number(i.chemDosage) > 0) requirePositive(i.chemSG, 'specific gravity of the chemical admixture');
  if (i.wcMode === 'manual') requirePositive(i.wcManual, 'water-cement ratio');
  if (i.sdMode === 'manual') requirePositive(i.sdManual, 'standard deviation');
  if (i.slump === '' || !(Number(i.slump) >= 0)) errors.push('Enter the workability as a slump in millimetres.');

  /* ---------------------------------------------------------------- *
   * 0  Stipulations recap
   * ---------------------------------------------------------------- */
  const cement = CEMENT_TYPES[i.cementType];
  const exposure = IS456_TABLE_3_EXPOSURE[i.exposure];
  const durability = IS456_TABLE_5[i.concreteType][i.exposure];

  step('4.1', 'Data for mix proportioning', [
    { label: 'Grade designation', value: `M ${i.fck}`, kind: 'text' },
    { label: 'Type of cement', value: `${cement.label}, ${cement.is}`, kind: 'text' },
    { label: 'Maximum nominal size of aggregate', value: i.msa, unit: 'mm' },
    { label: 'Exposure condition (IS 456, Table 3)', value: `${exposure.label}, ${i.concreteType === 'reinforced' ? 'reinforced' : 'plain'} concrete`, kind: 'text' },
    { label: 'Workability required at placing', value: i.slump, unit: 'mm slump' },
    { label: 'Method of placing', value: PLACING_METHODS[i.placing].label, kind: 'text' },
    { label: 'Degree of site control', value: i.siteControl === 'good' ? 'Good' : 'Fair', kind: 'text' },
    { label: 'Type of coarse aggregate', value: CA_SHAPE_WATER_ADJ[i.caShape].label, kind: 'text' },
    { label: 'Grading zone of fine aggregate (IS 383, Table 9)', value: `Zone ${i.faZone}`, kind: 'text' },
    { label: 'Chemical admixture', value: CHEMICAL_ADMIXTURES[i.chemType].label, kind: 'text' },
    i.mineralType !== 'none' && {
      label: 'Mineral admixture',
      value: `${TABLE_9_MINERAL_DOSAGE[i.mineralType].label}, ${TABLE_9_MINERAL_DOSAGE[i.mineralType].is}`,
      kind: 'text',
    },
    i.secondMineralType !== 'none' && {
      label: 'Second mineral admixture',
      value: `${TABLE_9_MINERAL_DOSAGE[i.secondMineralType].label}, ${TABLE_9_MINERAL_DOSAGE[i.secondMineralType].is}`,
      kind: 'text',
    },
  ]);

  /* ---------------------------------------------------------------- *
   * 1  Target strength for mix proportioning   (clause 4.2)
   * ---------------------------------------------------------------- */
  const X = valueOfX(i.fck);
  const S = i.sdMode === 'manual' ? Number(i.sdManual) : assumedSD(i.fck, i.siteControl);
  const byS = i.fck + 1.65 * S;
  const byX = i.fck + X;
  const targetStrength = Math.max(byS, byX);

  const uplift = mass ? MASS_TARGET_UPLIFT[i.msa] ?? 0 : 0;
  const targetStrengthCubes = targetStrength * (1 + uplift / 100);

  step(mass ? '4.2, 9.2' : '4.2', 'Target strength for mix proportioning', [
    {
      label: 'Standard deviation, S',
      expr: i.sdMode === 'manual' ? 'established from test results, clause 4.2.1.2' : `Table 2, ${i.siteControl === 'fair' ? 'fair site control, Note 1 adds 1.0' : 'good site control'}`,
      value: S,
      unit: 'N/mm²',
    },
    { label: 'Factor X', expr: 'Table 1', value: X, unit: 'N/mm²' },
    {
      label: "f'ck = fck + 1.65 S",
      expr: `${i.fck} + 1.65 × ${S}`,
      value: r(byS, 2),
      unit: 'N/mm²',
    },
    {
      label: "f'ck = fck + X",
      expr: `${i.fck} + ${X}`,
      value: r(byX, 2),
      unit: 'N/mm²',
    },
    {
      label: 'Target mean compressive strength at 28 days',
      expr: 'the higher of the two',
      value: r(targetStrength, 2),
      unit: 'N/mm²',
      emphasis: true,
    },
    uplift > 0 && {
      label: `Increase of ${uplift} percent for the wet sieving effect`,
      expr: `${r(targetStrength, 2)} × ${(1 + uplift / 100).toFixed(2)}, for ${i.msa} mm nominal maximum size`,
      value: r(targetStrengthCubes, 2),
      unit: 'N/mm²',
      emphasis: true,
    },
  ], mass
    ? `The margin over characteristic strength is the greater of 1.65 S and X. Clause 9.2 then raises the target by ${uplift || 0} percent to account for the higher strength measured after wet sieving the concrete through a 40 mm sieve to cast 150 mm cubes. That increase applies to the cube test result only: clause 9.5 selects the water-cement ratio from the target strength of ${r(targetStrength, 2)} N/mm² without it.`
    : 'The margin over characteristic strength is the greater of 1.65 S and X, so that not more than the specified proportion of test results falls below fck.');

  if (high && i.fck > 80) {
    warnings.push(
      'Table 2 of the standard tabulates assumed standard deviation only up to M 80. Note 2 requires the standard deviation for M 65 and above to be established by actual trials on assumed proportions before the mix is finalised.'
    );
  }

  /* ---------------------------------------------------------------- *
   * 2  Approximate air content   (clause 5.2 / 6.2.3)
   * ---------------------------------------------------------------- */
  const airTable = high ? TABLE_6_AIR : mass ? TABLE_11_AIR : TABLE_3_AIR;
  const airTableNo = high ? 6 : mass ? 11 : 3;
  const airPct = i.airMode === 'manual' ? Number(i.airManual) : airTable[i.msa];
  const airVol = airPct / 100;

  step(high ? '6.2.3' : mass ? '9.3' : '5.2', 'Approximate air content', [
    {
      label: 'Entrapped air in normal (non air entrained) concrete',
      expr: i.airMode === 'manual' ? 'site data, at least 5 results' : `Table ${airTableNo}, for ${i.msa} mm nominal maximum size`,
      value: airPct,
      unit: '% of concrete volume',
    },
    { label: 'Volume of entrapped air', expr: `${airPct} / 100`, value: r(airVol, 4), unit: 'm³' },
  ]);

  /* ---------------------------------------------------------------- *
   * 3  Free water-cement / water-cementitious ratio
   *    (clause 5.1 with Figure 1, or clause 6.2.5 with Table 8)
   * ---------------------------------------------------------------- */
  const curve = curveForCement(i.cementType, i.cementStrengthKnown ? Number(i.cementStrength) : null);
  let wcSelected;
  let wcLines = [];
  let wcSource;

  if (high) {
    const t8 = table8Wcm(targetStrength, i.msa);
    wcSelected = i.wcMode === 'manual' ? Number(i.wcManual) : r(t8.wcm, Number(i.wcRoundDp));
    wcSource = 'Table 8';
    wcLines = [
      {
        label: 'w/cm for the target strength',
        expr: i.wcMode === 'manual' ? 'entered' : `Table 8, interpolated at f'ck = ${r(targetStrength, 2)} N/mm² for ${i.msa} mm msa`,
        value: wcSelected,
      },
    ];
    if (t8.clamped === 'high')
      warnings.push("Target strength is above the last row of Table 8 (100 N/mm²); the w/cm of that row has been used and must be confirmed by trials.");
    if (t8.clamped === 'low' && i.wcMode === 'auto')
      warnings.push("Target strength is below the first row of Table 8 (70 N/mm²); the w/cm of that row has been used.");
  } else {
    const f1 = fig1WaterCementRatio(curve, targetStrength);
    const exact = f1.wc;
    wcSelected = i.wcMode === 'manual' ? Number(i.wcManual) : r(exact, Number(i.wcRoundDp));
    wcSource = 'Figure 1';
    wcLines = [
      { label: 'Figure 1 curve', value: `Curve ${curve} — ${FIG_1_CURVE_NOTES[curve]}`, kind: 'text' },
      {
        label: 'Free water-cement ratio read from the curve',
        expr: `at f'ck = ${r(targetStrength, 2)} N/mm²`,
        value: r(exact, 4),
      },
      {
        label: 'Adopted free water-cement ratio',
        expr: i.wcMode === 'manual' ? 'entered by the user' : `rounded to ${i.wcRoundDp} decimals`,
        value: wcSelected,
      },
    ];
    if (f1.clamped === 'high')
      warnings.push(`Target strength ${r(targetStrength, 2)} N/mm² lies above Curve ${curve} over the plotted range of Figure 1. The w/c has been clamped to 0.25; a higher strength cement, a mineral admixture or Section 3 of the standard is indicated.`);
    if (f1.clamped === 'low')
      warnings.push(`Target strength ${r(targetStrength, 2)} N/mm² lies below Curve ${curve} over the plotted range of Figure 1. The w/c has been clamped to 0.65 and the durability limit will govern.`);
  }

  /* Durability check on w/c — clause 5.1.1: adopt the lower of the two */
  const maxWC = durability.maxWC;
  const wcGovernedBy = wcSelected <= maxWC ? wcSource : 'IS 456, Table 5';
  const wc = Math.min(wcSelected, maxWC);

  wcLines.push({
    label: 'Maximum free water-cement ratio for durability',
    expr: `IS 456, Table 5, ${exposure.label} exposure, ${i.concreteType} concrete`,
    value: maxWC,
  });
  wcLines.push({
    label: 'Adopted free water-cement ratio',
    expr: `lower of the two, governed by ${wcGovernedBy}`,
    value: r(wc, 4),
    emphasis: true,
  });

  step(high ? '6.2.5' : '5.1', high ? 'Selection of water-cementitious materials ratio' : 'Selection of water-cement ratio', wcLines,
    high
      ? 'Table 8 is for concrete made with silica fume and a high range water reducing admixture. Where fly ash or GGBS are also used, clause 6.2.5 requires the cementitious content to be increased and the ratio recalculated on the total cementitious material.'
      : 'Clause 5.1: the relationship between strength and free water-cement ratio should preferably be established for the materials actually to be used; Figure 1 applies in the absence of such data. Clause 5.1.1: the value is checked against the durability limit and the lower of the two adopted.');

  checks.push({
    id: 'wc',
    label: 'Free water-cement ratio within the durability limit',
    ref: 'IS 456, Table 5',
    pass: wc <= maxWC + 1e-9,
    detail: `${r(wc, 3)} ≤ ${maxWC}`,
  });

  /* ---------------------------------------------------------------- *
   * 4  Water content   (clause 5.3 / 6.2.4)
   * ---------------------------------------------------------------- */
  const waterTable = high ? TABLE_7_WATER : mass ? TABLE_12_WATER : TABLE_4_WATER;
  const waterTableNo = high ? 7 : mass ? 12 : 4;
  const waterBase = waterTable[i.msa];
  /* Clause 9.4 states the reduction for mass concrete by aggregate size
   * rather than by the shape ladder of clause 5.3. */
  const shapeAdj = high
    ? 0
    : mass
    ? i.caShape === 'roundedGravel'
      ? MASS_ROUNDED_WATER_ADJ[i.msa] ?? 0
      : 0
    : CA_SHAPE_WATER_ADJ[i.caShape].kg;
  const airEntrainedAdj = mass && i.airEntrained ? MASS_AIR_ENTRAINED_WATER_ADJ : 0;
  const waterShaped = waterBase + shapeAdj + airEntrainedAdj;
  const slumpFactor = 1 + 0.03 * ((Number(i.slump) - 50) / 25);
  const waterSlump = waterShaped * slumpFactor;
  /* No admixture means no water reduction and no admixture mass, whatever
   * figures are left over in the dosage fields. */
  const noChem = i.chemType === 'none';
  const redPct = noChem ? 0 : Number(i.chemWaterReduction) || 0;
  const waterReduced = waterSlump * (1 - redPct / 100);
  const water = Math.round(waterReduced);

  step(high ? '6.2.4' : mass ? '9.4' : '5.3', 'Selection of water content', [
    {
      label: `Water content from Table ${waterTableNo}`,
      expr: `${i.msa} mm nominal maximum size, 50 mm slump, aggregate in SSD condition`,
      value: waterBase,
      unit: 'kg',
    },
    !high && shapeAdj !== 0 && {
      label: `Adjustment for ${CA_SHAPE_WATER_ADJ[i.caShape].label.toLowerCase()} aggregate${mass ? `, ${i.msa} mm nominal maximum size` : ''}`,
      expr: `${waterBase} ${shapeAdj > 0 ? '+' : '−'} ${Math.abs(shapeAdj)}`,
      value: waterBase + shapeAdj,
      unit: 'kg',
    },
    airEntrainedAdj !== 0 && {
      label: 'Adjustment for air entrained concrete',
      expr: `${waterBase + shapeAdj} − ${Math.abs(airEntrainedAdj)}, Table 12, Note 1`,
      value: waterShaped,
      unit: 'kg',
    },
    {
      label: `Adjustment for ${i.slump} mm slump, at 3 percent per 25 mm`,
      expr: `${r(waterShaped, 2)} × (1 ${slumpFactor >= 1 ? '+' : '−'} ${r(Math.abs(slumpFactor - 1) * 100, 2)}/100)`,
      value: r(waterSlump, 2),
      unit: 'kg',
    },
    redPct > 0 && {
      label: `Reduction of ${redPct} percent by ${CHEMICAL_ADMIXTURES[i.chemType].label.toLowerCase()}`,
      expr: `${r(waterSlump, 2)} × ${r(1 - redPct / 100, 4)}`,
      value: r(waterReduced, 2),
      unit: 'kg',
    },
    {
      label: 'Free water content adopted',
      expr: 'rounded to the nearest kg',
      value: water,
      unit: 'kg/m³',
      emphasis: true,
    },
  ], mass
    ? `Clause 9.4: the water content of Table 12 is for angular coarse aggregate at 50 mm slump. It may be reduced by about ${Math.abs(MASS_ROUNDED_WATER_ADJ[i.msa] ?? 0)} kg for rounded gravel of ${i.msa} mm nominal maximum size. Water reducing admixtures have been found effective in mass concrete mixes and usually reduce water by 5 to 10 percent at appropriate dosages.`
    : `Clause ${high ? '6.2.4' : '5.3'}: the water content of Table ${waterTableNo} corresponds to angular coarse aggregate at 50 mm slump. The reduction claimed for the chemical admixture must be established by trial data for the actual cement and admixture in use.`);

  const chemLimits = CHEMICAL_ADMIXTURES[i.chemType];
  if (redPct > chemLimits.reduction[1]) {
    warnings.push(
      `A water reduction of ${redPct} percent exceeds the range of ${chemLimits.reduction[0]} to ${chemLimits.reduction[1]} percent that Annex G-3 gives for a ${chemLimits.label.toLowerCase()}. Confirm it by trial.`
    );
  }

  /* ---------------------------------------------------------------- *
   * 5  Cement and cementitious materials content   (clause 5.4 / 6.2.6)
   * ---------------------------------------------------------------- */
  const roundCem = (v) => (i.roundCementitious === 'up' ? Math.ceil(v - 1e-9) : Math.round(v));

  const cementitiousBase = roundCem(water / wc);
  const usesMineral = i.mineralType !== 'none' || i.secondMineralType !== 'none';
  const increaseOn = usesMineral && i.increaseCementitious;
  const incPct = increaseOn ? Number(i.increaseCementitiousPct) || 0 : 0;
  let cementitious = increaseOn
    ? Math.round(cementitiousBase * (1 + incPct / 100))
    : cementitiousBase;

  /* Durability floor on cementitious content — IS 456, Table 5 with the
   * Table 6 adjustment for aggregate size other than 20 mm. */
  /* IS 456, Table 6 tabulates the adjustment up to 40 mm aggregate.
   * Annex F applies the 40 mm figure to 150 mm mass concrete. */
  const sizeAdj = IS456_TABLE_6_CEMENT_ADJ[i.msa] ?? (Number(i.msa) > 40 ? -30 : 0);
  const minCementitious = durability.minCement + sizeAdj;
  let bumpedToMinimum = false;
  if (cementitious < minCementitious) {
    cementitious = minCementitious;
    bumpedToMinimum = true;
  }

  const wcm = water / cementitious;

  /* Split between cement and mineral admixtures */
  const m1Pct = i.mineralType !== 'none' ? Number(i.mineralPct) || 0 : 0;
  const m2Pct = i.secondMineralType !== 'none' ? Number(i.secondMineralPct) || 0 : 0;
  const m1Mass = r(cementitious * (m1Pct / 100), 2);
  const m2Mass = r(cementitious * (m2Pct / 100), 2);
  const cementMass = r(cementitious - m1Mass - m2Mass, 2);

  const cemLines = [
    {
      label: high ? 'Cementitious materials content' : 'Cement content',
      expr: `${water} / ${r(wc, 4)}`,
      value: r(water / wc, 2),
      unit: 'kg/m³',
    },
    {
      label: 'Rounded',
      expr: i.roundCementitious === 'up' ? 'rounded up to the next kg' : 'rounded to the nearest kg',
      value: cementitiousBase,
      unit: 'kg/m³',
    },
  ];

  if (increaseOn) {
    cemLines.push({
      label: `Increase of ${incPct} percent for the mineral admixture`,
      expr: `${cementitiousBase} × ${r(1 + incPct / 100, 3)}`,
      value: Math.round(cementitiousBase * (1 + incPct / 100)),
      unit: 'kg/m³',
    });
  }
  if (bumpedToMinimum) {
    cemLines.push({
      label: 'Raised to the durability minimum',
      expr: `IS 456, Table 5${sizeAdj !== 0 ? ` with the Table 6 adjustment of ${sizeAdj > 0 ? '+' : ''}${sizeAdj} kg/m³ for ${i.msa} mm aggregate` : ''}`,
      value: minCementitious,
      unit: 'kg/m³',
    });
  }
  cemLines.push({
    label: 'Total cementitious materials content',
    value: cementitious,
    unit: 'kg/m³',
    emphasis: true,
  });
  if (usesMineral) {
    if (m1Pct > 0)
      cemLines.push({
        label: `${TABLE_9_MINERAL_DOSAGE[i.mineralType].label} at ${m1Pct} percent of total cementitious material`,
        expr: `${cementitious} × ${m1Pct}/100`,
        value: m1Mass,
        unit: 'kg/m³',
      });
    if (m2Pct > 0)
      cemLines.push({
        label: `${TABLE_9_MINERAL_DOSAGE[i.secondMineralType].label} at ${m2Pct} percent of total cementitious material`,
        expr: `${cementitious} × ${m2Pct}/100`,
        value: m2Mass,
        unit: 'kg/m³',
      });
    cemLines.push({
      label: 'Cement (OPC) content',
      expr: `${cementitious}${m1Pct > 0 ? ` − ${m1Mass}` : ''}${m2Pct > 0 ? ` − ${m2Mass}` : ''}`,
      value: cementMass,
      unit: 'kg/m³',
      emphasis: true,
    });
    cemLines.push({
      label: 'Free water-cementitious materials ratio',
      expr: `${water} / ${cementitious}`,
      value: r(wcm, 4),
      emphasis: true,
    });
  }

  step(high ? '6.2.6' : mass ? '9.6' : '5.4', high ? 'Calculation of cementitious material content' : 'Calculation of cement / cementitious materials content', cemLines,
    usesMineral
      ? `Clause ${high ? '6.2.6' : '5.4.1'}: where cement is part replaced by fly ash, GGBS, silica fume or another mineral admixture an increase in cementitious materials content may be warranted, particularly when fly ash is 20 percent or more. The standard allows a 10 percent increase for a preliminary trial, after which the water-cementitious materials ratio is recalculated on the increased content.`
      : 'The content is calculated from the free water-cement ratio and the water content, then checked against the durability minimum of IS 456.');

  /* Durability and dosage checks */
  checks.push({
    id: 'minCementitious',
    label: 'Minimum cementitious materials content',
    ref: `IS 456, Table 5${sizeAdj !== 0 ? ' and Table 6' : ''}`,
    pass: cementitious >= minCementitious,
    detail: `${cementitious} ≥ ${minCementitious} kg/m³`,
  });
  checks.push({
    id: 'maxCement',
    label: 'Maximum cement (OPC) content',
    ref: 'IS 456, clause 8.2.4.2',
    pass: cementMass <= Number(i.maxCement) + 1e-9,
    detail: `${r(cementMass, 2)} ≤ ${i.maxCement} kg/m³`,
    warnOnly: true,
    failNote:
      'Cement content in excess of 450 kg/m³ is not to be used unless special consideration has been given in design to the increased risk of cracking from drying shrinkage or early thermal effects, and to the increased risk of damage from alkali silica reaction.',
  });
  if (durability.minGrade && i.fck < durability.minGrade) {
    checks.push({
      id: 'minGrade',
      label: 'Minimum grade of concrete for the exposure condition',
      ref: 'IS 456, Table 5',
      pass: false,
      detail: `M ${i.fck} is below the minimum M ${durability.minGrade} for ${exposure.label} exposure`,
    });
  } else {
    checks.push({
      id: 'minGrade',
      label: 'Minimum grade of concrete for the exposure condition',
      ref: 'IS 456, Table 5',
      pass: true,
      detail: durability.minGrade ? `M ${i.fck} ≥ M ${durability.minGrade}` : 'No minimum grade specified',
    });
  }

  /* Table 9 dosage range check, high strength only */
  [[i.mineralType, m1Pct], [i.secondMineralType, m2Pct]].forEach(([type, pct]) => {
    if (type === 'none' || pct <= 0) return;
    const d = TABLE_9_MINERAL_DOSAGE[type];
    const within = pct >= d.min && pct <= d.max;
    checks.push({
      id: `dose-${type}`,
      label: `${d.label} dosage`,
      ref: high ? 'Table 9' : 'Table 9 (recommended for high strength mixes)',
      pass: within,
      warnOnly: !high,
      detail: `${pct} percent, recommended ${d.min} to ${d.max} percent`,
    });
  });

  /* ---------------------------------------------------------------- *
   * 6  Chemical admixture content
   * ---------------------------------------------------------------- */
  const chemDose = noChem ? 0 : Number(i.chemDosage) || 0;
  const chemMass = r(cementitious * (chemDose / 100), 3);

  /* ---------------------------------------------------------------- *
   * 7  Coarse aggregate proportion   (clause 5.5 / 6.2.7)
   * ---------------------------------------------------------------- */
  const caTable = high ? TABLE_10_CA_VOLUME : mass ? TABLE_13_CA_VOLUME : TABLE_5_CA_VOLUME;
  const caTableNo = high ? 10 : mass ? 13 : 5;
  const caRefWC = high ? TABLE_10_REFERENCE_WCM : TABLE_5_REFERENCE_WC;
  const zoneForTable = high && i.faZone === 'IV' ? 'III' : i.faZone;
  const caBase = i.caVolMode === 'manual' ? Number(i.caVolManual) : caTable[i.msa][zoneForTable];

  /* The ratio governing the adjustment is the one actually adopted for
   * the mix: w/cm where mineral admixtures are used, otherwise w/c. */
  const ratioForCA = usesMineral ? wcm : wc;
  const caAdjust = ((caRefWC - ratioForCA) / 0.05) * 0.01;
  const caAdjusted = caBase + caAdjust;

  const maxRed = high ? 5 : mass ? 0 : 10;
  const pumpRed = clamp(Number(i.pumpableReduction) || 0, 0, maxRed);
  const caAfterPump = caAdjusted * (1 - pumpRed / 100);

  const caDp = i.caVolDp === 'auto' ? (pumpRed > 0 ? 2 : 3) : Number(i.caVolDp);
  const vCA = r(caAfterPump, caDp);
  const vFA = r(1 - vCA, 4);

  step(high ? '6.2.7' : mass ? '9.7' : '5.5', 'Proportion of volume of coarse aggregate and fine aggregate', [
    {
      label: `Volume of coarse aggregate per unit volume of total aggregate, Table ${caTableNo}`,
      expr: i.caVolMode === 'manual' ? 'entered' : `${i.msa} mm nominal maximum size, fine aggregate Zone ${zoneForTable}, at w/c${usesMineral ? 'm' : ''} of ${caRefWC.toFixed(2)}`,
      value: caBase,
    },
    {
      label: `Adjustment for w/c${usesMineral ? 'm' : ''} of ${r(ratioForCA, 4)}`,
      expr: `(${caRefWC.toFixed(2)} − ${r(ratioForCA, 4)}) / 0.05 × 0.01 = ${caAdjust >= 0 ? '+' : '−'}${r(Math.abs(caAdjust), 4)}`,
      value: r(caAdjusted, 4),
    },
    pumpRed > 0 && {
      label: `Reduction of ${pumpRed} percent for ${PLACING_METHODS[i.placing].label.toLowerCase()}`,
      expr: `${r(caAdjusted, 4)} × ${r(1 - pumpRed / 100, 3)}`,
      value: r(caAfterPump, 4),
    },
    {
      label: 'Volume of coarse aggregate adopted',
      expr: `rounded to ${caDp} decimals`,
      value: vCA,
      emphasis: true,
    },
    {
      label: 'Volume of fine aggregate',
      expr: `1 − ${vCA}`,
      value: vFA,
      emphasis: true,
    },
  ], `Clause ${high ? '6.2.7' : mass ? '9.7' : '5.5.1'}: the tabulated volume is increased at the rate of 0.01 for every decrease of 0.05 in the ratio, and decreased at the same rate for every increase of 0.05.${
    maxRed > 0
      ? ` Clause ${high ? '6.2.7' : '5.5.2'}: for a more workable mix, placed by pump or worked around congested reinforcement, the coarse aggregate content may be reduced by up to ${maxRed} percent.`
      : ''
  }`);

  if (i.faZone === 'IV' && i.concreteType === 'reinforced') {
    warnings.push(
      'Table 5, Note 4: fine aggregate conforming to Grading Zone IV should not be used in reinforced concrete unless tests have been made to ascertain the suitability of the proposed mix proportions.'
    );
  }
  if ((high || mass) && i.faZone === 'IV' && high) {
    warnings.push('Table 10 does not cover Zone IV. Zone III values have been used; clause 6.1.3 prefers Zone I or Zone II for high strength concrete.');
  }
  if (i.faType !== 'natural') {
    warnings.push(
      `Table ${high ? 10 : 5}, Note 3: for fine aggregate from other than natural sources, such as ${i.faType === 'manufactured' ? 'manufactured sand' : 'crushed or mixed sand'}, a lesser fine aggregate content is normally needed and the coarse aggregate volume should be suitably increased. Adjust the coarse aggregate volume fraction by trial.`
    );
  }
  if (pumpRed === 0 && PLACING_METHODS[i.placing].caReduction > 0) {
    warnings.push(
      `The mix is to be placed by ${PLACING_METHODS[i.placing].label.toLowerCase()}. Clause ${high ? '6.2.7' : '5.5.2'} allows the coarse aggregate content to be reduced by up to ${maxRed} percent for such placement; no reduction has been applied.`
    );
  }

  /* ---------------------------------------------------------------- *
   * 8  Mix calculations — absolute volumes   (clause 5.7 / 6.2.8)
   * ---------------------------------------------------------------- */
  const vCement = absVolume(cementMass, Number(i.cementSG));
  const vM1 = m1Mass > 0 ? absVolume(m1Mass, Number(i.mineralSG)) : 0;
  const vM2 = m2Mass > 0 ? absVolume(m2Mass, Number(i.secondMineralSG)) : 0;
  const vWater = absVolume(water, 1);
  const vChem = chemMass > 0 ? absVolume(chemMass, Number(i.chemSG)) : 0;
  const vPaste = vCement + vM1 + vM2 + vWater + vChem;
  const vAggExact = 1 - airVol - vPaste;
  const vAgg = Number(i.aggVolDp) > 0 ? r(vAggExact, Number(i.aggVolDp)) : vAggExact;

  const caMass = Math.round(vAgg * vCA * Number(i.caSG) * 1000);
  const faMass = Math.round(vAgg * vFA * Number(i.faSG) * 1000);

  if (vAggExact <= 0) {
    errors.push(
      'The paste, water, admixture and air volumes already exceed one cubic metre, so no volume is left for aggregate. Check the specific gravities, the water content and the cementitious content.'
    );
  }

  step(high ? '6.2.8' : mass ? '9.8' : '5.7', 'Mix calculations, absolute volumes per cubic metre', [
    { label: 'Total volume', value: 1, unit: 'm³' },
    { label: 'Volume of entrapped air', value: r(airVol, 4), unit: 'm³' },
    {
      label: 'Volume of cement',
      expr: `${cementMass} / (${i.cementSG} × 1000)`,
      value: r(vCement, 5),
      unit: 'm³',
    },
    m1Mass > 0 && {
      label: `Volume of ${TABLE_9_MINERAL_DOSAGE[i.mineralType].label.toLowerCase()}`,
      expr: `${m1Mass} / (${i.mineralSG} × 1000)`,
      value: r(vM1, 5),
      unit: 'm³',
    },
    m2Mass > 0 && {
      label: `Volume of ${TABLE_9_MINERAL_DOSAGE[i.secondMineralType].label.toLowerCase()}`,
      expr: `${m2Mass} / (${i.secondMineralSG} × 1000)`,
      value: r(vM2, 5),
      unit: 'm³',
    },
    { label: 'Volume of water', expr: `${water} / (1 × 1000)`, value: r(vWater, 5), unit: 'm³' },
    chemMass > 0 && {
      label: 'Volume of chemical admixture',
      expr: `${chemMass} / (${i.chemSG} × 1000)`,
      value: r(vChem, 5),
      unit: 'm³',
    },
    {
      label: 'Volume of all in aggregate',
      expr: `(1 − ${r(airVol, 4)}) − (${r(vPaste, 5)})`,
      value: Number(i.aggVolDp) > 0 ? vAgg : r(vAgg, 5),
      unit: 'm³',
      emphasis: true,
    },
    {
      label: 'Mass of coarse aggregate',
      expr: `${vAgg} × ${vCA} × ${i.caSG} × 1000`,
      value: caMass,
      unit: 'kg/m³',
      emphasis: true,
    },
    {
      label: 'Mass of fine aggregate',
      expr: `${vAgg} × ${vFA} × ${i.faSG} × 1000`,
      value: faMass,
      unit: 'kg/m³',
      emphasis: true,
    },
  ], 'The coarse and fine aggregate contents are found by taking the absolute volume of cementitious materials, water and chemical admixture out of the unit volume less the entrapped air, then dividing the remainder in the coarse to fine ratio already determined and multiplying by the respective specific gravities.');

  /* ---------------------------------------------------------------- *
   * 8.1  Mortar content check for large aggregate   (clause 9.10)
   * Large aggregate mixes need a minimum absolute volume of mortar to
   * place and work properly. Table 15 gives the suggested volume.
   * ---------------------------------------------------------------- */
  let mortar = null;
  const vFAm3pre = vAgg * vFA;
  if (mass && TABLE_15_MORTAR[i.msa]) {
    const spec = TABLE_15_MORTAR[i.msa];
    const shape = i.caShape === 'roundedGravel' ? 'rounded' : 'crushed';
    const wanted = spec[shape];
    const mc = vCement + vM1 + vM2 + vWater + vChem + vFAm3pre + airVol;
    mortar = {
      value: r(mc, 4),
      target: wanted,
      tol: spec.tol,
      shape,
      within: Math.abs(mc - wanted) <= spec.tol + 1e-9,
    };

    step('9.10', 'Check on mortar content', [
      { label: 'Volume of cement', value: r(vCement, 5), unit: 'm³' },
      (vM1 + vM2) > 0 && {
        label: 'Volume of mineral admixture',
        value: r(vM1 + vM2, 5),
        unit: 'm³',
      },
      { label: 'Volume of water', value: r(vWater, 5), unit: 'm³' },
      vChem > 0 && { label: 'Volume of chemical admixture', value: r(vChem, 5), unit: 'm³' },
      { label: 'Volume of fine aggregate', expr: `${vAgg} × ${vFA}`, value: r(vFAm3pre, 5), unit: 'm³' },
      { label: 'Volume of entrapped air', value: r(airVol, 4), unit: 'm³' },
      {
        label: 'Mortar content, Mc',
        expr: 'sum of the absolute volumes above',
        value: r(mc, 4),
        unit: 'm³',
        emphasis: true,
      },
      {
        label: `Suggested mortar content, Table 15, ${i.msa} mm ${shape} aggregate`,
        value: `${wanted.toFixed(2)} ± ${spec.tol.toFixed(2)}`,
        kind: 'text',
      },
    ], 'Clause 9.10: experience has shown that 150 mm and 80 mm nominal maximum size mixtures need a minimum mortar content to place and work properly. Where the computed value falls outside the suggested range, the fine aggregate and the cementitious content are adjusted up or down for improved placeability and workability, and the mix recalculated.');

    checks.push({
      id: 'mortar',
      label: 'Mortar content for large aggregate',
      ref: 'Table 15, clause 9.10',
      pass: mortar.within,
      detail: `${r(mc, 3)} m³, suggested ${wanted.toFixed(2)} ± ${spec.tol.toFixed(2)}`,
    });

    if (!mortar.within) {
      warnings.push(
        `The mortar content of ${r(mc, 3)} m³ falls outside the ${(wanted - spec.tol).toFixed(2)} to ${(wanted + spec.tol).toFixed(2)} m³ suggested by Table 15 for ${i.msa} mm ${shape} aggregate. Clause 9.10 requires the fine aggregate and cementitious contents to be adjusted ${mc < wanted ? 'upwards' : 'downwards'} and the mix recalculated for placeability and workability.`
      );
    }
  }

  /* ---------------------------------------------------------------- *
   * 9  Mix proportions for trial number 1, aggregates in SSD
   * ---------------------------------------------------------------- */
  const ssd = {
    cement: cementMass,
    mineral1: m1Mass,
    mineral2: m2Mass,
    cementitious,
    water,
    fa: faMass,
    ca: caMass,
    chem: chemMass,
    wc: r(usesMineral ? wcm : wc, 4),
  };

  /* ---------------------------------------------------------------- *
   * 10  Correction for the field condition of the aggregate
   *     (Annex A-11 for dry, Annex B-11 for wet)
   * ---------------------------------------------------------------- */
  const mc = moistureCorrection(i, water, caMass, faMass, ssd);
  const field = mc.field;
  if (mc.warning) warnings.push(mc.warning);
  if (mc.lines.length) {
    step(mc.clause, mc.title, mc.lines, mc.note);
  }

  /* ---------------------------------------------------------------- *
   * 11  Mix ratio by mass
   * ---------------------------------------------------------------- */
  const ratio = {
    cement: 1,
    fa: r(faMass / cementitious, 2),
    ca: r(caMass / cementitious, 2),
    water: r(water / cementitious, 3),
    label: `1 : ${r(faMass / cementitious, 2)} : ${r(caMass / cementitious, 2)}`,
    basis: usesMineral ? 'total cementitious material' : 'cement',
  };

  /* ---------------------------------------------------------------- *
   * 12  Trial mixes   (clause 5.8 / 6.2.9)
   * ---------------------------------------------------------------- */
  const trials = [2, 3, 4].map((n) => {
    const factor = n === 2 ? 1 : n === 3 ? 0.9 : 1.1;
    const trialWC = r((usesMineral ? wcm : wc) * factor, 4);
    const trialCementitious = roundCem(water / trialWC);
    const tm1 = r(trialCementitious * (m1Pct / 100), 2);
    const tm2 = r(trialCementitious * (m2Pct / 100), 2);
    const tChem = r(trialCementitious * (chemDose / 100), 3);
    const tv =
      absVolume(trialCementitious - tm1 - tm2, Number(i.cementSG)) +
      (tm1 > 0 ? absVolume(tm1, Number(i.mineralSG)) : 0) +
      (tm2 > 0 ? absVolume(tm2, Number(i.secondMineralSG)) : 0) +
      absVolume(water, 1) +
      (tChem > 0 ? absVolume(tChem, Number(i.chemSG)) : 0);
    const tAggExact = 1 - airVol - tv;
    const tAgg = Number(i.aggVolDp) > 0 ? r(tAggExact, Number(i.aggVolDp)) : tAggExact;
    const tCAvol = r(
      clamp(caBase + ((caRefWC - trialWC) / 0.05) * 0.01, 0.3, 0.85) * (1 - pumpRed / 100),
      caDp
    );
    const tFAvol = r(1 - tCAvol, 4);
    return {
      n,
      label: n === 2 ? 'Trial 2 — water and admixture adjusted to the measured slump' : `Trial ${n} — w/c${usesMineral ? 'm' : ''} varied by ${n === 3 ? '−' : '+'}10 percent`,
      wc: trialWC,
      cement: r(trialCementitious - tm1 - tm2, 2),
      mineral1: tm1,
      mineral2: tm2,
      cementitious: trialCementitious,
      water,
      chem: tChem,
      ca: Math.round(tAgg * tCAvol * Number(i.caSG) * 1000),
      fa: Math.round(tAgg * tFAvol * Number(i.faSG) * 1000),
    };
  });

  /* ---------------------------------------------------------------- *
   * Volume breakdown for the unit cubic metre display
   * ---------------------------------------------------------------- */
  const vCAm3 = vAgg * vCA;
  const vFAm3 = vAgg * vFA;
  const segments = [
    { key: 'ca', label: 'Coarse aggregate', volume: vCAm3, mass: caMass },
    { key: 'fa', label: 'Fine aggregate', volume: vFAm3, mass: faMass },
    { key: 'water', label: 'Water', volume: vWater, mass: water },
    { key: 'cement', label: 'Cement', volume: vCement, mass: cementMass },
    m1Mass > 0 && {
      key: i.mineralType,
      label: TABLE_9_MINERAL_DOSAGE[i.mineralType].label,
      volume: vM1,
      mass: m1Mass,
    },
    m2Mass > 0 && {
      key: i.secondMineralType,
      label: TABLE_9_MINERAL_DOSAGE[i.secondMineralType].label,
      volume: vM2,
      mass: m2Mass,
    },
    chemMass > 0 && { key: 'chem', label: 'Chemical admixture', volume: vChem, mass: chemMass },
    { key: 'air', label: 'Entrapped air', volume: airVol, mass: 0 },
  ].filter(Boolean);

  const density =
    cementMass + m1Mass + m2Mass + water + faMass + caMass + chemMass;

  return {
    input: i,
    ok: errors.length === 0,
    errors,
    warnings,
    checks,
    section: i.section,
    curve,
    targetStrength: r(targetStrength, 2),
    targetStrengthCubes: r(targetStrengthCubes, 2),
    massUplift: uplift,
    mortar,
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
    usesMineral,
    ssd,
    field,
    ratio,
    trials,
    segments,
    volumes: { vCement, vM1, vM2, vWater, vChem, vAgg, vCA: vCAm3, vFA: vFAm3, air: airVol },
    caVolFraction: vCA,
    faVolFraction: vFA,
    density: Math.round(density),
    steps,
  };
}

/* ================================================================== *
 * Batch quantities
 * ================================================================== */

export function batchQuantities(result, volume, useField = true) {
  const src = useField ? result.field : result.ssd;
  const v = Number(volume) || 0;
  const q = (perM3) => r((perM3 || 0) * v, 2);
  const i = result.input;
  const rows = [
    { label: 'Cement', perM3: src.cement, qty: q(src.cement), unit: 'kg' },
    src.mineral1 > 0 && {
      label: TABLE_9_MINERAL_DOSAGE[i.mineralType]?.label ?? 'Mineral admixture',
      perM3: src.mineral1,
      qty: q(src.mineral1),
      unit: 'kg',
    },
    src.mineral2 > 0 && {
      label: TABLE_9_MINERAL_DOSAGE[i.secondMineralType]?.label ?? 'Mineral admixture 2',
      perM3: src.mineral2,
      qty: q(src.mineral2),
      unit: 'kg',
    },
    {
      label: useField && i.aggCondition !== 'ssd' ? 'Water to be added' : 'Water',
      perM3: src.water,
      qty: q(src.water),
      unit: 'kg',
    },
    {
      label: `Fine aggregate${useField && i.aggCondition !== 'ssd' ? ` (${i.aggCondition})` : ' (SSD)'}`,
      perM3: src.fa,
      qty: q(src.fa),
      unit: 'kg',
    },
    {
      label: `Coarse aggregate${useField && i.aggCondition !== 'ssd' ? ` (${i.aggCondition})` : ' (SSD)'}`,
      perM3: src.ca,
      qty: q(src.ca),
      unit: 'kg',
    },
    src.chem > 0 && {
      label: 'Chemical admixture',
      perM3: src.chem,
      qty: q(src.chem),
      unit: 'kg',
    },
    src.vma > 0 && {
      label: 'Viscosity modifying admixture',
      perM3: src.vma,
      qty: q(src.vma),
      unit: 'kg',
    },
  ].filter(Boolean);

  return {
    volume: v,
    rows,
    bags: r(q(src.cement) / 50, 2),
    totalMass: r(rows.reduce((a, b) => a + b.qty, 0), 1),
  };
}
