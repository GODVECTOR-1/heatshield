// Evidence simulator (spec 08): seeded population × the two shoulder windows, engine vs B1 vs truth. Pure, no I/O.
import may from '../../data/fixtures/2026-05-25_to_29.json';
import oct from '../../data/fixtures/2026-10-08_to_12.json';
import { DEFAULTS, engine, planShift } from '../engine';
import { MIN, toSiteTime } from '../engine/time';
import { wbgtAt, wbgtHour } from '../engine/wbgt';
import type {
  Activity, Carryover, Clothing, EngineContext, EngineParams, EpochMs, EvidenceReport, FairnessCell, FairnessGroup,
  FairnessResult, MetricSet, PlannerMetric, Profile, ScheduleSlot, Task, Urine, WbgtHour, WeatherHour,
} from '../types';
import { CORE_START_C, coreAfterMinute, EVENT_CORE_C, sweatCapacity, type Effects, type TruthWorker } from './truth';

export const CALIBRATION_SEED = 7;
export const REPORT_SEED = 42;
const SHIFT_MIN = 12 * 60; // 06:00–18:00 site time
const LEAD_CAP_MIN = 60;
const MIN_EVENTS = 30;
const CREW_SIZE = 10;
const STATED: Effects = { acclim: 1, fasting: 1 };
const CLOTHING: Clothing[] = ['workClothes', 'doubleLayerWoven', 'polyolefinCoveralls'];
const AGE_BANDS = ['20–29', '30–39', '40–49', '50+'];

// ─── Weather: whole site days, shared hourly WBGT ─────────────────────────────

interface Day {
  date: string;
  start: EpochMs;
  end: EpochMs;
  wbgt: WbgtHour[];
  /** Per shift minute: interpolated sun/shade WBGT, and the plain hourly sun value B1 sees. */
  sun: number[];
  shade: number[];
  hourlySun: number[];
}

function toDays(rows: WeatherHour[]): Day[] {
  const byDate = new Map<string, WbgtHour[]>();
  for (const r of rows) {
    const date = toSiteTime(r.t).date;
    byDate.set(date, [...(byDate.get(date) ?? []), wbgtHour(r)]);
  }
  return [...byDate].map(([date, wbgt]) => {
    const start = toSiteTime(wbgt[0].t).midnight + 6 * 60 * MIN;
    const minute = (i: number) => start + i * MIN;
    const at = (i: number, sun: boolean) => wbgtAt(wbgt, minute(i), sun, true).c;
    const idx = [...Array(SHIFT_MIN).keys()];
    return {
      date, start, end: start + SHIFT_MIN * MIN, wbgt,
      sun: idx.map((i) => at(i, true)),
      shade: idx.map((i) => at(i, false)),
      hourlySun: idx.map((i) => wbgt[toSiteTime(minute(i)).hour].sun ?? Number.POSITIVE_INFINITY),
    };
  });
}

const DAYS = [...toDays(may as WeatherHour[]), ...toDays(oct as WeatherHour[])];
export const WEATHER_WINDOWS = ['2026-05-25..2026-05-29', '2026-10-08..2026-10-12'];

// ─── A typical construction day: sun blocks between shade work; planner-off order fills the shift exactly ──

const task = (id: string, name: string, durationMin: number, metabolicClass: Task['metabolicClass'], sun: boolean, earliest = 6 * 60, latest = 18 * 60): Task =>
  ({ id, crewId: 'sim', name, durationMin, metabolicClass, sun, earliest, latest });
export const TASKS: Task[] = [
  task('t1', 'Carry rebar bundles', 30, 'veryHeavy', true),
  task('t2', 'Pour slab edge forms', 90, 'heavy', true, 6 * 60, 12 * 60),
  task('t3', 'Sort and oil panels', 60, 'light', false),
  task('t4', 'Tie rebar mats', 120, 'moderate', true),
  task('t5', 'Measure and mark out', 90, 'light', false),
  task('t6', 'Strip column forms', 120, 'moderate', true),
  task('t7', 'Inspect and stack panels', 60, 'light', false),
  task('t8', 'Lay blockwork', 90, 'moderate', true),
  task('t9', 'Clean up', 60, 'light', false),
];

