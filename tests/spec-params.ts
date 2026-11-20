// Hand-written from docs/spec/02-engine.md "Constants". Builder-owned: Antigravity must not edit tests/.
import type { EngineParams } from '../lib/types';

export const SPEC_PARAMS: EngineParams = {
  k: 0.15, // provisional (docs/analysis/heat-check.md); seed-7 calibration replaces it
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
