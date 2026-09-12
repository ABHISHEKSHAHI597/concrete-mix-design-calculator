# Concrete Mix Proportioning — IS 10262 : 2019

A web calculator that automates the concrete mix design procedure of
**IS 10262 : 2019, *Concrete mix proportioning — Guidelines* (second revision)**,
with durability limits from **IS 456 : 2000** and aggregate grading from **IS 383 : 2016**.

Every section of the standard that proportions a mix is implemented:

| Part of the standard | Covers | Worked example reproduced |
|---|---|---|
| Section 2 — Ordinary and standard grades | M 10 to M 60, with fly ash or GGBS | Annexes A, B, C |
| Section 3 — High strength grades | M 65 to M 100, with silica fume, fly ash, GGBS, metakaolin | Annex D |
| Section 4 — Self compacting concrete | slump flow, viscosity and segregation classes, powder balance | Annex E |
| Section 5 — Mass concrete | 40, 80 and 150 mm aggregate, wet sieving uplift, mortar content | Annex F |
| Clause 5.6 — Combining coarse aggregate fractions | IS 383 Table 7 and IS 10262 Table 14 grading | Annexes A and F |

Chemical admixtures (plasticizer, SMFC/SNFC and PCE superplasticizers, and a
viscosity modifying admixture for SCC) are handled throughout, together with the
aggregate moisture corrections of Annex A-11 and Annex B-11.

---

## Running it

```bash
npm install
npm run dev        # development server at http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run verify     # run the six annex examples and print the comparison
```

`npm run build` produces a fully static `dist/` directory with relative asset
paths, so it can be served from any static host.

---

## Verification against the standard

All six illustrative examples of the standard are built into the calculator and
can be run from the **Verification** page or from the command line with
`npm run verify`, which exits non-zero if any check falls outside tolerance.
Each case supplies only the stipulations and material test data printed in the
annex; every other figure is derived by the engine.

| Annex | Case | Exact | Agreeing |
|---|---|---|---|
| A | M 40, PPC, no mineral admixture, dry aggregate | 14 / 14 | 14 / 14 |
| B | M 40, OPC 43 with 30 % fly ash, pumped, wet aggregate | 9 / 13 | 13 / 13 |
| C | M 40, OPC 43 with 40 % GGBS, pumped | 8 / 10 | 10 / 10 |
| D | M 70, OPC 53 with 15 % fly ash and 5 % silica fume | 14 / 15 | 15 / 15 |
| E | M 30 self compacting, 35 % fly ash, PCE superplasticizer | 7 / 14 | 14 / 14 |
| F | M 15 mass concrete, 150 mm rounded aggregate, 25 % fly ash | 10 / 17 | 17 / 17 |
| | **Total** | **62 / 83** | **83 / 83** |

**Annex A reproduces every published figure exactly**, including the key quantities:

| Quantity | IS 10262 : 2019, Annex A | This calculator |
|---|---|---|
| Target mean strength f′ck | 48.25 N/mm² | 48.25 N/mm² |
| Water content | 148 kg/m³ | 148 kg/m³ |
| Cement content | 412 kg/m³ | 412 kg/m³ |
| Coarse aggregate (SSD) | 1 234 kg/m³ | 1 234 kg/m³ |
| Fine aggregate (SSD) | 648 kg/m³ | 648 kg/m³ |
| Volume of all in aggregate | 0.695 m³ | 0.695 m³ |
| Fine aggregate, dry | 642 kg/m³ | 642 kg/m³ |
| Coarse aggregate, dry | 1 228 kg/m³ | 1 228 kg/m³ |
| Water to be added | 160 kg/m³ | 160 kg/m³ |

The values that are not exact differ by the standard's own rounding. In the
Section 2, 3 and 5 examples that is under one kilogram per cubic metre: Annex A
takes a cement content of 411.11 up to 412 while Annex D takes 486.2 down to 486,
and Annex A carries the volume of all in aggregate to three decimals while Annexes
C and F carry it to four. Both choices are exposed as settings in the worksheet,
and the Verification page names the setting each case uses. Annex E rounds each
component volume before subtracting for the coarse aggregate, which puts its
figure 3 kg above the unrounded calculation (737 against 734).

### On the reading of Figure 1

Figure 1 is a graph, not a table. The three curves are digitised at hundredths
of the free water-cement ratio, with the axes calibrated against the frame of
the plot (the bottom axis spans exactly 1 078 px for 0.25 to 0.65 in the scan).
The standard reads its own graph in three examples, and those readings scatter
either side of the digitised Curve 2 by about a hundredth:

| Annex | Target strength | Standard reads | Digitised curve |
|---|---|---|---|
| A, B, C | 48.25 N/mm² | 0.36 | 0.350 |
| E | 38.25 N/mm² | 0.43 | 0.425 |
| F | 20.77 N/mm² | 0.61 | 0.620 |

Because the scatter runs in both directions, it reflects eye reading of a
printed graph rather than an offset in the digitisation. The calculator shows
the digitised value, shades the ±0.01 tolerance on the plot, and lets the ratio
be entered directly; the verification cases for Annexes A to E adopt the
standard's own reading. In Annex F both readings exceed the durability limit of
0.60, which governs, so no entry is needed.

---

## What the calculator does

**Section 2, ordinary and standard grades**

1. Target strength, clause 4.2: the greater of `fck + 1.65 S` and `fck + X`, with
   S from Table 2 or from test results by clause 4.2.1.2.
2. Air content from Table 3.
3. Free water-cement ratio from Figure 1, checked against IS 456 Table 5, the
   lower adopted.