/** Joins back-to-back slots of the same task or rest (the engine reads them the same; fewer slots, faster steps). */
function merged(schedule: ScheduleSlot[]): ScheduleSlot[] {
  return schedule.reduce<ScheduleSlot[]>((acc, s) => {
    const last = acc[acc.length - 1];
    const same = last && last.end === s.start && (s.kind === 'task'
      ? last.kind === 'task' && last.taskId === s.taskId && last.activity === s.activity
      : last.kind === 'rest' && last.reason === s.reason);
    if (same) acc[acc.length - 1] = { ...last, end: s.end };
    else acc.push(s);
    return acc;
  }, []);
}

const plan = (d: Day, mode: 'on' | 'off', crew: Profile[], fastingSafe: boolean) => {
  const p = planShift({ tasks: TASKS, wbgt: d.wbgt, shiftStart: d.start, shiftEnd: d.end, crew, fastingSafe, params: DEFAULTS }, mode);
  return { schedule: merged(p.schedule), unscheduled: p.unscheduled };
};
const OFF = DAYS.map((d) => plan(d, 'off', [], false).schedule);

type Doing = { activity: Activity; sun: boolean };
/** Same rule as the engine: the slot at `m`; Rest is shade; gaps use the last task, else moderate in sun. */
function doingAt(schedule: ScheduleSlot[], m: EpochMs): Doing {
  let last: Doing | null = null;
  let lastEnd = -Infinity;
  for (const s of schedule) {
    if (s.start <= m && m < s.end) return s.kind === 'rest' ? { activity: 'rest', sun: false } : { activity: s.activity, sun: s.sun };
    if (s.kind === 'task' && s.end <= m && s.end > lastEnd) { last = { activity: s.activity, sun: s.sun }; lastEnd = s.end; }
  }
  return last ?? { activity: 'moderate', sun: true };
}
const OFF_DOING = DAYS.map((d, di) => [...Array(SHIFT_MIN).keys()].map((i) => doingAt(OFF[di], d.start + i * MIN)));

// ─── Population (seeded; never Math.random) ────────────────────────────────────

/** mulberry32: a small seeded PRNG, uniform in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SimWorker extends TruthWorker {
  profile: Profile;
  ageBand: string;
  acclimatised: boolean;
  /** Start-of-day hydration per day; the check-in reports it. */
  urine: Urine[];
}

function population(seed: number, n: number): SimWorker[] {
  const rnd = mulberry32(seed);
  const normal = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  return Array.from({ length: n }, (_, i) => {
    const band = Math.floor(rnd() * 4);
    const age = 20 + band * 10 + Math.floor(rnd() * 10);
    const kind = rnd(); // < 0.25 new arrival, < 0.5 returner after ≥ 7 days away, else acclimatised
    const isNewArrival = kind < 0.25;
    const returner = !isNewArrival && kind < 0.5;
    const ramp = Math.floor(rnd() * 5);
    const acclimDays = isNewArrival ? ramp : returner ? Math.min(ramp, 3) : 10 + Math.floor(rnd() * 110);
    const daysAway = returner ? 7 + Math.floor(rnd() * 24) : isNewArrival ? 0 : Math.floor(rnd() * 7);
    const fasting = rnd() < 0.3;
    const clothing = CLOTHING[Math.floor(rnd() * CLOTHING.length)];
    const sweat = Math.min(1.45, Math.max(0.55, 1 + 0.15 * normal()));
    const urine = DAYS.map((): Urine => { const u = rnd(); return u < 0.6 ? 'pale' : u < 0.9 ? 'medium' : 'dark'; });
    return {
      age, acclimDays, fasting, clothing, sweat, urine,
      ageBand: AGE_BANDS[band], acclimatised: !isNewArrival && !returner,
      profile: { workerId: `W-${seed}-${i}`, age, acclimDays, isNewArrival, daysAway, clothing, hood: false },
    };
  });
}

