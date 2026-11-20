// Planner (spec 02, Planner): one chronological scheduler on 15-min slots for the composite vulnerable profile.
import type {
  EpochMs, PlannerInput, PlanShift, ScheduleSlot, Task, Unscheduled, UnscheduledReason,
} from '../types';
import { MIDDAY_BAN } from './constants';
import { budgetChange, clampBudget, clothingAdjC, limitC, rampFraction } from './physiology';
import { bandOf } from './risk';
import { MIN, toSiteTime } from './time';
import { wbgtAt } from './wbgt';

const SLOT = 15 * MIN;

/** [from, to) of the midday ban on the site date of `ts`, or null out of season. */
function banWindow(ts: EpochMs): [EpochMs, EpochMs] | null {
  const st = toSiteTime(ts);
  const md = st.month * 100 + st.day;
  if (md < MIDDAY_BAN.seasonFrom || md > MIDDAY_BAN.seasonTo) return null;
  return [st.midnight + MIDDAY_BAN.fromMin * MIN, st.midnight + MIDDAY_BAN.toMin * MIN];
}

export const planShift: PlanShift = (input, mode) => {
  const { tasks, wbgt, shiftStart, shiftEnd, params } = input;
  const ban = banWindow(shiftStart);
  const inBan = (s: EpochMs, e: EpochMs) => ban !== null && s < ban[1] && e > ban[0];
  const schedule: ScheduleSlot[] = [];
  const unscheduled: Unscheduled[] = [];
  const work = (t: Task, start: EpochMs, end: EpochMs) =>
    schedule.push({ kind: 'task', start, end, taskId: t.id, activity: t.metabolicClass, sun: t.sun });

  if (mode === 'off') { // comparison only: given order from shift start, ban still enforced
    let cur = shiftStart;
    for (const t of tasks) {
      let left = t.durationMin * MIN;
      while (left > 0 && cur < shiftEnd) {
        const end = Math.min(cur + SLOT, cur + left, shiftEnd);
        if (t.sun && ban && inBan(cur, end)) {
          const until = Math.min(ban[1], shiftEnd);
          schedule.push({ kind: 'rest', start: cur, end: until, reason: 'midday-ban' });
          cur = until;
          continue;
        }
        work(t, cur, end);
        left -= end - cur;
        cur = end;
      }
      if (left > 0) unscheduled.push({ taskId: t.id, reason: 'no-slot' });
    }
    return { schedule, unscheduled };
  }

  // Composite vulnerable profile: lowest ramp, highest clothing adjustment. No crew → worst case.
  const ramp = input.crew.length ? Math.min(...input.crew.map(rampFraction)) : 0;
  const adj = input.crew.length
    ? Math.max(...input.crew.map((p) => clothingAdjC(p, params)))
    : Math.max(...Object.values(params.clothingAdjC)) + params.hoodAdjC;
  /** Budget after working `t` over [from, to), and its minimum on the way. */
  const simulate = (budget: number, t: Task, from: EpochMs, to: EpochMs) => {
    let min = budget;
    for (let m = from; m < to; m += MIN) {
      const eff = wbgtAt(wbgt, m, t.sun, true).c + adj; // live = true: a missing hour is the worst case
      budget = clampBudget(budget + budgetChange(t.metabolicClass, eff, limitC(t.metabolicClass, ramp, params), input.fastingSafe, params));
      min = Math.min(min, budget);
    }
    return { budget, min };
  };

  const midnight = toSiteTime(shiftStart).midnight;
  const at = (minuteOfDay: number) => midnight + minuteOfDay * MIN;
  const left = new Map(tasks.map((t) => [t.id, t.durationMin * MIN]));
  const heaviest = [...tasks].sort((a, b) => params.metabolicW[b.metabolicClass] - params.metabolicW[a.metabolicClass]);
  const hot = new Set<string>(); //    in window, rejected for predicted level ≥ 2
  const banned = new Set<string>(); // in window, blocked by the ban
  const fit = new Set<string>(); //    in window and not banned at least once
  const drop = (t: Task, end: UnscheduledReason) => {
    left.delete(t.id);
    unscheduled.push({ taskId: t.id, reason: hot.has(t.id) ? 'too-hot' : banned.has(t.id) && !fit.has(t.id) ? 'ban-window' : end });
  };

  let budget = 100;
  let cur = shiftStart;
  while (cur < shiftEnd && left.size > 0) {
    for (const t of heaviest) {
      const rem = left.get(t.id);
      if (rem !== undefined && cur + Math.min(SLOT, rem) > at(t.latest)) drop(t, 'past-latest');
    }
    let picked: { t: Task; end: EpochMs; budget: number } | undefined;
    for (const t of heaviest) {
      const rem = left.get(t.id);
      if (rem === undefined) continue;
      const end = Math.min(cur + SLOT, cur + rem, shiftEnd);
      if (cur < at(t.earliest) || end > at(t.latest)) continue;
      if (t.sun && inBan(cur, end)) { banned.add(t.id); continue; }
      fit.add(t.id);
      const sim = simulate(budget, t, cur, end);
      if (bandOf(sim.min, params) >= 2) { hot.add(t.id); continue; }
      picked = { t, end, budget: sim.budget };
      break;
    }
    if (picked) {
      work(picked.t, cur, picked.end);
      const rem = left.get(picked.t.id)! - (picked.end - cur);
      if (rem > 0) left.set(picked.t.id, rem);
      else left.delete(picked.t.id);
      budget = picked.budget;
      cur = picked.end;
    } else {
      const end = Math.min(cur + SLOT, shiftEnd);
      const banRest = inBan(cur, end) && tasks.some((t) => t.sun && left.has(t.id));
      schedule.push({ kind: 'rest', start: cur, end, reason: banRest ? 'midday-ban' : 'planned' });
      budget = clampBudget(budget + params.restRecoveryPerMin * ((end - cur) / MIN));
      cur = end;
    }
  }
  for (const t of heaviest) if (left.has(t.id)) drop(t, 'no-slot');
  return { schedule, unscheduled };
};
