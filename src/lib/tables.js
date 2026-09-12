/**
 * IS 10262 : 2019  —  Concrete Mix Proportioning, Guidelines
 * Reference data: every table and figure used by the calculation engine.
 *
 * Section 2  Ordinary and standard grades   (M10 - M60)
 * Section 3  High strength grades           (M65 - M100)
 *
 * Durability limits are from IS 456 : 2000, Tables 3, 5 and 6.
 */

/* ------------------------------------------------------------------ *
 * Grades
 * ------------------------------------------------------------------ */

export const ORDINARY_GRADES = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
export const HIGH_STRENGTH_GRADES = [65, 70, 75, 80, 85, 90, 95, 100];

export const gradeLabel = (fck) => `M ${fck}`;

/* ------------------------------------------------------------------ *
 * Table 1  Value of X   (clause 4.2)
 * Factor based on grade of concrete, added to fck as the second
 * lower bound on target mean strength.
 * ------------------------------------------------------------------ */

export const TABLE_1_X = [
  { max: 15, X: 5.0, grades: 'M 10 - M 15' },
  { max: 25, X: 5.5, grades: 'M 20 - M 25' },
  { max: 60, X: 6.5, grades: 'M 30 - M 60' },
  { max: Infinity, X: 8.0, grades: 'M 65 and above' },
];

export function valueOfX(fck) {
  return TABLE_1_X.find((r) => fck <= r.max).X;
}

/* ------------------------------------------------------------------ *
 * Table 2  Assumed standard deviation   (clause 4.2.1.3)
 * Values correspond to a GOOD degree of site control. Note 1: where
 * there are deviations, site control is 'fair' and the value is
 * increased by 1 N/mm2.
 * ------------------------------------------------------------------ */

export const TABLE_2_SD = [
  { max: 15, S: 3.5, grades: 'M 10 - M 15' },
  { max: 25, S: 4.0, grades: 'M 20 - M 25' },
  { max: 60, S: 5.0, grades: 'M 30 - M 60' },
  { max: 80, S: 6.0, grades: 'M 65 - M 80' },
  { max: Infinity, S: 6.0, grades: 'above M 80 (establish by trials, Note 2)' },
];

export function assumedSD(fck, siteControl = 'good') {
  const row = TABLE_2_SD.find((r) => fck <= r.max);
  return siteControl === 'fair' ? row.S + 1.0 : row.S;
}

/* ------------------------------------------------------------------ *
 * Table 3  Approximate air content, ordinary and standard grades
 *          (clause 5.2)   — entrapped air, percent of concrete volume
 * ------------------------------------------------------------------ */

export const TABLE_3_AIR = { 10: 1.5, 20: 1.0, 40: 0.8 };

/* ------------------------------------------------------------------ *
 * Table 4  Water content per cubic metre, ordinary and standard
 *          grades   (clause 5.3)
 * For angular coarse aggregate at 50 mm slump, aggregate in the
 * saturated surface dry condition.
 * ------------------------------------------------------------------ */

export const TABLE_4_WATER = { 10: 208, 20: 186, 40: 165 };

/* Clause 5.3: reduction in the Table 4 estimate for aggregate shape */
export const CA_SHAPE_WATER_ADJ = {
  angular: { kg: 0, label: 'Crushed angular' },
  subangular: { kg: -10, label: 'Sub-angular' },
  gravelCrushed: { kg: -15, label: 'Gravel with some crushed particles' },
  roundedGravel: { kg: -20, label: 'Rounded gravel' },
};

/* ------------------------------------------------------------------ *
 * Table 5  Volume of coarse aggregate per unit volume of total
 *          aggregate, at w/c or w/cm = 0.50   (clause 5.5)
 * ------------------------------------------------------------------ */

export const TABLE_5_CA_VOLUME = {
  10: { I: 0.48, II: 0.50, III: 0.52, IV: 0.54 },
  20: { I: 0.60, II: 0.62, III: 0.64, IV: 0.66 },
  40: { I: 0.69, II: 0.71, III: 0.72, IV: 0.73 },
};
export const TABLE_5_REFERENCE_WC = 0.50;

/* ------------------------------------------------------------------ *
 * Table 6  Approximate air content, high strength grades
 *          (clause 6.2.3)
 * ------------------------------------------------------------------ */

