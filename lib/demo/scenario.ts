// One-click demo (spec 07): the 15 Jul 2026 replay, run entirely in the page. Pure: no React, no Date getters.
// The crew, tasks and check-ins are invented demo data; the weather is the bundled Open-Meteo archive.
import jul from '../../data/fixtures/2026-07-13_to_18.json';
import { DEFAULTS, engine, planShift } from '../engine';
import { MIDDAY_BAN } from '../engine/constants';
import { clothingAdjC, rampFraction } from '../engine/physiology';
import { MIN, toSiteTime } from '../engine/time';
import { wbgtHour } from '../engine/wbgt';
import type {
  AckState, Activity, BoardTileState, CardView, CheckIn, EngineContext, EngineResult, EngineState, EpochMs, Level,
  MainAction, PlannerMetric, Profile, ScheduleSlot, SupervisorAction, Task, WeatherHour,
} from '../types';

const at = (hhmm: string): EpochMs => Date.parse(`2026-07-15T${hhmm}:00+04:00`);
export const SHIFT_START = at('06:00');
export const SHIFT_END = at('18:00');
export const BAN_START = SHIFT_START - 6 * 60 * MIN + MIDDAY_BAN.fromMin * MIN;
export const BAN_END = SHIFT_START - 6 * 60 * MIN + MIDDAY_BAN.toMin * MIN;
export const MULTIPLIER = 240;
export const COUNTDOWN_MS = 3000;
/** Spec 06: ack window and stale threshold are 30 s of wall time in time-lapse. */
export const ACK_WINDOW_MS = 30_000;
export const MEDIC_TEL = '+97125550100';
/** A "Switched to light task" tap holds Light this long, like a Rest tap (spec 05). */
export const LIGHT_HOLD_MIN = DEFAULTS.restTapRevertMin;

/** Hourly WBGT for the shift only, so the board's heat strip starts and ends with it. */
export const WBGT = (jul as WeatherHour[]).map(wbgtHour).filter((h) => h.t >= SHIFT_START && h.t < SHIFT_END);

const task = (id: string, name: string, durationMin: number, metabolicClass: Task['metabolicClass'], sun: boolean, earliest: string, latest: string): Task => {
  const m = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  return { id, crewId: 'crew-a', name, durationMin, metabolicClass, sun, earliest: m(earliest), latest: m(latest) };
};
export const TASKS: Task[] = [
  task('t1', 'Pour slab edge forms', 120, 'heavy', true, '06:00', '12:00'),
  task('t2', 'Strip column forms', 90, 'moderate', true, '06:00', '18:00'),
  task('t3', 'Sort and oil panels', 120, 'light', false, '06:00', '18:00'),
  task('t4', 'Carry rebar bundles', 60, 'veryHeavy', true, '10:00', '18:00'),
  task('t5', 'Tie rebar mats', 120, 'moderate', true, '06:00', '18:00'),
];

export interface CrewMember {
  displayName: string;
  profile: Profile;
  checkIn: CheckIn;
  /** The phone in the demo; everyone else is a SIM crew-mate drawn on the board only. */
  phone: boolean;
}
const ok: CheckIn = { skipped: false, sleptWell: true, urine: 'pale', unwell: false };
const person = (displayName: string, workerId: string, o: Partial<Profile>, checkIn = ok, phone = false): CrewMember => ({
  displayName, phone, checkIn,
  profile: { workerId, age: 35, acclimDays: 30, isNewArrival: false, daysAway: 0, clothing: 'workClothes', hood: false, ...o },
});
/** Sorted by name: the board grid never re-sorts. */
export const CREW: CrewMember[] = [
  person('Abdul R.', 'W-3C2E', { age: 44, acclimDays: 90 }),
  person('Bilal A.', 'W-1F08', { daysAway: 21, acclimDays: 0 }),
  person('Joseph M.', 'W-4D90', { age: 57, acclimDays: 60 }),
  person('Manoj T.', 'W-6B13', { clothing: 'doubleLayerWoven' }),
  person('Ravi K.', 'W-DEMO', { age: 28, isNewArrival: true, acclimDays: 0 }, ok, true),
  person('Sunil P.', 'W-8E44', { age: 31 }, { ...ok, urine: 'dark' }),
];