// ─── Runs ─────────────────────────────────────────────────────────────────────

function ctxFor(w: SimWorker, d: Day, di: number, schedule: ScheduleSlot[], params: EngineParams, forceRest: boolean): EngineContext {
  return {
    profile: w.profile,
    session: { scenario: 'live', wbgt: d.wbgt, schedule, shiftStart: d.start, shiftEnd: d.end },
    fasting: w.fasting,
    checkIn: { skipped: false, sleptWell: null, urine: w.urine[di], unwell: false }, // Tier 0 + 1, watch off
    forceRestWhenLocked: forceRest,
    params,
  };
}

/** Open-loop engine on planner-off: per day, 1 where the level is ≥ 2 at the end of that shift minute. Live carry-over between days. */
function engineAlerts(w: SimWorker, params: EngineParams): Uint8Array[] {
  let carry: Carryover | null = null;
  return DAYS.map((d, di) => {
    const ctx = ctxFor(w, d, di, OFF[di], params, false);
    let s = engine.initState(ctx, d.start, carry);
    const alert = new Uint8Array(SHIFT_MIN);
    for (let i = 0; i < SHIFT_MIN; i++) {
      const r = engine.advanceTo(s, d.start + (i + 1) * MIN, ctx);
      s = r.state;
      alert[i] = r.level >= 2 ? 1 : 0;
    }
    carry = { siteDate: d.date, endBudget: s.budget };
    return alert;
  });
}

/** Open-loop truth on planner-off: per day, the first shift minute with core ≥ 38.5 °C, or −1. */
function truthEvents(w: SimWorker, fx: Effects): number[] {
  return DAYS.map((d, di) => {
    const cap = sweatCapacity(w, w.urine[di], fx);
    let core = CORE_START_C;
    for (let i = 0; i < SHIFT_MIN; i++) {
      const { activity, sun } = OFF_DOING[di][i];
      core = coreAfterMinute(core, activity, sun ? d.sun[i] : d.shade[i], w.clothing, cap);
      if (core >= EVENT_CORE_C) return i;
    }
    return -1;
  });
}

const b1Alerts = (threshold: number) => DAYS.map((d) => Uint8Array.from(d.hourlySun, (x) => (x >= threshold ? 1 : 0)));

/** Task slots in [from, to) become Light (same task id and sun): the L3 "light task" advice. */
function withLight(schedule: ScheduleSlot[], from: EpochMs, to: EpochMs): ScheduleSlot[] {
  return schedule.flatMap((s): ScheduleSlot[] => {
    if (s.kind !== 'task' || s.end <= from || s.start >= to) return [s];
    const parts: ScheduleSlot[] = [];
    if (s.start < from) parts.push({ ...s, end: from });
    parts.push({ ...s, start: Math.max(s.start, from), end: Math.min(s.end, to), activity: 'light' });
    if (s.end > to) parts.push({ ...s, start: to });
    return parts;
  });
}

/**
 * Closed-loop day: the worker follows the advice (Rest 15 min at L ≥ 2, then a light task if it was L3; L4 stops work
 * for the day, as the engine forces Rest while latched), and the truth model runs on what was actually done.
 */