export const TABLE_6_AIR = { 10: 1.0, 12.5: 0.8, 20: 0.5 };

/* ------------------------------------------------------------------ *
 * Table 7  Water content per cubic metre, high strength grades
 *          (clause 6.2.4) — maximum water content, 50 mm slump,
 *          without chemical admixture
 * ------------------------------------------------------------------ */

export const TABLE_7_WATER = { 10: 200, 12.5: 195, 20: 186 };

/* ------------------------------------------------------------------ *
 * Table 8  Recommended w/cm for high strength concrete made with
 *          HRWRA   (clause 6.2.5)
 * Rows: target compressive strength at 28 days, N/mm2.
 * Columns: nominal maximum size of aggregate.
 * Note: values are for 28 day cement strength of 53 MPa and above.
 * ------------------------------------------------------------------ */

export const TABLE_8_WCM = [
  { fck: 70, 10: 0.36, 12.5: 0.35, 20: 0.33 },
  { fck: 75, 10: 0.34, 12.5: 0.33, 20: 0.31 },
  { fck: 80, 10: 0.32, 12.5: 0.31, 20: 0.29 },
  { fck: 85, 10: 0.30, 12.5: 0.29, 20: 0.27 },
  { fck: 90, 10: 0.28, 12.5: 0.27, 20: 0.26 },
  { fck: 100, 10: 0.26, 12.5: 0.25, 20: 0.24 },
];

/* ------------------------------------------------------------------ *
 * Table 9  Recommended dosages of mineral admixtures for high
 *          strength mixes   (clause 6.2.6)
 *          percent by mass of total cementitious materials
 * ------------------------------------------------------------------ */

export const TABLE_9_MINERAL_DOSAGE = {
  flyAsh: { min: 15, max: 30, label: 'Fly ash', sg: 2.2, is: 'IS 3812 (Part 1)' },
  ggbs: { min: 25, max: 50, label: 'GGBS', sg: 2.9, is: 'IS 16714' },
  metakaolin: { min: 5, max: 15, label: 'Metakaolin', sg: 2.5, is: '—' },
  silicaFume: { min: 5, max: 10, label: 'Silica fume', sg: 2.2, is: 'IS 15388' },
};

/* ------------------------------------------------------------------ *
 * Table 10  Volume of coarse aggregate per unit volume of total
 *           aggregate, high strength grades, at w/cm = 0.30
 *           (clause 6.2.7)
 * Zone IV is not offered: clause 6.1.3 prefers Zone I or II.
 * ------------------------------------------------------------------ */

export const TABLE_10_CA_VOLUME = {
  10: { I: 0.52, II: 0.54, III: 0.56 },
  12.5: { I: 0.54, II: 0.56, III: 0.58 },
  20: { I: 0.64, II: 0.66, III: 0.68 },
};
export const TABLE_10_REFERENCE_WCM = 0.30;

/* ------------------------------------------------------------------ *
 * Figure 1  Relationship between free water-cement ratio and 28 day
 *           compressive strength of concrete   (clause 5.1)
 *
 * The printed figure is a graph. These arrays are a digitisation of
 * the three published curves, read at 0.01 intervals of free w/c from
 * 0.25 to 0.65, in N/mm2.
 *
 *   Curve 1  expected 28 day cement strength  >= 33 and < 43 N/mm2
 *   Curve 2  expected 28 day cement strength  >= 43 and < 53 N/mm2
 *   Curve 3  expected 28 day cement strength  >= 53 N/mm2
 *
 * Note 1 of the figure: in the absence of data on the actual 28 day
 * strength of the cement, curves 1, 2 and 3 may be used for OPC 33,
 * OPC 43 and OPC 53 respectively.
 * Note 2: for PPC and PSC the curve matching the actual strength may
 * be used; in the absence of that data, curve 2 may be used.
 *
 * Reading a scanned graph carries about +/- 0.01 of uncertainty on
 * w/c. The engine therefore always allows the value to be overridden
 * with the user's own reading of the printed figure.
 * ------------------------------------------------------------------ */

export const FIG_1_WC_AXIS = Array.from({ length: 41 }, (_, i) =>
  Number((0.25 + i * 0.01).toFixed(2))
);

