// E1 goldens and engine safety rules, hand-written from docs/spec/02-engine.md before lib/engine exists.
// The E1 assertions are windows that hold for every k in the calibration grid (docs/analysis/heat-check.md),
// so seed-7 calibration can move k without breaking them.
import { describe, expect, it } from 'vitest';
import { engine } from '../lib/engine';
import { DEFAULTS } from '../lib/engine/constants';
import type {
  Activity, Carryover, CheckIn, EngineContext, EngineEvent, EngineResult, EngineState, EpochMs, Profile, ScheduleSlot,
  SessionRecord, WbgtHour,
} from '../lib/types';
import { SPEC_PARAMS } from './spec-params';

const MIN = 60_000;
const H = 60 * MIN;
/** Site time (Asia/Dubai, UTC+4) → epoch ms. */
const site = (mo: number, d: number, hh: number, mm = 0): EpochMs => Date.UTC(2026, mo - 1, d, hh - 4, mm);
const hhmm = (t: EpochMs) => new Date(t + 4 * H).toISOString().slice(11, 16);

// Hourly WBGT (sun, shade) 05:00–18:00 from docs/analysis/heat-check/hourly.csv.
const hours = (mo: number, d: number, sun: number[], shade: number[]): WbgtHour[] =>
  sun.map((s, i) => ({ t: site(mo, d, 5 + i), sun: s, shade: shade[i] }));
const JUL15 = hours(7, 15,
  [29.97, 29.2, 29.66, 30.59, 31.11, 31.92, 32.53, 33.39, 33.83, 33.9, 33.49, 33.11, 33.18, 32.51],
  [29.97, 29.15, 29.25, 29.79, 30.12, 30.74, 31.11, 31.53, 32.05, 32.55, 32.47, 32.33, 32.67, 32.21]);
const NOV07 = hours(11, 7,
  [24.28, 23.64, 23.71, 24.91, 26.16, 27.2, 27.17, 27.22, 27.66, 28.17, 27.37, 27.74, 26.64, 26.37],
  [24.28, 23.64, 23.45, 23.82, 24.7, 25.73, 25.81, 25.94, 26.01, 25.57, 26.07, 27.11, 26.33, 26.37]);

const BASE: Profile = { workerId: 'W-TEST', age: 40, acclimDays: 0, isNewArrival: true, daysAway: 0, clothing: 'workClothes', hood: false };
const NEW_D1 = BASE;
const RETURNING_D1: Profile = { ...BASE, isNewArrival: false, daysAway: 10 };
const ACCLIM: Profile = { ...BASE, isNewArrival: false, acclimDays: 30 };
const GOOD: CheckIn = { skipped: false, sleptWell: true, urine: 'pale', unwell: false };

const task = (start: EpochMs, end: EpochMs, activity: Activity): ScheduleSlot =>
  ({ kind: 'task', start, end, taskId: `t${start}`, activity, sun: true });
/** 15 Jul: work 06:00–12:30, midday ban 12:30–15:00, work 15:00–18:00. */
const julyDay = (a: Activity): ScheduleSlot[] => [
  task(site(7, 15, 6), site(7, 15, 12, 30), a),
  { kind: 'rest', start: site(7, 15, 12, 30), end: site(7, 15, 15), reason: 'midday-ban' },
  task(site(7, 15, 15), site(7, 15, 18), a),
];

interface Opts {
  profile?: Profile; scenario?: SessionRecord['scenario']; wbgt?: WbgtHour[]; schedule?: ScheduleSlot[];
  day?: [number, number]; k?: number; fasting?: boolean; checkIn?: CheckIn; forceRest?: boolean;
}
function ctx(o: Opts = {}): EngineContext {
  const [mo, d] = o.day ?? [7, 15];
  return {
    profile: o.profile ?? NEW_D1,
    session: {
      scenario: o.scenario ?? 'replay-2026-07-15',
      wbgt: o.wbgt ?? JUL15,
      schedule: o.schedule ?? julyDay('heavy'),
      shiftStart: site(mo, d, 6),
      shiftEnd: site(mo, d, 18),
    },
    fasting: o.fasting ?? false,
    checkIn: o.checkIn ?? GOOD,
    forceRestWhenLocked: o.forceRest ?? true,
    params: { ...SPEC_PARAMS, k: o.k ?? SPEC_PARAMS.k },
  };
}

/**
 * Client-style loop: each sim-minute, advanceTo(t), then apply events stamped t (they show from t + 1 min).
 * Events stamped at `from` are applied right after initState. `react` may add events from the latest result.
 */
