// Truth model (spec 08): heat storage with a per-worker sweat capacity. Ours, not validated, frozen before seed 42.
// Must not import engine physiology (physiology.ts, risk.ts): only the hourly WBGT is shared input.
import type { Activity, Clothing, Urine } from '../types';

/** Metabolic heat by activity (W), rest included. */
const MET_W: Record<Activity, number> = { rest: 100, light: 180, moderate: 300, heavy: 415, veryHeavy: 520 };
/** PPE: its clothing adjustment (°C on WBGT). */
const PPE_C: Record<Clothing, number> = { workClothes: 0, clothCoveralls: 0, doubleLayerWoven: 3, polyolefinCoveralls: 1 };
/** Start-of-day fluid by urine colour: less fluid, less sweat. */
const FLUID: Record<Urine, number> = { pale: 1, medium: 0.95, dark: 0.88 };
/**
 * Evaporative cooling = capacity × K × (T_REF − effective WBGT), W. Anchors (not fitted to any result): an average
 * acclimatised worker (capacity 1.25) balances 300 W at 28.2 °C (NIOSH REL, moderate) and cools ~700 W at WBGT 20.
 * That lands within ~1 °C of NIOSH REL for light/heavy and of RAL for unacclimatised (capacity 1.0).
 */
const K_W_PER_C = 38.7;
const T_REF_C = 34.4;
/**
 * Sweat response: extra cooling per °C of core above rest, × capacity; core settles at 37 + excess ÷ (capacity × G).
 * Chosen from 150–300 on seed 7 by event prevalence alone (target 10–25 % of worker-days: 200 → 20.7 %), then frozen.
 */
const SWEAT_GAIN_W_PER_C = 200;
/** 75 kg × 3.49 kJ/(kg·°C). */
const BODY_J_PER_C = 75 * 3490;

export const CORE_START_C = 37;
export const EVENT_CORE_C = 38.5;

export interface TruthWorker {
  age: number;
  /** Days in heat this stint (static, like the engine's seeded value). */
  acclimDays: number;
  fasting: boolean;
  clothing: Clothing;
  /** Per-worker sweat capacity ~ N(1.0, 0.15). */
  sweat: number;
}

/** Effect-size multipliers for the robustness sweep; 1 = the stated model. */
export interface Effects { acclim: number; fasting: number }

/** Sweat capacity for one day: age −0.5 %/yr over 40, fasting −10 % fluid, acclimatisation +2.5 %/day up to +25 %. */
export function sweatCapacity(w: TruthWorker, urine: Urine, fx: Effects): number {
  return w.sweat
    * (1 + fx.acclim * Math.min(0.25, 0.025 * w.acclimDays))
    * (1 - 0.005 * Math.max(0, w.age - 40))
    * FLUID[urine]
    * (w.fasting ? 1 - 0.1 * fx.fasting : 1);
}

/** Core temperature after one minute of `activity` at WBGT `wbgt` (°C). Never below the resting core. */
export function coreAfterMinute(core: number, activity: Activity, wbgt: number, clothing: Clothing, capacity: number): number {
  const coolingW = capacity * (K_W_PER_C * (T_REF_C - (wbgt + PPE_C[clothing])) + SWEAT_GAIN_W_PER_C * (core - CORE_START_C));
  const storedW = MET_W[activity] - coolingW;
  return Math.max(CORE_START_C, core + (storedW * 60) / BODY_J_PER_C);
}