export const FIG_1_CURVES = {
  1: [
    59.4, 57.5, 55.7, 53.9, 52.2, 50.5, 48.8, 47.2, 45.6, 44.1, 42.6, 41.2,
    39.8, 38.4, 37.1, 35.8, 34.6, 33.4, 32.2, 31.1, 30.0, 29.0, 27.9, 27.0,
    26.0, 25.1, 24.2, 23.4, 22.5, 21.8, 21.0, 20.2, 19.5, 18.9, 18.2, 17.6,
    17.0, 16.4, 15.8, 15.3, 14.7,
  ],
  2: [
    65.0, 63.2, 61.4, 59.6, 57.8, 56.1, 54.5, 52.9, 51.3, 49.7, 48.2, 46.8,
    45.4, 44.0, 42.6, 41.3, 40.1, 38.8, 37.6, 36.5, 35.3, 34.2, 33.2, 32.1,
    31.1, 30.2, 29.2, 28.3, 27.5, 26.6, 25.8, 25.0, 24.2, 23.5, 22.8, 22.1,
    21.4, 20.8, 20.1, 19.5, 18.9,
  ],
  3: [
    74.3, 72.1, 70.1, 68.1, 66.2, 64.3, 62.6, 60.8, 59.2, 57.6, 56.0, 54.5,
    53.0, 51.6, 50.2, 48.9, 47.6, 46.3, 45.1, 43.9, 42.7, 41.6, 40.5, 39.4,
    38.4, 37.4, 36.4, 35.4, 34.5, 33.6, 32.7, 31.8, 30.9, 30.1, 29.3, 28.5,
    27.7, 26.9, 26.2, 25.4, 24.7,
  ],
};

export const FIG_1_CURVE_NOTES = {
  1: 'Cement 28 day strength >= 33 and < 43 N/mm2 (use for OPC 33)',
  2: 'Cement 28 day strength >= 43 and < 53 N/mm2 (use for OPC 43, PPC, PSC)',
  3: 'Cement 28 day strength >= 53 N/mm2 (use for OPC 53)',
};

/* ------------------------------------------------------------------ *
 * Cement types
 * ------------------------------------------------------------------ */

export const CEMENT_TYPES = {
  opc33: { label: 'OPC 33 grade', is: 'IS 269', curve: 1, strength: 33, sg: 3.15 },
  opc43: { label: 'OPC 43 grade', is: 'IS 269', curve: 2, strength: 43, sg: 3.15 },
  opc53: { label: 'OPC 53 grade', is: 'IS 269', curve: 3, strength: 53, sg: 3.15 },
  ppc: { label: 'PPC (fly ash based)', is: 'IS 1489 (Part 1)', curve: 2, strength: null, sg: 2.88 },
  ppcCalcined: { label: 'PPC (calcined clay based)', is: 'IS 1489 (Part 2)', curve: 2, strength: null, sg: 2.9 },
  psc: { label: 'PSC (slag cement)', is: 'IS 455', curve: 2, strength: null, sg: 2.95 },
};

/** Figure 1, Notes 1 and 2: pick the curve for a cement. */
export function curveForCement(cementType, actualStrength) {
  if (actualStrength) {
    if (actualStrength < 43) return 1;
    if (actualStrength < 53) return 2;
    return 3;
  }
  return CEMENT_TYPES[cementType]?.curve ?? 2;
}

/* ------------------------------------------------------------------ *
 * IS 456 : 2000, Table 3  Exposure conditions
 * ------------------------------------------------------------------ */

export const IS456_TABLE_3_EXPOSURE = {
  mild: {
    label: 'Mild',
    description:
      'Concrete surfaces protected against weather or aggressive conditions, except those situated in coastal areas.',
  },
  moderate: {
    label: 'Moderate',
    description:
      'Concrete surfaces sheltered from severe rain or freezing whilst wet; concrete exposed to condensation and rain; concrete continuously under water; concrete in contact with or buried under non-aggressive soil or ground water; concrete surfaces sheltered from saturated salt air in coastal areas.',
  },
  severe: {
    label: 'Severe',
    description:
      'Concrete surfaces exposed to severe rain, alternate wetting and drying or occasional freezing whilst wet or severe condensation; concrete completely immersed in sea water; concrete exposed to coastal environment.',
  },
  verySevere: {
    label: 'Very severe',
    description:
      'Concrete surfaces exposed to sea water spray, corrosive fumes or severe freezing conditions whilst wet; concrete in contact with or buried under aggressive sub-soil or ground water.',
  },
  extreme: {
    label: 'Extreme',
    description:
      'Surface of members in the tidal zone; members in direct contact with liquid or solid aggressive chemicals.',
  },
};

