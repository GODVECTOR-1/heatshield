// HeatShield engine (spec 02): pure, deterministic, 1 sim-minute steps. Implements EngineApi from lib/types.ts.
import type {
  Activity, EngineApi, EngineContext, EngineResult, EngineState, EpochMs, ReasonChip, ScheduleSlot, Tier,
} from '../types';
import { budgetChange, clampBudget, clothingAdjC, limitC, rampFraction } from './physiology';
import { bandOf, canClearLatch, floorsAt, settle, targetLevel, urineOf, watchLost } from './risk';
import { HOUR, MIN, toSiteTime } from './time';
import { wbgtAt } from './wbgt';

export { DEFAULTS } from './constants';
export { planShift } from './planner';

type Doing = { activity: Activity; sun: boolean };
const REST: Doing = { activity: 'rest', sun: false };

/** Scheduled activity at `m`. Gaps use the last task's class, or moderate in sun; never Rest. */
function scheduled(schedule: ScheduleSlot[], m: EpochMs): Doing {
  let last: Extract<ScheduleSlot, { kind: 'task' }> | undefined;
  for (const slot of schedule) {
    if (slot.start <= m && m < slot.end) return slot.kind === 'rest' ? REST : { activity: slot.activity, sun: slot.sun };
    if (slot.kind === 'task' && slot.end <= m && (!last || slot.end > last.end)) last = slot;
  }
  return last ? { activity: last.activity, sun: last.sun } : { activity: 'moderate', sun: true };
}

const locked = (s: EngineState, ctx: EngineContext) => ctx.forceRestWhenLocked && (s.unwell || s.level === 4);

/** Effective activity for the minute starting at `m`: forced Rest, a Rest tap (15 sim-min), or the schedule. */
function doingAt(s: EngineState, m: EpochMs, ctx: EngineContext): Doing {
  if (locked(s, ctx)) return REST;
  if (s.restTapAt !== null && m >= s.restTapAt && m - s.restTapAt < ctx.params.restTapRevertMin * MIN) return REST;
  return scheduled(ctx.session.schedule, m);
}

/** One sim-minute [t − 1 min, t). Budget moves only inside the shift; rest, unwell and latch timers always run. */
function step(s: EngineState, t: EpochMs, ctx: EngineContext): EngineState {
  const p = ctx.params;
  const m = t - MIN;
  const { activity, sun } = doingAt(s, m, ctx);
  let budget = s.budget;
  if (m >= ctx.session.shiftStart && m < ctx.session.shiftEnd) {
    if (activity === 'rest') budget += p.restRecoveryPerMin;
    else {
      const eff = wbgtAt(ctx.session.wbgt, m, sun, ctx.session.scenario === 'live').c + clothingAdjC(ctx.profile, p);
      const ramp = watchLost(s, m, p) ? 0 : rampFraction(ctx.profile);
      budget += budgetChange(activity, eff, limitC(activity, ramp, p), ctx.fasting, p);
    }
  }
  budget = clampBudget(budget);
  return settle({
    ...s,
    budget,
    latched: s.latched || bandOf(budget, p) === 4,
    restSince: activity === 'rest' ? s.restSince ?? m : null,
    lastSimTs: t,
  }, t, ctx);
}

function result(s: EngineState, ctx: EngineContext): EngineResult {
  const t = s.lastSimTs;
  const f = floorsAt(s, t, ctx);
  const lost = watchLost(s, t, ctx.params);
  const { activity } = doingAt(s, t, ctx);
  const reasons: ReasonChip[] = [];
  if (!s.unwell) { // a floor chip shows only when that floor is what sets the level
    if (f.hr && s.level === 2) reasons.push('hr-high');
    if (f.postClear && s.level === 2) reasons.push('after-unwell');
    if (f.urine && s.level === 1) reasons.push('dark-urine');
  }
  if (lost) reasons.push('watch-lost');
  if (wbgtAt(ctx.session.wbgt, t, true, ctx.session.scenario === 'live').fallback) reasons.push('no-forecast');
  if (activity === 'rest') reasons.push('recovering');
  const tiers: Tier[] = [0];
  if (!ctx.checkIn.skipped) tiers.push(1);
  if (s.watch === 'on' && !lost) tiers.push(2);
  return {
    state: s,
    level: s.level,
    reasons,
    tiers,
    activity,
    activityLocked: locked(s, ctx),
    canClearL4: s.unwell || (s.latched && canClearLatch(s, t, ctx.params)),
    budgetFraction: s.budget / 100,
  };
}

export const engine: EngineApi = {
  initState(ctx, startSimTs, carry) {
    const p = ctx.params;
    const c = ctx.checkIn;
    const yesterday = toSiteTime(startSimTs - 24 * HOUR).date;
    let budget = ctx.session.scenario !== 'live' ? 100
      : carry && carry.siteDate === yesterday ? 100 - p.carryoverFactor * (100 - clampBudget(carry.endBudget))
      : p.startBudgetNoRecord;
    if (c.sleptWell === false) budget -= p.poorSleepPenalty;
    budget = clampBudget(budget - p.urinePenalty[urineOf(c)]);
    const s: EngineState = {
      v: 1, budget, level: 0, levelSince: startSimTs, pendingLower: null,
      latched: bandOf(budget, p) === 4, unwell: c.unwell === true, clearedAt: null,
      restSince: null, restTapAt: null, watch: 'off', lastHrAt: null, hrHighSince: null, lastSimTs: startSimTs,
    };
    return { ...s, level: targetLevel(s, startSimTs, ctx) };
  },

  applyEvent(s, e, ctx) {
    const p = ctx.params;
    switch (e.type) {
      case 'unwell':
        return { ...s, unwell: true, level: 4, levelSince: s.level === 4 ? s.levelSince : e.simTs, pendingLower: null };
      case 'ok-buddy-checked': {
        const clearLatch = s.latched && canClearLatch(s, e.simTs, p);
        if (!s.unwell && !clearLatch) return s; // button not enabled: nothing to clear
        const next: EngineState = { ...s, unwell: false, latched: s.latched && !clearLatch, clearedAt: e.simTs, pendingLower: null };
        const level = targetLevel(next, e.simTs, ctx); // the computed level at once, floored at L2 for 15 sim-min
        return { ...next, level, levelSince: level === s.level ? s.levelSince : e.simTs };
      }
      case 'activity-tap':
        return { ...s, restTapAt: e.activity === 'rest' ? e.simTs : null };
      case 'hr': {
        if (!Number.isFinite(e.bpm)) return s; // no reading: the stale-data rule takes over
        const high = e.bpm > p.hrFractionOfMax * (220 - ctx.profile.age);
        const continuous = s.lastHrAt !== null && e.simTs - s.lastHrAt <= p.hrStaleMin * MIN;
        return { ...s, lastHrAt: e.simTs, hrHighSince: !high ? null : continuous ? s.hrHighSince ?? e.simTs : e.simTs };
      }
      case 'watch':
        return { ...s, watch: e.mode };
    }
  },

  advanceTo(s, toSimTs, ctx) {
    let st = s;
    for (let t = s.lastSimTs + MIN; t <= toSimTs; t += MIN) st = step(st, t, ctx);
    return result(st, ctx);
  },
};