function closedLoopDay(w: SimWorker, d: Day, di: number, planned: ScheduleSlot[], carry: Carryover | null) {
  let schedule = planned;
  let ctx = ctxFor(w, d, di, schedule, DEFAULTS, true);
  let r = engine.advanceTo(engine.initState(ctx, d.start, carry), d.start, ctx);
  const cap = sweatCapacity(w, w.urine[di], STATED);
  const worked = new Map<string, number>();
  let core = CORE_START_C;
  let level2PlusEvents = 0;
  let truthEvents = 0;
  for (let i = 0; i < SHIFT_MIN; i++) {
    const m = d.start + i * MIN;
    const now = doingAt(schedule, m);
    const slot = planned.find((s) => s.start <= m && m < s.end);
    if (slot?.kind === 'task' && r.activity === slot.activity) worked.set(slot.taskId, (worked.get(slot.taskId) ?? 0) + 1);
    const before = core;
    core = coreAfterMinute(core, r.activity, r.activity !== 'rest' && now.sun ? d.sun[i] : d.shade[i], w.clothing, cap);
    if (before < EVENT_CORE_C && core >= EVENT_CORE_C) truthEvents++;
    const prev = r.level;
    const t = m + MIN;
    r = engine.advanceTo(r.state, t, ctx);
    if (prev < 2 && r.level >= 2) level2PlusEvents++;
    if (r.level >= 2 && r.activity !== 'rest') {
      if (r.level === 3) {
        schedule = withLight(schedule, t + 15 * MIN, t + 30 * MIN);
        ctx = { ...ctx, session: { ...ctx.session, schedule } };
      }
      r = engine.advanceTo(engine.applyEvent(r.state, { type: 'activity-tap', activity: 'rest', simTs: t }, ctx), t, ctx);
    }
  }
  const tasksCompleted = TASKS.filter((tk) => (worked.get(tk.id) ?? 0) >= tk.durationMin).length;
  return { endBudget: r.state.budget, level2PlusEvents, truthEvents, tasksCompleted };
}

function plannerMetric(pop: SimWorker[], mode: 'on' | 'off'): PlannerMetric {
  const total: PlannerMetric = { tasksCompleted: 0, level2PlusEvents: 0, truthEvents: 0 };
  for (let c = 0; c < pop.length; c += CREW_SIZE) {
    const crew = pop.slice(c, c + CREW_SIZE);
    const carry = new Map<SimWorker, Carryover | null>();
    DAYS.forEach((d, di) => {
      const schedule = mode === 'off' ? OFF[di] : plan(d, 'on', crew.map((w) => w.profile), crew.some((w) => w.fasting)).schedule;
      for (const w of crew) {
        const out = closedLoopDay(w, d, di, schedule, carry.get(w) ?? null);
        carry.set(w, { siteDate: d.date, endBudget: out.endBudget });
        total.tasksCompleted += out.tasksCompleted;
        total.level2PlusEvents += out.level2PlusEvents;
        total.truthEvents += out.truthEvents;
      }
    });
  }
  return total;
}

// ─── Metrics (unit: worker-day) ───────────────────────────────────────────────

interface WorkerDay { w: SimWorker; event: number; engine: Uint8Array; b1: Uint8Array }

/** Detected = an alert active in the 60 min up to the event; lead = event − onset of that alert episode, capped at 60. */
function detect(event: number, alert: Uint8Array): number | null {
  const from = Math.max(0, event - LEAD_CAP_MIN);
  let j = event;
  while (j >= from && !alert[j]) j--;
  if (j < from) return null;
  while (j > 0 && alert[j - 1]) j--;
  return Math.min(LEAD_CAP_MIN, event - j);
}

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const r3 = (x: number) => Math.round(x * 1000) / 1000;

function metricSet(rows: WorkerDay[], which: 'engine' | 'b1'): MetricSet {
  const leads: number[] = [];
  let eventDays = 0;
  let falseAlarms = 0;
  for (const row of rows) {
    const alert = row[which];
    if (row.event >= 0) {
      eventDays++;
      const lead = detect(row.event, alert);
      if (lead !== null) leads.push(lead);
    } else if (alert.includes(1)) falseAlarms++;
  }
  const nonEventDays = rows.length - eventDays;
  return {
    sensitivity: eventDays ? r3(leads.length / eventDays) : 0,
    falseAlarmRate: nonEventDays ? r3(falseAlarms / nonEventDays) : 0,
    leadTimeMedianMin: median(leads),
    eventDays,
    nonEventDays,
  };
}