/* ------------------------------------------------------------------ *
 * IS 456 : 2000, Table 5  Minimum cement content, maximum free
 * water-cement ratio and minimum grade of concrete, for normal
 * weight aggregates of 20 mm nominal maximum size.
 * ------------------------------------------------------------------ */

export const IS456_TABLE_5 = {
  plain: {
    mild: { minCement: 220, maxWC: 0.60, minGrade: null },
    moderate: { minCement: 240, maxWC: 0.60, minGrade: 15 },
    severe: { minCement: 250, maxWC: 0.50, minGrade: 20 },
    verySevere: { minCement: 260, maxWC: 0.45, minGrade: 20 },
    extreme: { minCement: 280, maxWC: 0.40, minGrade: 25 },
  },
  reinforced: {
    mild: { minCement: 300, maxWC: 0.55, minGrade: 20 },
    moderate: { minCement: 300, maxWC: 0.50, minGrade: 25 },
    severe: { minCement: 320, maxWC: 0.45, minGrade: 30 },
    verySevere: { minCement: 340, maxWC: 0.45, minGrade: 35 },
    extreme: { minCement: 360, maxWC: 0.40, minGrade: 40 },
  },
};

/* IS 456 : 2000, Table 6  Adjustment to minimum cement content for
 * aggregates other than 20 mm nominal maximum size. */
export const IS456_TABLE_6_CEMENT_ADJ = { 10: 40, 12.5: 40, 20: 0, 40: -30 };

/* IS 456 : 2000, clause 8.2.4.2 */
export const IS456_MAX_CEMENT = 450;

/* ------------------------------------------------------------------ *
 * Chemical admixtures   (clause 5.3, clause 6.2.4, Annex G)
 * ------------------------------------------------------------------ */

export const CHEMICAL_ADMIXTURES = {
  none: { label: 'None', dose: [0, 0], reduction: [0, 0], sg: 1.0 },
  plasticizer: {
    label: 'Plasticizer (water reducing)',
    dose: [0.3, 0.5],
    reduction: [8, 12],
    sg: 1.15,
    note: 'Annex G-3: lignosulphonate or carbohydrate based. Suited to lower grades.',
  },
  superplasticizer: {
    label: 'Superplasticizer (SMFC / SNFC)',
    dose: [0.5, 1.5],
    reduction: [15, 30],
    sg: 1.145,
    note: 'Annex G-3: sulphonated melamine or naphthalene formaldehyde condensate.',
  },
  pce: {
    label: 'Superplasticizer (PCE based)',
    dose: [0.5, 1.2],
    reduction: [30, 40],
    sg: 1.08,
    note: 'Annex G-3: polycarboxylate ether. Low dosage, water reduction of 30 percent and above. Required for high strength and self compacting concrete.',
  },
};

/* ------------------------------------------------------------------ *
 * Fine aggregate grading zones   (IS 383 : 2016, Table 9)
 * ------------------------------------------------------------------ */

export const FA_ZONES = {
  I: { label: 'Zone I', note: 'Coarsest' },
  II: { label: 'Zone II', note: 'Most commonly available natural sand' },
  III: { label: 'Zone III', note: 'Finer' },
  IV: {
    label: 'Zone IV',
    note: 'Table 5, Note 4: not to be used in reinforced concrete unless tests establish the suitability of the proposed proportions',
  },
};

export const FA_TYPES = {
  natural: { label: 'Natural sand', caAdj: 0 },
  crushedStone: { label: 'Crushed stone sand', caAdj: 0 },
  crushedGravel: { label: 'Crushed gravel sand', caAdj: 0 },
  manufactured: { label: 'Manufactured sand', caAdj: 0 },
  mixed: { label: 'Mixed sand', caAdj: 0 },
};

export const PLACING_METHODS = {
  chute: { label: 'Chute (non pumpable)', caReduction: 0 },
  skip: { label: 'Skip and crane', caReduction: 0 },
  manual: { label: 'Manual placing', caReduction: 0 },
  pumping: { label: 'Pumping', caReduction: 10 },
  congested: { label: 'Around congested reinforcement', caReduction: 10 },
};