export type PlanMode = 'on' | 'off';
export function plan(mode: PlanMode) {
  return planShift({ tasks: TASKS, wbgt: WBGT, shiftStart: SHIFT_START, shiftEnd: SHIFT_END, crew: CREW.map((c) => c.profile), fastingSafe: false, params: DEFAULTS }, mode);
}

export function contextFor(member: CrewMember, schedule: ScheduleSlot[]): EngineContext {
  return {
    profile: member.profile,
    session: { scenario: 'replay-2026-07-15', wbgt: WBGT, schedule, shiftStart: SHIFT_START, shiftEnd: SHIFT_END },
    fasting: false, checkIn: member.checkIn, forceRestWhenLocked: true, params: DEFAULTS,
  };
}

/** Rewrites task slots inside [from, from + LIGHT_HOLD_MIN) to Light; the engine itself only knows Rest taps. */
export function withLightTap(schedule: ScheduleSlot[], from: EpochMs | null): ScheduleSlot[] {
  if (from === null) return schedule;
  const to = from + LIGHT_HOLD_MIN * MIN;
  return schedule.flatMap((s): ScheduleSlot[] => {
    if (s.kind !== 'task' || s.end <= from || s.start >= to) return [s];
    const parts: ScheduleSlot[] = [];
    if (s.start < from) parts.push({ ...s, end: from });
    parts.push({ ...s, start: Math.max(s.start, from), end: Math.min(s.end, to), activity: 'light' });
    if (s.end > to) parts.push({ ...s, start: to });
    return parts;
  });
}

/** Simulated watch: a plausible heart rate from what the worker is doing and how drained they are. */
export function heartRate(activity: Activity, budget: number): number {
  const base = { rest: 82, light: 98, moderate: 112, heavy: 128, veryHeavy: 140 }[activity];
  return Math.round(base + (100 - budget) * 0.25);
}

export const mainActionFor = (level: Level, unwell: boolean): MainAction =>
  unwell || level === 4 ? 'call' : level === 3 ? 'light-task' : level === 2 ? 'in-shade' : 'none';

export function toCard(r: EngineResult, o: { postedLevel: Level; postedAt: EpochMs; lowBattery: boolean; queued?: boolean }): CardView {
  const s = r.state;
  return {
    level: r.level,
    phraseKey: `card.l${r.level}.phrase`,
    mainAction: mainActionFor(r.level, s.unwell),
    delivery: o.queued ? { kind: 'queued' } : { kind: 'sent', level: o.postedLevel, at: o.postedAt },
    budgetFraction: r.budgetFraction,
    reason: r.reasons[0] ?? null,
    activity: r.activity,
    activityLocked: r.activityLocked,
    canClearL4: r.canClearL4,
    restCountdownEnd: r.activity === 'rest' && s.restTapAt !== null ? s.restTapAt + DEFAULTS.restTapRevertMin * MIN : null,
    banners: o.lowBattery ? ['replay', 'low-battery'] : ['replay'],
    lateJoinAt: null,
    startedLower: false,
    medicTel: MEDIC_TEL,
    demo: true,
    tiers: r.tiers,
    offlineReady: false,
  };
}

const ACTION: Record<Level, SupervisorAction> = { 0: null, 1: null, 2: 'allow-shade', 3: 'move-to-light', 4: 'send-buddy' };

/** Board tile for one worker (spec 06). Ack timing is wall time. `live` = a real phone (default: the demo phone). */
export function toTile(member: CrewMember, s: { level: Level; levelSinceWall: number; lastSeenWall: number; lowBattery: boolean; live?: boolean; stale?: boolean },
  ack: { level: Level; wall: number } | null, wallNow: number): Extract<BoardTileState, { kind: 'status' }> {
  const acked = ack !== null && ack.level >= s.level && ack.wall >= s.levelSinceWall;
  const dueAt = s.levelSinceWall + ACK_WINDOW_MS;
  const state: AckState = s.level < 2 ? 'none' : acked ? 'acked' : wallNow < dueAt ? 'due' : s.level >= 3 ? 'overdue' : 'none';
  return {
    kind: 'status', workerId: member.profile.workerId, displayName: member.displayName, level: s.level,
    action: ACTION[s.level], lastSeenAt: s.lastSeenWall, stale: !!s.stale, ack: state,
    ackDueAt: state === 'due' ? dueAt : null,
    badge: state === 'overdue' ? 'overdue' : s.stale ? 'stale' : s.lowBattery ? 'battery' : null,
    lowBattery: s.lowBattery, sim: !(s.live ?? member.phone),
  };
}