4. Water content from Table 4, adjusted for aggregate shape, for slump at 3 % per
   25 mm, and for the water reduction of the chemical admixture.
5. Cementitious content, `water / (w/c)`, with the optional increase for mineral
   admixtures and recalculation of w/cm; checked against the minimum of IS 456
   Table 5 (with the Table 6 size adjustment) and the maximum of clause 8.2.4.2.
6. Coarse aggregate volume from Table 5, adjusted at 0.01 per 0.05 of ratio, with
   up to 10 % reduction for pumping.
7. Absolute volumes to one cubic metre, and the aggregate masses.
8. Moisture correction for dry or wet aggregate.
9. Trial mixes at ±10 % of the ratio.

**Section 3, high strength.** Air from Table 6, water from Table 7, w/cm
interpolated from Table 8, dosage checks against Table 9, coarse aggregate volume
from Table 10 at a reference w/cm of 0.30, and up to 5 % reduction for pumping.

**Section 4, self compacting concrete.** Slump flow, viscosity and segregation
resistance classes and the L box ratio of clause 7.2. The water content and
powder content are chosen from the ranges of clause 8.3; the fine aggregate is
sized to supply the powder the cementitious material does not, the coarse
aggregate is found by subtraction, and the water to powder ratio by volume is
checked against 0.85 to 1.10.

**Section 5, mass concrete.** The 20 % and 25 % wet sieving uplift of clause 9.2
on the cube target, kept out of the w/c selection as clause 9.5 requires; air,
water and coarse aggregate volume from Tables 11, 12 and 13, with the rounded
gravel and air entrainment reductions; and the mortar content check of Table 15.

**Clause 5.6, combining coarse aggregate fractions.** Enter the sieve analysis
of each available fraction; the calculator gives the combined grading, checks it
against IS 383 Table 7 or IS 10262 Table 14, searches for a conforming blend, and
splits the coarse aggregate mass between the fractions. At the standard's own
35:30:15:10:10 it reproduces the combined grading of Annex F exactly.

**Batch quantities** for any volume, with cement in 50 kg bags.

Every figure in the calculation sheet carries the clause, table or figure it came
from, and the substituted expression that produced it.

---

## Interface

| Page | What it holds |
|---|---|
| **Mix design** | The section switch, the input worksheet, the live one cubic metre breakdown, the durability and limit checks, and five output panels: mix proportions, calculation sheet, aggregate grading, batch quantities and trial mixes |
| **Verification** | The six annex examples side by side with the standard's published values, and the Figure 1 reading comparison |
| **Methodology** | Each design step explained against its clause, for all four sections, with the reference tables |
| **Saved designs** | Designs kept in this browser's local storage, with JSON export and import |

**Print report** produces an A4 report carrying the stipulations, the full
calculation sheet, the mix proportions with the mix ratio, the durability and
limit checks, the combined aggregate grading and the trial mixes.

---

## A note on IS 383 limits

IS 383 is not reproduced inside IS 10262, so the Table 7 grading limits used by
the aggregate grading panel are editable defaults rather than figures quoted from
the PDF in this repository. They are consistent with the standard's own examples:
the sieve analysis of Annex A combines to 60:40 inside them, as Annex A states.
Confirm them against your copy of IS 383 : 2016. The Table 14 limits for 80 mm
and 150 mm mass concrete aggregate come from IS 10262 itself.

---

## Project layout

```
├── index.html
├── vite.config.js
├── scripts/
│   └── verify.mjs              command line verification runner
└── src/
    ├── main.jsx
    ├── index.css               design tokens, worksheet and print styles
    ├── App.jsx                 shell, section switch, printed report assembly
    ├── lib/
    │   ├── tables.js           IS 10262 Tables 1-15 and Figure 1; IS 456 Tables 3, 5, 6; IS 383 Table 7
    │   ├── mixDesign.js        engine for Sections 2, 3 and 5
    │   ├── sccDesign.js        engine for Section 4
    │   ├── moisture.js         dry and wet aggregate correction, shared
    │   ├── grading.js          combined grading and blend search, clause 5.6
    │   ├── verification.js     the six annex cases and their published values
    │   ├── storage.js          saved designs in local storage
    │   └── format.js           number formatting
    └── components/
        ├── Worksheet.jsx       the input form, sectioned by clause
        ├── Instrument.jsx      live readouts and limit checks
        ├── UnitCube.jsx        the one cubic metre volume breakdown
        ├── Fig1Plot.jsx        Figure 1 redrawn, with the design point and tolerance
        ├── GradingBlend.jsx    combined grading of coarse aggregate
        ├── CalculationSheet.jsx
        ├── Proportions.jsx
        ├── BatchPanel.jsx
        ├── TrialMixes.jsx
        ├── SDCalculator.jsx    standard deviation, clause 4.2.1.2
        ├── ChecksTable.jsx
        ├── Verification.jsx
        ├── Methodology.jsx
        ├── SavedDesigns.jsx
        ├── ReportHeader.jsx
        └── fields.jsx          form primitives
```

The engines in `src/lib/` are pure functions with no dependency on React, so
they can be called from a script or a test directly, as `scripts/verify.mjs`
does.

---

## Limits

The calculator proportions a mix. It does not replace the trial batches the
standard requires in clauses 5.8, 6.2.9, 8.2 and 9.11. The water reduction
claimed for a chemical admixture, the 28 day strength of the cement, the specific
gravities, the absorption, moisture content and fines content of the aggregate
all have to come from testing of the materials actually to be used, in
accordance with IS 2386 (Part 3), IS 1199 (Part 6) and IS 9103.

Nothing is sent anywhere: the page runs entirely in the browser and saved designs
stay in its local storage.
