/**
 * Correction of the batch weights for the condition the aggregate is
 * actually in, per the note to Annex A-10 and the worked adjustments of
 * Annex A-11 (dry) and Annex B-11 (wet).
 *
 * The design assumes aggregate in the saturated surface dry condition.
 * Dry aggregate absorbs part of the mixing water; wet aggregate carries
 * free surface moisture that it gives to the mix. Either way the
 * aggregate masses move with the water.
 */

const r = (v, dp = 2) => {
  const f = 10 ** dp;
  return Math.round((v + Number.EPSILON) * f) / f;
};

/**
 * @param i      the design input
 * @param water  free water content, kg/m3
 * @param caMass coarse aggregate in SSD condition, kg/m3
 * @param faMass fine aggregate in SSD condition, kg/m3
 * @param base   the SSD mix, spread into the returned field mix
 * @returns { field, lines, clause, title, note, warning }
 */
export function moistureCorrection(i, water, caMass, faMass, base) {
  const note =
    'Aggregates are to be used in the saturated surface dry condition. Where they are not, the mixing water is increased by the moisture the aggregate will absorb, or reduced by the free surface moisture it contributes, and the aggregate masses are adjusted to match. Surface water and water absorption are to be determined in accordance with IS 2386 (Part 3).';

  if (i.aggCondition === 'dry') {
    const caDry = Math.round(caMass / (1 + Number(i.caAbsorption) / 100));
    const faDry = Math.round(faMass / (1 + Number(i.faAbsorption) / 100));
    const caExtra = caMass - caDry;
    const faExtra = faMass - faDry;
    const addedWater = water + caExtra + faExtra;

    return {
      field: { ...base, condition: 'dry', ca: caDry, fa: faDry, water: addedWater, netWater: water },
      clause: 'A-11',
      title: 'Adjustment for aggregate in the dry condition',
      note,
      lines: [
        {
          label: 'Coarse aggregate, dry',
          expr: `${caMass} / (1 + ${i.caAbsorption}/100)`,
          value: caDry,
          unit: 'kg/m³',
        },
        {
          label: 'Fine aggregate, dry',
          expr: `${faMass} / (1 + ${i.faAbsorption}/100)`,
          value: faDry,
          unit: 'kg/m³',
        },
        {
          label: 'Water absorbed by the coarse aggregate',
          expr: `${caMass} − ${caDry}`,
          value: caExtra,
          unit: 'kg',
        },
        {
          label: 'Water absorbed by the fine aggregate',
          expr: `${faMass} − ${faDry}`,
          value: faExtra,
          unit: 'kg',
        },
        {
          label: 'Water to be added',
          expr: `${water} + ${caExtra} + ${faExtra}`,
          value: addedWater,
          unit: 'kg/m³',
          emphasis: true,
        },
      ],
    };
  }

  if (i.aggCondition === 'wet') {
    const caFree = Number(i.caMoisture) - Number(i.caAbsorption);
    const faFree = Number(i.faMoisture) - Number(i.faAbsorption);
    const caWet = Math.round(caMass * (1 + caFree / 100));
    const faWet = Math.round(faMass * (1 + faFree / 100));
    const caContrib = caWet - caMass;
    const faContrib = faWet - faMass;
    const addedWater = water - caContrib - faContrib;

    return {
      field: { ...base, condition: 'wet', ca: caWet, fa: faWet, water: addedWater, netWater: water },
      clause: 'B-11',
      title: 'Adjustment for aggregate in the wet condition',
      note,
      warning:
        caFree < 0 || faFree < 0
          ? 'Total moisture content is below the water absorption of the aggregate, so the aggregate is not in fact wet. Use the dry condition, with absorption made up by added water.'
          : null,
      lines: [
        {
          label: 'Free surface moisture, coarse aggregate',
          expr: `${i.caMoisture} − ${i.caAbsorption}`,
          value: r(caFree, 2),
          unit: '%',
        },
        {
          label: 'Free surface moisture, fine aggregate',
          expr: `${i.faMoisture} − ${i.faAbsorption}`,
          value: r(faFree, 2),
          unit: '%',
        },
        {
          label: 'Coarse aggregate, wet',
          expr: `${caMass} × (1 + ${r(caFree, 2)}/100)`,
          value: caWet,
          unit: 'kg/m³',
        },
        {
          label: 'Fine aggregate, wet',
          expr: `${faMass} × (1 + ${r(faFree, 2)}/100)`,
          value: faWet,
          unit: 'kg/m³',
        },
        {
          label: 'Water contributed by the coarse aggregate',
          expr: `${caWet} − ${caMass}`,
          value: caContrib,
          unit: 'kg',
        },
        {
          label: 'Water contributed by the fine aggregate',
          expr: `${faWet} − ${faMass}`,
          value: faContrib,
          unit: 'kg',
        },
        {
          label: 'Water to be added',
          expr: `${water} − ${caContrib} − ${faContrib}`,
          value: addedWater,
          unit: 'kg/m³',
          emphasis: true,
        },
      ],
    };
  }

  return { field: { ...base, condition: 'ssd' }, lines: [], note };
}