function run(c: EngineContext, from: EpochMs, to: EpochMs, opts: {
  carry?: Carryover | null; events?: EngineEvent[]; react?: (r: EngineResult, t: EpochMs) => EngineEvent[];
} = {}): Map<EpochMs, EngineResult> {
  let s: EngineState = engine.initState(c, from, opts.carry ?? null);
  const at = (t: EpochMs) => (opts.events ?? []).filter((e) => e.simTs === t);
  for (const e of at(from)) s = engine.applyEvent(s, e, c);
  const out = new Map<EpochMs, EngineResult>();
  for (let t = from + MIN; t <= to; t += MIN) {
    const r = engine.advanceTo(s, t, c);
    s = r.state;
    out.set(t, r);
    for (const e of [...at(t), ...(opts.react?.(r, t) ?? [])]) s = engine.applyEvent(s, e, c);
  }
  return out;
}
const firstAtLeast = (rs: Map<EpochMs, EngineResult>, level: number) => [...rs].find(([, r]) => r.level >= level)?.[0];
const bandOf = (b: number) => SPEC_PARAMS.levelBands.filter((x) => b < x).length;

describe('constants.ts', () => {
  it('DEFAULTS match the spec table; k sits in the calibration grid', () => {
    expect(DEFAULTS).toEqual({ ...SPEC_PARAMS, k: DEFAULTS.k });
    expect(DEFAULTS.k).toBeGreaterThanOrEqual(0.05);
    expect(DEFAULTS.k).toBeLessThanOrEqual(0.3);
  });
});

describe('E1 goldens (any k in 0.05–0.3)', () => {
  const GRID = [0.05, 0.15, 0.3];

  it.each(GRID)('Replay 15 Jul: new day-1, heavy, double-layer woven reaches L2 before 11:00 (k=%s)', (k) => {
    const c = ctx({ k, profile: { ...NEW_D1, clothing: 'doubleLayerWoven' } });
    const t2 = firstAtLeast(run(c, site(7, 15, 6), site(7, 15, 11)), 2);
    expect(t2, 'never reached L2 by 11:00').toBeDefined();
    expect(hhmm(t2!) < '11:00').toBe(true);
  });

  it.each(GRID)('Live 7 Nov: acclimatised, moderate, work clothes, no record (start 80) stays ≤ L1 all shift (k=%s)', (k) => {
    const c = ctx({
      k, profile: ACCLIM, scenario: 'live', wbgt: NOV07, day: [11, 7],
      schedule: [task(site(11, 7, 6), site(11, 7, 18), 'moderate')],
    });
    const levels = [...run(c, site(11, 7, 6), site(11, 7, 18)).values()].map((r) => r.level);
    expect(Math.max(...levels)).toBeLessThanOrEqual(1);
  });

  it.each(GRID)('15 Jul heavy: first L2 comes new day-1 ≤ returning day-1 < acclimatised (k=%s)', (k) => {
    const t2 = (profile: Profile) => firstAtLeast(run(ctx({ k, profile }), site(7, 15, 6), site(7, 15, 18)), 2)!;
    expect(t2(NEW_D1)).toBeLessThanOrEqual(t2(RETURNING_D1));
    expect(t2(RETURNING_D1)).toBeLessThan(t2(ACCLIM));
  });

  it.todo('pitch contrast (planner-on crew, 15 Jul): golden regenerated from the calibrated engine after seed 7');
});