/** Youden's J on unrounded counts; ties go to the lower false-alarm rate. */
function youden(rows: WorkerDay[], which: 'engine' | 'b1') {
  let hits = 0, events = 0, fa = 0;
  for (const row of rows) {
    if (row.event >= 0) { events++; if (detect(row.event, row[which]) !== null) hits++; }
    else if (row[which].includes(1)) fa++;
  }
  const far = fa / Math.max(1, rows.length - events);
  return { j: hits / Math.max(1, events) - far, far };
}
const better = (a: { j: number; far: number }, b: { j: number; far: number }) => a.j > b.j + 1e-12 || (Math.abs(a.j - b.j) <= 1e-12 && a.far < b.far);

function workerDays(pop: SimWorker[], alerts: Uint8Array[][], b1: Uint8Array[], fx: Effects): WorkerDay[] {
  return pop.flatMap((w, wi) => truthEvents(w, fx).map((event, di) => ({ w, event, engine: alerts[wi][di], b1: b1[di] })));
}

// ─── Calibration (seed 7) and report (seed 42) ────────────────────────────────

export interface Calibration {
  workers: number;
  thresholdC: number;
  /** k the seed-7 grid would pick with the same objective; reported only, DEFAULTS.k stays. */
  bestK: number;
  kGrid: { k: number; j: number; falseAlarmRate: number }[];
  /** Truth event prevalence on seed 7 (share of worker-days). */
  prevalence: number;
}

export function calibrate(workers: number): Calibration {
  const pop = population(CALIBRATION_SEED, workers);
  const truth = pop.map((w) => truthEvents(w, STATED));
  const rowsFor = (alerts: Uint8Array[][], b1: Uint8Array[]) =>
    pop.flatMap((w, wi) => truth[wi].map((event, di) => ({ w, event, engine: alerts[wi][di], b1: b1[di] })));
  const none = pop.map(() => DAYS.map(() => new Uint8Array(SHIFT_MIN)));

  let thresholdC = 28;
  let best = { j: -Infinity, far: Infinity };
  for (let i = 0; i <= 40; i++) {
    const th = Math.round((28 + 0.1 * i) * 10) / 10;
    const score = youden(rowsFor(none, b1Alerts(th)), 'b1');
    if (better(score, best)) { best = score; thresholdC = th; }
  }

  const kGrid = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3].map((k) => {
    const params = { ...DEFAULTS, k };
    const s = youden(rowsFor(pop.map((w) => engineAlerts(w, params)), b1Alerts(thresholdC)), 'engine');
    return { k, j: r3(s.j), falseAlarmRate: r3(s.far), raw: s };
  });
  const bestK = kGrid.reduce((a, b) => (better(b.raw, a.raw) ? b : a)).k;
  const events = truth.flat().filter((e) => e >= 0).length;
  return { workers, thresholdC, bestK, kGrid: kGrid.map(({ raw: _raw, ...g }) => g), prevalence: r3(events / truth.flat().length) };
}

type Cell = { value: string; is: (w: SimWorker) => boolean };
const GROUPS: [FairnessGroup, Cell[]][] = [
  ['age', AGE_BANDS.map((b) => ({ value: b, is: (w: SimWorker) => w.ageBand === b }))],
  ['acclimatised', [
    { value: 'unacclimatised', is: (w) => !w.acclimatised },
    { value: 'acclimatised', is: (w) => w.acclimatised },
  ]],
  ['fasting', [{ value: 'fasting', is: (w) => w.fasting }, { value: 'not fasting', is: (w) => !w.fasting }]],
  ['ppe', CLOTHING.map((c) => ({ value: c, is: (w: SimWorker) => w.clothing === c }))],
];

