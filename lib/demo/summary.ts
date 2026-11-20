// Plan summary (spec 03, Gemini): the anonymous plan as plain facts, and the template summary used when
// Gemini is off, slow or failing. Task names, work class and times only: no names, worker ids or profiles.
import { BAN_END, BAN_START, TASKS, hhmm, mergeSlots, plan, type PlanMode } from './scenario';
import type { Activity, UnscheduledReason } from '../types';

const CLASS: Record<Activity, string> = { rest: 'rest', light: 'light', moderate: 'moderate', heavy: 'heavy', veryHeavy: 'very heavy' };
const WHY: Record<UnscheduledReason, string> = {
  'ban-window': 'it only fits in the midday ban', 'too-hot': 'too hot all day', 'no-slot': 'no free slot', 'past-latest': 'no time before its deadline',
};
const nameOf = (id: string) => TASKS.find((t) => t.id === id)?.name ?? id;
const span = (a: number, b: number) => `${hhmm(a)}–${hhmm(b)}`;

/** One line per merged slot, plus the ban and anything left out. This is all Gemini ever sees. */
export function planFacts(mode: PlanMode): string[] {
  const p = plan(mode);
  return [
    `Shift ${span(p.schedule[0]?.start ?? BAN_START, p.schedule.at(-1)?.end ?? BAN_END)} on 15 July 2026, Abu Dhabi. Midday ban on sun work ${span(BAN_START, BAN_END)}.`,
    ...mergeSlots(p.schedule).map((s) => s.kind === 'rest'
      ? `${span(s.start, s.end)} rest${s.reason === 'midday-ban' ? ' (midday ban)' : ''}`
      : `${span(s.start, s.end)} ${nameOf(s.taskId)} (${CLASS[s.activity]} work, ${s.sun ? 'sun' : 'shade'})`),
    ...p.unscheduled.map((u) => `Not scheduled: ${nameOf(u.taskId)} (${WHY[u.reason]})`),
  ];
}

/** The no-AI summary: 3–4 plain sentences built from the same plan. */
export function planSummary(mode: PlanMode): string {
  const p = plan(mode);
  const slots = mergeSlots(p.schedule);
  const byTask = new Map<string, { first: number; last: number; blocks: number; activity: Activity }>();
  for (const s of slots) {
    if (s.kind !== 'task') continue;
    const b = byTask.get(s.taskId);
    if (b) { b.last = s.end; b.blocks++; } else byTask.set(s.taskId, { first: s.start, last: s.end, blocks: 1, activity: s.activity });
  }
  const line = ([id, b]: [string, { first: number; last: number; blocks: number }]) =>
    `${nameOf(id)} ${span(b.first, b.last)}${b.blocks > 1 ? ` in ${b.blocks} short blocks` : ''}`;
  const all = [...byTask];
  const heavy = all.filter(([, b]) => b.activity === 'heavy' || b.activity === 'veryHeavy');
  const lighter = all.filter(([, b]) => b.activity !== 'heavy' && b.activity !== 'veryHeavy');
  const rests = slots.filter((s) => s.kind === 'rest' && s.reason === 'planned').length;
  return [
    heavy.length && `Heavy work: ${heavy.map(line).join('; ')}.`,
    lighter.length && `Lighter work: ${lighter.map(line).join('; ')}.`,
    `${rests ? `${rests} planned rest breaks` : 'No planned rest breaks'}, and no sun work in the midday ban (${span(BAN_START, BAN_END)}).`,
    p.unscheduled.length ? `Left out today: ${p.unscheduled.map((u) => `${nameOf(u.taskId)} (${WHY[u.reason]})`).join('; ')}.` : 'Every task fits in the shift.',
  ].filter(Boolean).join(' ');
}