describe('start of day (initState)', () => {
  const nov7 = (o: Opts = {}) => ctx({ scenario: 'live', wbgt: NOV07, day: [11, 7], ...o });
  const CARRY_40: Carryover = { siteDate: '2026-11-06', endBudget: 40 };
  it.each<[string, EngineContext, Carryover | null, number]>([
    ['Replay starts at 100', ctx(), null, 100],
    ['Replay ignores carry-over', ctx(), CARRY_40, 100],
    ['Live with no record starts at 80', nov7(), null, 80],
    ['Live carry-over: 100 − 0.3 × (100 − 40)', nov7(), CARRY_40, 82],
    ['poor sleep −10 when reported', nov7({ checkIn: { ...GOOD, sleptWell: false } }), null, 70],
    ['sleep not reported: no penalty', nov7({ checkIn: { ...GOOD, sleptWell: null } }), null, 80],
    ['medium urine −5', nov7({ checkIn: { ...GOOD, urine: 'medium' } }), null, 75],
    ['skipped check-in counts as dark urine only (−15)', ctx({ checkIn: { skipped: true, sleptWell: null, urine: null, unwell: null } }), null, 85],
  ])('%s', (_label, c, carry, budget) => {
    expect(engine.initState(c, c.session.shiftStart, carry).budget).toBeCloseTo(budget, 6);
  });

  it('bands are half-open: a budget of 75 is L0, 70 is L1', () => {
    const level = (c: EngineContext) => engine.advanceTo(engine.initState(c, c.session.shiftStart, null), c.session.shiftStart, c).level;
    expect(level(nov7({ checkIn: { ...GOOD, urine: 'medium' } }))).toBe(0);
    expect(level(nov7({ checkIn: { ...GOOD, sleptWell: false } }))).toBe(1);
  });

  it('a skipped check-in floors the level at L1 (dark urine) and never sets unwell', () => {
    const c = ctx({ checkIn: { skipped: true, sleptWell: null, urine: null, unwell: null } });
    const r = run(c, site(7, 15, 6), site(7, 15, 6, 1)).get(site(7, 15, 6, 1))!;
    expect(r.state.budget).toBeGreaterThanOrEqual(75); // band says L0 …
    expect(r.level).toBe(1); //                           … the floor says L1
    expect(r.reasons[0]).toBe('dark-urine');
    expect(r.state.unwell).toBe(false);
  });
});