/** One sentence naming the parameter that would close the gap. Never applied here. */
function fixNote(group: FairnessGroup, cells: FairnessCell[], sensitivityFails: boolean): string {
  const pick = sensitivityFails
    ? cells.reduce((a, b) => (b.engine.sensitivity < a.engine.sensitivity ? b : a))
    : cells.reduce((a, b) => (b.engine.falseAlarmRate > a.engine.falseAlarmRate ? b : a));
  const what = sensitivityFails ? `misses more events for ${pick.value}` : `false-alarms more for ${pick.value}`;
  const fix = {
    ppe: `${sensitivityFails ? 'raise' : 'lower'} clothingAdjC.${pick.value} in lib/engine/constants.ts`,
    fasting: `${sensitivityFails === (pick.value === 'fasting') ? 'raise' : 'lower'} fastingDrainMultiplier`,
    acclimatised: `${sensitivityFails ? 'lower' : 'raise'} the acclimatisation ramp (rampFraction) for ${pick.value} workers`,
    age: 'add an age input to the limit, which the engine lacks at Tier 0–1',
  }[group];
  return `To close the gap, ${fix}, then re-run seed 7 (the engine ${what}).`;
}

function fairness(rows: WorkerDay[]): FairnessResult[] {
  return GROUPS.map(([group, defs]) => {
    const cells = defs.map(({ value, is }): FairnessCell & { nonEventDays: number } => {
      const m = metricSet(rows.filter((r) => is(r.w)), 'engine');
      return { group, value, engine: { sensitivity: m.sensitivity, falseAlarmRate: m.falseAlarmRate }, events: m.eventDays, insufficient: m.eventDays < MIN_EVENTS, nonEventDays: m.nonEventDays };
    });
    const gapPp = (xs: number[]) => (xs.length < 2 ? 0 : Math.round((Math.max(...xs) - Math.min(...xs)) * 1000) / 10);
    const sensitivityGapPp = gapPp(cells.filter((c) => !c.insufficient).map((c) => c.engine.sensitivity));
    const falseAlarmGapPp = gapPp(cells.filter((c) => c.nonEventDays >= MIN_EVENTS).map((c) => c.engine.falseAlarmRate));
    const pass = sensitivityGapPp <= 10 && falseAlarmGapPp <= 10;
    const ok = cells.filter((c) => !c.insufficient);
    return {
      group,
      cells: cells.map(({ nonEventDays: _n, ...c }) => c),
      sensitivityGapPp,
      falseAlarmGapPp,
      pass,
      fixNote: pass ? null : fixNote(group, ok.length >= 2 ? ok : cells, sensitivityGapPp > 10),
    };
  });
}

export type SimReport = Omit<EvidenceReport, 'paramsHash' | 'generatedAt'>;

export function buildReport(workers: number, cal: Calibration): SimReport {
  const pop = population(REPORT_SEED, workers);
  const alerts = pop.map((w) => engineAlerts(w, DEFAULTS));
  const b1 = b1Alerts(cal.thresholdC);
  const rows = workerDays(pop, alerts, b1, STATED);
  const engineSet = metricSet(rows, 'engine');
  const unacc = rows.filter((r) => !r.w.acclimatised);
  const robustness = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((m) => {
    const swept = workerDays(pop, alerts, b1, { acclim: m, fasting: m });
    return { acclimEffect: m, fastingEffect: m, engineSensitivity: metricSet(swept, 'engine').sensitivity, b1Sensitivity: metricSet(swept, 'b1').sensitivity };
  });
  return {
    seed: REPORT_SEED,
    calibrationSeed: CALIBRATION_SEED,
    workers,
    days: DAYS.length,
    weatherWindows: WEATHER_WINDOWS,
    headline: {
      claimKey: 'evidence.claim',
      unacclimatisedEngineSensitivity: metricSet(unacc, 'engine').sensitivity,
      unacclimatisedB1Sensitivity: metricSet(unacc, 'b1').sensitivity,
    },
    engine: engineSet,
    b1: { ...metricSet(rows, 'b1'), thresholdC: cal.thresholdC },
    b0: { truthEventDays: engineSet.eventDays }, // midday ban only: not in force 25–29 May or 8–12 Oct
    fairness: fairness(rows),
    robustness,
    planner: { on: plannerMetric(pop, 'on'), off: plannerMetric(pop, 'off') },
    limitations: ['evidence.limit.truthModel', 'evidence.limit.wbgtNotValidated', 'evidence.limit.simulatedWorkers', 'evidence.limit.twoWindows'],
  };
}
