// Limits and per-minute budget change (spec 02, Limits + Budget). Shared by the engine and the planner.
import type { Activity, EngineParams, MetabolicClass, Profile } from '../types';
import { DEFAULTS } from './constants';

const RETURNING_RAMP = [0.5, 0.6, 0.8]; // days 0–2 after ≥7 days away; 100 % from day 3

/** Acclimatisation ramp 0–1. A non-finite input counts as missing: 0 (unacclimatised). */
export function rampFraction(p: Profile): number {
  const d = Math.floor(p.acclimDays);
  if (!Number.isFinite(d) || d < 0) return 0;
  if (p.isNewArrival) return Math.min(1, 0.2 * (d + 1)); // 20 %/day, days 0–4
  if (!Number.isFinite(p.daysAway) || p.daysAway >= 7) return RETURNING_RAMP[d] ?? 1;
  return 1; // 0–6 days away: no reset
}

/** Personal WBGT limit (°C): RAL + ramp × (REL − RAL), NIOSH with M in watts. ramp 0 = RAL. */
export function limitC(cls: MetabolicClass, ramp: number, params: EngineParams = DEFAULTS): number {
  const lg = Math.log10(params.metabolicW[cls]);
  const ral = 59.9 - 14.1 * lg;
  const rel = 56.7 - 11.5 * lg;
  return ral + ramp * (rel - ral);
}

/** Clothing + hood adjustment (°C). Unknown clothing or hood counts as the worst case. */
export function clothingAdjC(p: Profile, params: EngineParams = DEFAULTS): number {
  const adj = params.clothingAdjC[p.clothing] ?? Math.max(...Object.values(params.clothingAdjC));
  return adj + (p.hood === false ? 0 : params.hoodAdjC);
}

/** Budget change for one sim-minute: Rest +2; otherwise −k·max(0, Δ) (×1.25 fasting), +0.5 passive when r < 0.9 and not heavy. */
export function budgetChange(activity: Activity, effWbgt: number, limit: number, fasting: boolean, params: EngineParams = DEFAULTS): number {
  if (activity === 'rest') return params.restRecoveryPerMin;
  const drain = params.k * Math.max(0, effWbgt - limit) * (fasting ? params.fastingDrainMultiplier : 1);
  const heavy = activity === 'heavy' || activity === 'veryHeavy';
  const passive = !heavy && effWbgt / limit < params.passiveRecoveryMaxRatio ? params.passiveRecoveryPerMin : 0;
  return passive - drain;
}

/** Budget is always in [0, 100]; a non-finite value counts as missing → 0 (worst case). */
export const clampBudget = (b: number) => (Number.isFinite(b) ? Math.min(100, Math.max(0, b)) : 0);