describe('safety rules', () => {
  it('budget stays in [0, 100] and the level never sits below its band (rises at once)', () => {
    const c = ctx({ profile: { ...NEW_D1, clothing: 'doubleLayerWoven' }, forceRest: false });
    for (const r of run(c, site(7, 15, 6), site(7, 15, 18)).values()) {
      expect(r.state.budget).toBeGreaterThanOrEqual(0);
      expect(r.state.budget).toBeLessThanOrEqual(100);
      expect(r.budgetFraction).toBeCloseTo(r.state.budget / 100, 9);
      expect(r.level).toBeGreaterThanOrEqual(bandOf(r.state.budget));
    }
  });

  it('catch-up in one jump equals minute-by-minute stepping, and runs are deterministic', () => {
    const c = ctx();
    const s0 = engine.initState(c, site(7, 15, 6), null);
    const jump = engine.advanceTo(s0, site(7, 15, 12), c);
    const steps = run(c, site(7, 15, 6), site(7, 15, 12)).get(site(7, 15, 12))!;
    expect(jump.state.budget).toBeCloseTo(steps.state.budget, 9);
    expect(jump.level).toBe(steps.level);
    expect(jump.state.latched).toBe(steps.state.latched);
    expect(engine.advanceTo(s0, site(7, 15, 12), c)).toEqual(jump);
  });

  it('an empty task list never produces recovery (gaps are moderate in sun, not Rest)', () => {
    const c = ctx({ profile: ACCLIM, schedule: [], forceRest: false });
    let prev = 100;
    for (const r of run(c, site(7, 15, 6), site(7, 15, 18)).values()) {
      expect(r.state.budget).toBeLessThanOrEqual(prev + 1e-9);
      prev = r.state.budget;
    }
    expect(prev).toBeLessThan(100);
  });

  it('unwell locks L4 at once (pre-shift too); only the worker clears it; then L2 for 15 sim-min', () => {
    const c = ctx();
    const rs = run(c, site(7, 15, 5), site(7, 15, 6), {
      events: [{ type: 'unwell', simTs: site(7, 15, 5, 10) }, { type: 'ok-buddy-checked', simTs: site(7, 15, 5, 30) }],
    });
    for (let m = 11; m <= 30; m++) {
      const r = rs.get(site(7, 15, 5, m))!;
      expect(r.level).toBe(4);
      expect(r.activityLocked).toBe(true);
      expect(r.activity).toBe('rest');
      expect(r.canClearL4).toBe(true);
    }
    for (let m = 31; m <= 44; m++) expect(rs.get(site(7, 15, 5, m))!.level).toBeGreaterThanOrEqual(2);
    expect(rs.get(site(7, 15, 5, 31))!.reasons).toContain('after-unwell');
    expect(rs.get(site(7, 15, 5, 31))!.state.unwell).toBe(false);
    expect(rs.get(site(7, 15, 5, 55))!.level).toBe(0);
  });

  it('a budget-driven L4 latches; "I\'m OK" enables only after ≥15 sim-min Rest with budget ≥18', () => {
    const c = ctx({ profile: { ...NEW_D1, clothing: 'doubleLayerWoven' } });
    let t4: EpochMs | undefined;
    const rs = run(c, site(7, 15, 6), site(7, 15, 11), {
      react: (r, t) => {
        if (t4 === undefined && r.level === 4) t4 = t;
        return t4 !== undefined && t === t4 + 17 * MIN ? [{ type: 'ok-buddy-checked', simTs: t }] : [];
      },
    });
    expect(t4).toBeDefined();
    for (let m = 0; m <= 13; m++) {
      const r = rs.get(t4! + m * MIN)!;
      expect(r.level).toBe(4);
      expect(r.activityLocked).toBe(true);
      expect(r.canClearL4).toBe(false);
      if (m > 0) expect(r.activity).toBe('rest'); // forced from the minute after L4
    }
    const ready = rs.get(t4! + 17 * MIN)!;
    expect(ready.state.budget).toBeGreaterThanOrEqual(18);
    expect(bandOf(ready.state.budget)).toBeLessThan(4); // budget recovered …
    expect(ready.level).toBe(4); //                        … but the latch holds
    expect(ready.canClearL4).toBe(true);
    const after = rs.get(t4! + 18 * MIN)!;
    expect(after.state.latched).toBe(false);
    expect(after.level).toBeGreaterThanOrEqual(2);
  });

  it('a level falls only after 5 sim-min in the lower band and 3 points past the boundary', () => {
    const c = ctx({ profile: NEW_D1 });
    let t2: EpochMs | undefined;
    const rs = run(c, site(7, 15, 6), site(7, 15, 11), {
      react: (r, t) => {
        if (t2 !== undefined || r.level < 2) return [];
        t2 = t;
        return [{ type: 'activity-tap', activity: 'rest', simTs: t }];
      },
    });
    expect(t2).toBeDefined();
    expect(rs.get(t2! + MIN)!.level).toBe(2);
    expect(rs.get(t2! + 3 * MIN)!.state.budget).toBeGreaterThanOrEqual(53);
    expect(rs.get(t2! + 3 * MIN)!.level).toBe(2);
    expect(rs.get(t2! + 9 * MIN)!.level).toBe(1);
  });

  it('fasting drains exactly 1.25× faster', () => {
    const drained = (fasting: boolean) =>
      100 - run(ctx({ profile: ACCLIM, fasting, forceRest: false }), site(7, 15, 6), site(7, 15, 8)).get(site(7, 15, 8))!.state.budget;
    expect(drained(false)).toBeGreaterThan(0);
    expect(drained(true) / drained(false)).toBeCloseTo(1.25, 2);
  });

  it('watch drop applies the unacclimatised limit (RAL) and keeps Tier 1', () => {
    const c = ctx({ profile: ACCLIM, forceRest: false });
    const at8 = (events: EngineEvent[]) => run(c, site(7, 15, 6), site(7, 15, 8), { events }).get(site(7, 15, 8))!;
    const off = at8([{ type: 'watch', mode: 'off', simTs: site(7, 15, 6) }]);
    const drop = at8([{ type: 'watch', mode: 'drop', simTs: site(7, 15, 6) }]);
    expect(drop.state.budget).toBeLessThan(off.state.budget);
    expect(drop.reasons).toContain('watch-lost');
    expect(drop.tiers).toContain(1);
    expect(drop.tiers).not.toContain(2);
  });

  it('heart rate above 0.85·(220 − age) for 5 sim-min sets at least L2', () => {
    const c = ctx({
      profile: ACCLIM, scenario: 'live', wbgt: NOV07, day: [11, 7],
      schedule: [task(site(11, 7, 6), site(11, 7, 18), 'moderate')],
    });
    const events: EngineEvent[] = [{ type: 'watch', mode: 'on', simTs: site(11, 7, 6) }];
    for (let m = 0; m <= 20; m++) events.push({ type: 'hr', bpm: 170, simTs: site(11, 7, 6, m) }); // > 153 at age 40
    const rs = run(c, site(11, 7, 6), site(11, 7, 6, 20), { carry: { siteDate: '2026-11-06', endBudget: 100 }, events });
    expect(rs.get(site(11, 7, 6, 3))!.level).toBe(0);
    expect(rs.get(site(11, 7, 6, 8))!.level).toBeGreaterThanOrEqual(2);
    expect(rs.get(site(11, 7, 6, 8))!.reasons[0]).toBe('hr-high');
  });
});
