// Calibration knobs, all [estimated] (spec 02, Constants). Injected into every engine function as `params`.
import type { EngineParams } from '../types';

export const DEFAULTS: EngineParams = {
  k: 0.15, // provisional; seed-7 calibration replaces it (grid 0.05–0.3)
  fastingDrainMultiplier: 1.25,
  restRecoveryPerMin: 2,
  passiveRecoveryPerMin: 0.5,
  passiveRecoveryMaxRatio: 0.9,
  startBudgetNoRecord: 80,
  carryoverFactor: 0.3,
  poorSleepPenalty: 10,
  urinePenalty: { pale: 0, medium: 5, dark: 15 },
  levelBands: [75, 50, 30, 15],
  hysteresisMin: 5,
  hysteresisPoints: 3,
  l4ClearRestMin: 15,
  l4ClearMinBudget: 18,
  postUnwellFloorMin: 15,
  restTapRevertMin: 15,
  hrFractionOfMax: 0.85,
  hrSustainMin: 5,
  hrStaleMin: 2,
  metabolicW: { light: 180, moderate: 300, heavy: 415, veryHeavy: 520 },
  clothingAdjC: { workClothes: 0, clothCoveralls: 0, doubleLayerWoven: 3, polyolefinCoveralls: 1 },
  hoodAdjC: 1,
  wbgtMethod: 'approx',
};

/** UAE midday ban for sun work: 12:30–15:00 site time, 15 Jun–15 Sep (month·100 + day, inclusive). Law, not a knob. */
export const MIDDAY_BAN = { fromMin: 12 * 60 + 30, toMin: 15 * 60, seasonFrom: 615, seasonTo: 915 };
