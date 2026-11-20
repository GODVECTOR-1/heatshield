// Levels (spec 02, Levels): bands, floors, latch, unwell lock and hysteresis.
import type { CheckIn, EngineContext, EngineParams, EngineState, EpochMs, Level, Urine } from '../types';
import { DEFAULTS } from './constants';
import { MIN } from './time';

/** Half-open bands [75,100] → 0 … [0,15) → 4. `offset` raises every boundary (the hysteresis points). */
export function bandOf(budget: number, params: EngineParams = DEFAULTS, offset = 0): Level {
  if (!Number.isFinite(budget)) return 4;
  return params.levelBands.filter((x) => budget < x + offset).length as Level;
}

/** A skipped check-in, or an unanswered urine question, counts as dark. */
export const urineOf = (c: CheckIn): Urine => (c.skipped || c.urine === null ? 'dark' : c.urine);

/** Watch dropped, or on with HR data older than hrStaleMin: Tier 2 is gone and RAL applies. */
export function watchLost(s: EngineState, t: EpochMs, p: EngineParams = DEFAULTS): boolean {
  return s.watch === 'drop' || (s.watch === 'on' && (s.lastHrAt === null || t - s.lastHrAt > p.hrStaleMin * MIN));
}

export function floorsAt(s: EngineState, t: EpochMs, ctx: EngineContext) {
  const p = ctx.params;
  return {
    urine: urineOf(ctx.checkIn) === 'dark',
    hr: s.watch === 'on' && !watchLost(s, t, p) && s.hrHighSince !== null && t - s.hrHighSince >= p.hrSustainMin * MIN,
    postClear: s.clearedAt !== null && t - s.clearedAt < p.postUnwellFloorMin * MIN,
  };
}

/** unwell ? 4 : max(band, latch 4, urine L1, HR L2, post-unwell L2). */
export function targetLevel(s: EngineState, t: EpochMs, ctx: EngineContext, offset = 0): Level {
  if (s.unwell) return 4;
  const f = floorsAt(s, t, ctx);
  return Math.max(bandOf(s.budget, ctx.params, offset), s.latched ? 4 : 0, f.urine ? 1 : 0, f.hr || f.postClear ? 2 : 0) as Level;
}

/**
 * Rises at once. Falls only after hysteresisMin in a lower target, and then only as far as the budget is
 * hysteresisPoints past the boundary.
 */
export function settle(s: EngineState, t: EpochMs, ctx: EngineContext): EngineState {
  const target = targetLevel(s, t, ctx);
  if (target >= s.level) return { ...s, level: target, levelSince: target > s.level ? t : s.levelSince, pendingLower: null };
  const since = s.pendingLower?.since ?? t;
  if (t - since >= ctx.params.hysteresisMin * MIN) {
    const past = targetLevel(s, t, ctx, ctx.params.hysteresisPoints);
    if (past < s.level) return { ...s, level: past, levelSince: t, pendingLower: null };
  }
  return { ...s, pendingLower: { level: target, since } };
}

/** "I'm OK, buddy checked" for a latched L4: ≥ l4ClearRestMin of Rest and budget ≥ l4ClearMinBudget. */
export function canClearLatch(s: EngineState, t: EpochMs, p: EngineParams = DEFAULTS): boolean {
  return s.restSince !== null && t - s.restSince >= p.l4ClearRestMin * MIN && s.budget >= p.l4ClearMinBudget;
}