/* Nominal maximum sizes offered per section */
export const MSA_ORDINARY = [10, 20, 40];
export const MSA_HIGH_STRENGTH = [10, 12.5, 20];

export const AGGREGATE_CONDITIONS = {
  ssd: { label: 'Saturated surface dry' },
  dry: { label: 'Dry (absorbs mixing water)' },
  wet: { label: 'Wet (contributes free moisture)' },
};

/* ================================================================== *
 * SECTION 4  SELF COMPACTING CONCRETE   (clauses 7 and 8)
 * ================================================================== */

/* Clause 7.2.1  Slump flow classes */
export const SCC_SLUMP_FLOW = {
  SF1: {
    label: 'SF1',
    range: [550, 650],
    use: 'Unreinforced or lightly reinforced sections cast from the top with free displacement from the delivery point; sections small enough to prevent long horizontal flow, such as piles and some deep foundations; and sections cast by injection, as in tunnel linings.',
  },
  SF2: {
    label: 'SF2',
    range: [660, 750],
    use: 'Suitable for most normal applications, such as walls and columns.',
  },
  SF3: {
    label: 'SF3',
    range: [760, 850],
    use: 'Vertical applications in very congested structures, structures with complex shapes, and filling under formwork. Usually gives a better surface finish than SF2 for normal vertical applications, but segregation resistance is harder to achieve.',
  },
};

/* Clause 7.2.4  Viscosity classes, by V funnel flow time */
export const SCC_VISCOSITY = {
  V1: {
    label: 'V1',
    range: [0, 8],
    text: 'V funnel flow time not more than 8 s',
    use: 'Good filling ability even with congested reinforcement. Capable of self levelling and generally gives the best surface finish.',
  },
  V2: {
    label: 'V2',
    range: [8, 25],
    text: 'V funnel flow time between 8 s and 25 s',
    use: 'More likely to show thixotropic effects, which can help in limiting formwork pressure or improving segregation resistance, but may worsen the surface finish.',
  },
};

/* Clause 7.2.3  Segregation resistance classes, by the sieve test */
export const SCC_SEGREGATION = {
  SR1: {
    label: 'SR1',
    range: [15, 20],
    text: 'Segregation ratio of 15 to 20 percent',
    use: 'Generally applicable to thin slabs, and to vertical applications with a flow distance under 5 m and a confinement gap greater than 80 mm.',
  },
  SR2: {
    label: 'SR2',
    range: [0, 15],
    text: 'Segregation ratio less than 15 percent',
    use: 'Preferred for vertical applications where the flow distance exceeds 5 m with a confinement gap greater than 80 mm. Also used for tall vertical applications with a confinement gap under 80 mm; where the flow then exceeds 5 m, a segregation ratio under 10 percent is recommended.',
  },
};

/* Clause 7.2.2  Passing ability, by the L box test */
export const SCC_LBOX_MIN_RATIO = 0.8;

/* Clause 8.1 Note and clause 8.3  Typical ranges of mix constituents */
export const SCC_RANGES = {
  /* Powder is all material finer than 0.125 mm, from the cement, the
   * mineral admixture and the aggregate. */
  powder: [400, 600],
  water: [150, 210],
  /* Water to powder ratio, by volume, clause 8.1 Note */
  waterPowderRatio: [0.85, 1.1],
  /* Fine aggregate as a percentage by mass of total aggregate */
  fineAggregatePct: [48, 60],
  /* Fly ash as a percentage of cementitious material, Annex E-7.1 */
  flyAshPct: [25, 50],
};

/* ================================================================== *
 * SECTION 5  MASS CONCRETE   (clause 9)
 * ================================================================== */

export const MSA_MASS = [40, 80, 150];

/* Clause 9.2  The target strength of clause 4.2 is increased to account
 * for the higher strength measured after wet sieving the concrete
 * through a 40 mm sieve to cast 150 mm cubes. The increase applies to
 * the cube test result only and is NOT used to select the water-cement
 * ratio (clause 9.5). */
export const MASS_TARGET_UPLIFT = { 40: 0, 80: 20, 150: 25 };

/* Table 11  Approximate air content, clause 9.3 */
export const TABLE_11_AIR = { 40: 0.8, 80: 0.3, 150: 0.2 };

/* Clause 9.3  Recommended air content where the concrete is air
 * entrained. Determined on a mixture passing a 40 mm sieve the values
 * are higher by 1.5 to 2 percent. */
