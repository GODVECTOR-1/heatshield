import { describe, expect, it } from 'vitest';
import jul from '../../data/fixtures/2026-07-13_to_18.json';
import type { EngineContext, PlannerInput, Profile, Task } from '../types';
import { DEFAULTS, engine, planShift } from './index';
import { wbgtHour } from './wbgt';

const MIN = 60_000;
const at = (hhmm: string) => Date.parse(`2026-07-15T${hhmm}:00+04:00`);
const BAN: [number, number] = [at('12:30'), at('15:00')];
const NEW_D1_DLW: Profile = { workerId: 'W-A', age: 40, acclimDays: 0, isNewArrival: true, daysAway: 0, clothing: 'doubleLayerWoven', hood: false };
const task = (id: string, o: Partial<Task>): Task =>
  ({ id, crewId: 'c1', name: id, durationMin: 60, metabolicClass: 'moderate', sun: true, earliest: 6 * 60, latest: 18 * 60, ...o });

const input = (tasks: Task[]): PlannerInput => ({
  tasks, wbgt: jul.map(wbgtHour), shiftStart: at('06:00'), shiftEnd: at('18:00'),
  crew: [NEW_D1_DLW], fastingSafe: false, params: DEFAULTS,
});
const TASKS = [
  task('paint', { metabolicClass: 'light', sun: false, durationMin: 60 }),
  task('dig', { metabolicClass: 'heavy', durationMin: 90 }),
  task('rebar', { metabolicClass: 'moderate', durationMin: 120 }),
];
const minutes = (slots: { start: number; end: number }[]) => slots.reduce((n, s) => n + (s.end - s.start) / MIN, 0);

describe('planShift on bundled 15 Jul weather', () => {
  it('schedules a heavy sun task with an early earliest before the midday ban', () => {
    const { schedule, unscheduled } = planShift(input(TASKS), 'on');
    const dig = schedule.filter((s) => s.kind === 'task' && s.taskId === 'dig');
    expect(minutes(dig)).toBe(90);
    for (const s of dig) expect(s.end).toBeLessThanOrEqual(BAN[0]);
    expect(unscheduled).toEqual([]);
  });

  it('never puts sun work in the ban; a sun task that fits only inside it is ban-window', () => {
    const tasks = [...TASKS, task('roof', { earliest: 12 * 60 + 30, latest: 15 * 60, durationMin: 30 })];
    const { schedule, unscheduled } = planShift(input(tasks), 'on');
    for (const s of schedule) if (s.kind === 'task' && s.sun) expect(s.end <= BAN[0] || s.start >= BAN[1]).toBe(true);
    expect(unscheduled).toEqual([{ taskId: 'roof', reason: 'ban-window' }]);
  });

  it('is deterministic, chronological 15-min slots, and the engine keeps the vulnerable worker below L2 on it', () => {
    const a = planShift(input(TASKS), 'on');
    expect(planShift(input(TASKS), 'on')).toEqual(a);
    a.schedule.forEach((s, i) => {
      expect(s.end - s.start).toBeLessThanOrEqual(15 * MIN);
      if (i > 0) expect(s.start).toBe(a.schedule[i - 1].end);
    });
    const ctx: EngineContext = {
      profile: NEW_D1_DLW, fasting: false, forceRestWhenLocked: true, params: DEFAULTS,
      checkIn: { skipped: false, sleptWell: true, urine: 'pale', unwell: false },
      session: { scenario: 'replay-2026-07-15', wbgt: input([]).wbgt, schedule: a.schedule, shiftStart: at('06:00'), shiftEnd: at('18:00') },
    };
    let s = engine.initState(ctx, at('06:00'), null);
    const lastEnd = a.schedule.at(-1)!.end;
    for (let t = at('06:00') + MIN; t <= lastEnd; t += MIN) {
      const r = engine.advanceTo(s, t, ctx);
      expect(r.level, `at ${new Date(t).toISOString()}`).toBeLessThan(2);
      s = r.state;
    }
  });

  it("mode 'off' runs tasks in the given order from shift start, with the ban still enforced", () => {
    const tasks = [task('long', { durationMin: 7 * 60 }), task('after', { durationMin: 30, sun: false })];
    const { schedule, unscheduled } = planShift(input(tasks), 'off');
    expect(schedule[0]).toMatchObject({ kind: 'task', taskId: 'long', start: at('06:00') });
    expect(schedule).toContainEqual({ kind: 'rest', start: BAN[0], end: BAN[1], reason: 'midday-ban' });
    expect(minutes(schedule.filter((s) => s.kind === 'task' && s.taskId === 'long'))).toBe(7 * 60);
    expect(schedule.at(-1)).toMatchObject({ taskId: 'after', end: at('16:00') });
    expect(unscheduled).toEqual([]);
  });
});