/** "Needs you" (spec 06): overdue, L4, L3, low battery; by severity, then how long they have been at that level. */
export function needsYou(tiles: Extract<BoardTileState, { kind: 'status' }>[], levelSince: Record<string, number>) {
  const rank = (t: (typeof tiles)[number]) => (t.ack === 'overdue' ? 0 : t.level === 4 ? 1 : t.level === 3 ? 2 : t.lowBattery ? 3 : 9);
  return tiles.filter((t) => rank(t) < 9).sort((a, b) => rank(a) - rank(b) || levelSince[a.workerId] - levelSince[b.workerId]);
}

/** The planner's composite vulnerable profile: the lowest ramp and the worst clothing in the crew. */
function vulnerable(): CrewMember {
  const lowest = CREW.reduce((a, b) => (rampFraction(b.profile) < rampFraction(a.profile) ? b : a));
  const worst = CREW.reduce((a, b) => (clothingAdjC(b.profile) > clothingAdjC(a.profile) ? b : a));
  return { ...lowest, checkIn: ok, profile: { ...lowest.profile, clothing: worst.profile.clothing, hood: CREW.some((c) => c.profile.hood) } };
}

/** Whole-day run with the advice followed (Rest at L2): the predicted line and the planner on/off counters. */
export function runDay(member: CrewMember, schedule: ScheduleSlot[]) {
  const ctx = contextFor(member, schedule);
  let s: EngineState = engine.initState(ctx, SHIFT_START, null);
  const levels: { t: EpochMs; level: Level }[] = [];
  let level2PlusEvents = 0;
  let prev: Level = s.level;
  for (let t = SHIFT_START + MIN; t <= SHIFT_END; t += MIN) {
    const r = engine.advanceTo(s, t, ctx);
    s = r.level >= 2 && r.activity !== 'rest' ? engine.applyEvent(r.state, { type: 'activity-tap', activity: 'rest', simTs: t }, ctx) : r.state;
    if (r.level >= 2 && prev < 2) level2PlusEvents++;
    prev = r.level;
    if ((t - SHIFT_START) % (15 * MIN) === 0) levels.push({ t, level: r.level });
  }
  return { levels, level2PlusEvents };
}

/** Display only: join back-to-back 15-min slots of the same task (or rest) so a plan stays readable. */
export function mergeSlots(schedule: ScheduleSlot[]): ScheduleSlot[] {
  return schedule.reduce<ScheduleSlot[]>((acc, s) => {
    const last = acc[acc.length - 1];
    const same = last && last.end === s.start && last.kind === s.kind && (s.kind === 'rest' || (last.kind === 'task' && last.taskId === s.taskId));
    if (same) acc[acc.length - 1] = { ...last, end: s.end };
    else acc.push(s);
    return acc;
  }, []);
}

export function timelineFor(mode: PlanMode) {
  const on = plan('on');
  const off = plan('off');
  const v = vulnerable();
  const metric = (p: ReturnType<typeof plan>): PlannerMetric => ({
    tasksCompleted: TASKS.length - p.unscheduled.length, level2PlusEvents: runDay(v, p.schedule).level2PlusEvents, truthEvents: 0,
  });
  const chosen = mode === 'on' ? on : off;
  const merged = mergeSlots(chosen.schedule);
  return {
    shiftStart: SHIFT_START, shiftEnd: SHIFT_END, banStart: BAN_START, banEnd: BAN_END, forecastFetchedAt: null,
    wbgt: WBGT, tasks: TASKS, schedule: merged, unscheduled: chosen.unscheduled,
    predicted: [{ t: SHIFT_START, level: 0 as Level }, ...runDay(v, chosen.schedule).levels],
    plannerCompare: { on: metric(on), off: metric(off) },
  };
}

export const hhmm = (ms: EpochMs) => {
  const m = toSiteTime(ms).minuteOfDay;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