export const MASS_AIR_ENTRAINED = {
  80: [3.5, 4.5],
  150: [3.0, 4.0],
};

/* Table 12  Water content per cubic metre, clause 9.4 */
export const TABLE_12_WATER = { 40: 165, 80: 145, 150: 125 };

/* Clause 9.4  Reduction for rounded gravel, by nominal maximum size */
export const MASS_ROUNDED_WATER_ADJ = { 40: -20, 80: -15, 150: -10 };

/* Table 12, Note 1  Air entrained concrete needs 8 kg less water */
export const MASS_AIR_ENTRAINED_WATER_ADJ = -8;

/* Table 13  Volume of coarse aggregate per unit volume of total
 * aggregate at w/c or w/cm of 0.50, clause 9.7 */
export const TABLE_13_CA_VOLUME = {
  40: { I: 0.69, II: 0.71, III: 0.72, IV: 0.73 },
  80: { I: 0.72, II: 0.73, III: 0.74, IV: 0.75 },
  150: { I: 0.77, II: 0.78, III: 0.79, IV: 0.80 },
};

/* Table 14  Grading requirements for coarse aggregate for mass
 * concrete, clause 9.9. Percentage passing, [min, max]. */
export const TABLE_14_GRADING = {
  150: [
    { sieve: 150, min: 100, max: 100 },
    { sieve: 80, min: 55, max: 65 },
    { sieve: 40, min: 29, max: 40 },
    { sieve: 20, min: 14, max: 22 },
    { sieve: 10, min: 6, max: 10 },
    { sieve: 4.75, min: 0, max: 5 },
  ],
  80: [
    { sieve: 150, min: 100, max: 100 },
    { sieve: 80, min: 100, max: 100 },
    { sieve: 40, min: 53, max: 62 },
    { sieve: 20, min: 26, max: 34 },
    { sieve: 10, min: 10, max: 15 },
    { sieve: 4.75, min: 0, max: 5 },
  ],
};

/* Table 15  Approximate mortar content for large aggregate sizes,
 * clause 9.10. Absolute volume of cement, pozzolana, water, admixture,
 * air and fine aggregate, in m3 per m3 of concrete. */
export const TABLE_15_MORTAR = {
  150: { crushed: 0.39, rounded: 0.37, tol: 0.01 },
  80: { crushed: 0.44, rounded: 0.43, tol: 0.01 },
};

/* ================================================================== *
 * IS 383 : 2016, Table 7  Grading requirements for coarse aggregate
 *
 * Used by the combined grading calculator of clause 5.6. These limits
 * are offered as editable defaults: confirm them against your own copy
 * of IS 383 : 2016 before relying on them, since that standard is not
 * reproduced inside IS 10262.
 * ================================================================== */

export const IS383_TABLE_7_GRADED = {
  40: [
    { sieve: 80, min: 100, max: 100 },
    { sieve: 40, min: 95, max: 100 },
    { sieve: 20, min: 30, max: 70 },
    { sieve: 10, min: 10, max: 35 },
    { sieve: 4.75, min: 0, max: 5 },
  ],
  20: [
    { sieve: 40, min: 100, max: 100 },
    { sieve: 20, min: 95, max: 100 },
    { sieve: 10, min: 25, max: 55 },
    { sieve: 4.75, min: 0, max: 10 },
  ],
  12.5: [
    { sieve: 20, min: 100, max: 100 },
    { sieve: 12.5, min: 90, max: 100 },
    { sieve: 10, min: 40, max: 85 },
    { sieve: 4.75, min: 0, max: 10 },
  ],
  10: [
    { sieve: 12.5, min: 100, max: 100 },
    { sieve: 10, min: 85, max: 100 },
    { sieve: 4.75, min: 0, max: 20 },
    { sieve: 2.36, min: 0, max: 5 },
  ],
};

/** The grading limits that apply to a nominal maximum size. */
export function gradingLimitsFor(msa, section) {
  if (section === 'mass' && TABLE_14_GRADING[msa]) {
    return { rows: TABLE_14_GRADING[msa], source: 'IS 10262 : 2019, Table 14' };
  }
  const rows = IS383_TABLE_7_GRADED[msa];
  return rows ? { rows, source: 'IS 383 : 2016, Table 7' } : null;
}
