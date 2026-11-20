/**
 * HeatShield shared contract.
 *
 * Owned by the builder. v0 and Antigravity import from here and never redefine these shapes.
 * Source rules: docs/spec/02–08. If a shape changes, update the matching spec file too.
 *
 * Conventions
 * - Every timestamp is epoch milliseconds (UTC). Site time is Asia/Dubai, fixed UTC+4:
 *   convert only through lib/engine/time.ts, never with device-local Date getters.
 * - `MinuteOfDay` is site-time minutes after midnight (0–1439), used for shifts and task windows,
 *   so the same site data works on any replay date.
 * - Worker IDs are pseudonymous, e.g. "W-7F3A". Display names exist only in site data.
 */

// ─── Primitives ────────────────────────────────────────────────────────────────

/** Epoch milliseconds, UTC. */
export type EpochMs = number;
/** Site-time minutes after midnight (Asia/Dubai), 0–1439. */
export type MinuteOfDay = number;
/** Pseudonymous worker id, e.g. "W-7F3A". */
export type WorkerId = string;
/** i18n dictionary key, resolved with t(key). */
export type I18nKey = string;

/** 0 green · 1 yellow · 2 orange · 3 red · 4 purple "STOP". */
export type Level = 0 | 1 | 2 | 3 | 4;
export type Role = 'worker' | 'supervisor';
export type Lang = 'en' | 'ar' | 'hi' | 'ur' | 'bn' | 'ml';

/** Task intensity. NIOSH metabolic rate: light 180 W, moderate 300, heavy 415, veryHeavy 520. */
export type MetabolicClass = 'light' | 'moderate' | 'heavy' | 'veryHeavy';
/** What the worker is doing this minute. veryHeavy tasks show the Heavy icon. */
export type Activity = 'rest' | 'light' | 'moderate' | 'heavy' | 'veryHeavy';
/** Clothing adjustment (°C added to WBGT): workClothes 0, clothCoveralls 0, doubleLayerWoven +3, polyolefinCoveralls +1. */
export type Clothing = 'workClothes' | 'clothCoveralls' | 'doubleLayerWoven' | 'polyolefinCoveralls';

export type Scenario = 'live' | 'replay-2026-07-15';
export type Multiplier = 1 | 240;

// ─── Site, roster, profiles, tasks (GET /api/site, GET /api/profile/:workerId) ─

export interface Crew {
  id: string;
  name: string;
  shiftStart: MinuteOfDay;
  shiftEnd: MinuteOfDay;
}

export interface RosterEntry {
  workerId: WorkerId;
  displayName: string;
  crewId: string;
}

export interface Profile {
  workerId: WorkerId;
  age: number;
  /** Days worked in heat in the current stint (0 = first day). Seeded and static: it never advances. */
  acclimDays: number;
  /** First time working in this heat: ramp 20 %/day over 5 days (days 0–4), then fully acclimatised. */
  isNewArrival: boolean;
  /**
   * For non-new workers: days away before the current stint.
   * ≥7 → returning ramp 50/60/80/100 % over 4 days (acclimDays 0–3); 1–6 → no reset (fully acclimatised).
   */
  daysAway: number;
  clothing: Clothing;
  /** Hood adds +1 °C. */
  hood: boolean;
}

export interface Task {
  id: string;
  crewId: string;
  name: string;
  durationMin: number;
  metabolicClass: MetabolicClass;
  /** false = shade task (WBGT with solar = 0). */
  sun: boolean;
  earliest: MinuteOfDay;
  latest: MinuteOfDay;
}

/** GET /api/site with a worker token. */
export interface SiteWorkerView {
  now: EpochMs;
  siteId: string;
  crews: Crew[];
  roster: RosterEntry[];
  /** E.164-ish, keeps the leading "+". Validated with ^\+?\d{3,15}$. */
  medicTel: string;
}

/** GET /api/site with a supervisor token. */
export interface SiteSupervisorView extends SiteWorkerView {
  lat: number;
  lon: number;
  profiles: Profile[];
  tasks: Task[];
}

/** GET /api/profile/:workerId (worker role, device-bound). */
export interface ProfileResponse {
  now: EpochMs;
  profile: Profile;
}

// ─── Sessions (POST /api/session, GET /api/session/:sessionId, QR fragment) ─────

/** One hour of WBGT from the supervisor's snapshot. `t` is the start of the hour. */
export interface WbgtHour {
  t: EpochMs;
  /** °C, or null when the source row was missing (the engine then uses climatology, worst case). */
  sun: number | null;
  shade: number | null;
}

/**
 * One hour of raw weather (Open-Meteo *_instant fields, wind at 10 m in m/s). Bundled fixtures
 * (data/fixtures/*.json) are WeatherHour[]. lib/engine/wbgt.ts exports
 * `wbgtHour(row: WeatherHour): WbgtHour` and `stullWetBulb(ta: number, rh: number): number`.
 * Any non-finite ta/rh/u10/dni/diffuse makes both sun and shade null; a null or non-finite tw uses Stull.
 */
export interface WeatherHour {
  /** Start of the hour. */
  t: EpochMs;
  /** Air temperature, °C. */
  ta: number;
  /** Relative humidity, %. */
  rh: number;
  /** Wind at 10 m, m/s. */
  u10: number;
  /** direct_normal_irradiance_instant, W/m². */
  dni: number;
  /** diffuse_radiation_instant, W/m². */
  diffuse: number;
  /** wet_bulb_temperature_2m, °C; null → Stull from ta/rh. */
  tw: number | null;
}

/**
 * data/climatology.json: p95 WBGT (°C) from 2021–2025 archive hours, indexed [month 0–11][site hour 0–23].
 * The worst-case fallback for a missing or null forecast hour (Live) and for Tier 0 with no session.
 */
export interface Climatology {
  source: string;
  sun: number[][];
  shade: number[][];
}

export type UnscheduledReason = 'ban-window' | 'too-hot' | 'no-slot' | 'past-latest';

export interface Unscheduled {
  taskId: string;
  reason: UnscheduledReason;
}

/** Planner output on 15-min slots. Time not covered by any slot uses the last task's class (or moderate in sun). */
export type ScheduleSlot =
  | { kind: 'task'; start: EpochMs; end: EpochMs; taskId: string; activity: Activity; sun: boolean }
  | { kind: 'rest'; start: EpochMs; end: EpochMs; reason: 'planned' | 'midday-ban' };

/**
 * Planner API implemented in lib/engine/planner.ts as `export const planShift: PlanShift`
 * (pure, deterministic, 15-min slots; spec 02, Planner). mode 'off' is the comparison only:
 * tasks run in their given order from shift start, with the midday ban still enforced.
 */
export interface PlannerInput {
  tasks: Task[];
  wbgt: WbgtHour[];
  shiftStart: EpochMs;
  shiftEnd: EpochMs;
  /** Crew profiles; the planner simulates the composite vulnerable profile built from them. */
  crew: Profile[];
  fastingSafe: boolean;
  params: EngineParams;
}
export interface PlannerResult {
  schedule: ScheduleSlot[];
  unscheduled: Unscheduled[];
}
export type PlanShift = (input: PlannerInput, mode: 'on' | 'off') => PlannerResult;

/** Live sessions always run at 1×. */
export type ScenarioClock =
  | { scenario: 'live'; multiplier: 1 }
  | { scenario: 'replay-2026-07-15'; multiplier: Multiplier };

/** Body of POST /api/session (supervisor). The server adds v, sessionId and siteId. */
export type SessionCreate = ScenarioClock & {
  crewId: string;
  /** Wall time the shift clock starts (now + 30 s live, + 3 s in the one-click demo). */
  wallStart: EpochMs;
  /** Sim time at wallStart. */
  simStart: EpochMs;
  /** Shift bounds in sim time for this session's date. */
  shiftStart: EpochMs;
  shiftEnd: EpochMs;
  /** Crew-level fasting-safe planning toggle. Fasting is never sent per worker. */
  fastingSafe: boolean;
  /** One-click demo: SIM crew-mates, "Would dial 998" toast, pre-filled onboarding. */
  demo: boolean;
  wbgt: WbgtHour[];
  /** When the Open-Meteo forecast was fetched; null for Replay (bundled fixture). */
  forecastFetchedAt: EpochMs | null;
  schedule: ScheduleSlot[];
  unscheduled: Unscheduled[];
};

/** Stored as session:{site}:{sessionId}, EX 86400. */
export type SessionRecord = SessionCreate & {
  v: 1;
  /** crypto.randomUUID(), generated by the server. */
  sessionId: string;
  siteId: string;
};

export interface SessionCreated {
  now: EpochMs;
  sessionId: string;
}

export interface SessionResponse {
  now: EpochMs;
  record: SessionRecord;
}

/** QR fragment: #v=1&s=<siteId>&t=<workerToken>&id=<sessionId>. Must stay under 200 chars. */
export interface SessionFragment {
  v: 1;
  siteId: string;
  /** Worker-role token. */
  token: string;
  sessionId: string;
}

// ─── Status and ack (POST/DELETE /api/status, GET /api/crew/:crewId/status, POST /api/ack) ─

/**
 * Body of POST /api/status: exactly these four keys, nothing else ever leaves the phone.
 * Headers: Authorization (anonymous Supabase JWT, or demo worker token), X-Session, X-Join.
 */
export interface StatusPost {
  workerId: WorkerId;
  level: Level;
  /** Sim time of the reading. Rejected if > simNow + 2 sim-min. */
  simTs: EpochMs;
  lowBattery: boolean;
}

/** Stored as status:{site}:{sessionId}:{workerId}, EX 86400. Server-only fields included. */
export interface StatusRecord extends StatusPost {
  /** Server wall time of the last accepted POST. */
  receivedAt: EpochMs;
  /** Server wall time of the POST that last changed the level. The ack window runs from here. */
  levelSince: EpochMs;
  /** Trust-on-first-use device binding; never returned to clients. */
  deviceKeyHash: string;
}

/** 200 response of POST /api/status. */
export interface StatusAccepted {
  now: EpochMs;
  storedSimTs: EpochMs;
}

/**
 * Input to the pure `applyStatus(prev: StatusRecord | null, input: StatusInput, now: EpochMs): StatusOutcome`
 * in lib/status.ts. The route handles auth, the session lookup (404 unknown-session) and req.text().
 */
export interface StatusInput {
  /** Raw body from req.text(): at most 1024 UTF-8 bytes, JSON, exactly the four StatusPost keys. */
  bodyText: string;
  /** Worker ids in this site's roster. */
  roster: WorkerId[];
  /** Server's current sim time for the session. simTs > simNow + 2 sim-min is rejected. */
  simNow: EpochMs;
  /** Hash of the bound anonymous Supabase user id (first status binds it). */
  deviceKeyHash: string;
}

/** Checks run in this order: body (400), device (403), future (409), superseded (409). */
export type StatusOutcome =
  /** write=false: an idempotent retry (same simTs, same body); nothing to store. */
  | { ok: true; record: StatusRecord; write: boolean }
  /** field: the failing key, or "body" for size/JSON/shape errors. */
  | { ok: false; status: 400; code: 'bad-status-body'; field: string }
  | { ok: false; status: 403; code: 'device-mismatch' }
  | { ok: false; status: 409; code: 'simts-in-future' }
  | { ok: false; status: 409; code: 'status-superseded'; storedSimTs: EpochMs };

/** Result of the pure `applyAck(status: StatusRecord | null, body: AckPost, now: EpochMs): AckOutcome`. */
export type AckOutcome =
  | { ok: true; ack: AckRecord }
  | { ok: false; status: 404; code: 'no-status' }
  | { ok: false; status: 409; code: 'ack-level-stale'; ackedLevel: Level; currentLevel: Level };

/** Body of POST /api/ack (supervisor, X-Session). */
export interface AckPost {
  workerId: WorkerId;
  level: Level;
}

/** Stored as ack:{site}:{sessionId}:{workerId}, EX 86400. */
export interface AckRecord {
  level: Level;
  ackTs: EpochMs;
}

/** One worker in GET /api/crew/:crewId/status. Acked = ack.level >= level && ack.ackTs >= levelSince. */
export interface CrewStatusEntry {
  workerId: WorkerId;
  level: Level;
  simTs: EpochMs;
  lowBattery: boolean;
  receivedAt: EpochMs;
  levelSince: EpochMs;
  ack?: AckRecord;
}

export interface CrewStatusResponse {
  now: EpochMs;
  statuses: CrewStatusEntry[];
}

// ─── Errors (application/problem+json) ─────────────────────────────────────────

export type ProblemCode =
  | 'bad-status-body' //    400
  | 'bad-token' //          401
  | 'wrong-role' //         403
  | 'device-mismatch' //    403  "Name in use on another phone, ask for a new QR"
  | 'unknown-session' //    404
  | 'no-status' //          404
  | 'status-superseded' //  409  drop the queued item
  | 'simts-in-future' //    409  resync clock with `now`
  | 'ack-level-stale' //    409  re-render the tile
  | 'rate-limited' //       429
  | 'store-unavailable'; // 503  demo switches to its in-page store

export interface Problem {
  /** "/errors#<code>" anchor in SPEC docs. */
  type: string;
  title: string;
  status: number;
  code: ProblemCode;
  /** What happened, with actual values. */
  detail: string;
  /** The safe next step for a person or an agent. */
  fix: string;
  /** x-vercel-id, on 5xx. */
  requestId?: string;
  storedSimTs?: EpochMs;
  ackedLevel?: Level;
  currentLevel?: Level;
  /** Name of the failing field on 400. */
  field?: string;
}

// ─── Engine contract (implemented in lib/engine, called by lib/client/session.ts and lib/sim) ─

export type Urine = 'pale' | 'medium' | 'dark';

/** Pre-shift check-in. Stays on the phone. A skipped check-in counts as dark urine only; unwell stays null. */
export interface CheckIn {
  skipped: boolean;
  sleptWell: boolean | null;
  urine: Urine | null;
  unwell: boolean | null;
}

/** Watch (Tier 2) mode. "drop" = sensor failure: Tier 2 dropped and the unacclimatised limit applies. */
export type WatchMode = 'on' | 'off' | 'drop';

export type Tier = 0 | 1 | 2;

/** The single reason chip shown when a floor or fallback set the level, or while resting. */
export type ReasonChip =
  | 'hr-high'
  | 'after-unwell'
  | 'dark-urine'
  | 'watch-lost'
  | 'no-forecast'
  | 'recovering';

/** Yesterday's end-of-day budget for carry-over (Live only). */
export interface Carryover {
  /** Site date "YYYY-MM-DD". */
  siteDate: string;
  endBudget: number;
}

/** Calibration knobs (defaults in lib/engine/constants.ts, all [estimated]). Injected as `params`. */
export interface EngineParams {
  /** Budget points per sim-minute per °C of Δ (from seed-7 calibration). */
  k: number;
  fastingDrainMultiplier: number;
  restRecoveryPerMin: number;
  passiveRecoveryPerMin: number;
  /** Passive recovery applies when effective WBGT ÷ limit is below this (and not heavy). */
  passiveRecoveryMaxRatio: number;
  startBudgetNoRecord: number;
  carryoverFactor: number;
  poorSleepPenalty: number;
  urinePenalty: Record<Urine, number>;
  /** Lower bounds of levels 0–3, e.g. [75, 50, 30, 15]. */
  levelBands: [number, number, number, number];
  hysteresisMin: number;
  hysteresisPoints: number;
  l4ClearRestMin: number;
  l4ClearMinBudget: number;
  postUnwellFloorMin: number;
  restTapRevertMin: number;
  hrFractionOfMax: number;
  hrSustainMin: number;
  hrStaleMin: number;
  metabolicW: Record<MetabolicClass, number>;
  clothingAdjC: Record<Clothing, number>;
  hoodAdjC: number;
  /** WBGT method; 'approx' ships first, 'liljegren' is a stretch goal. */
  wbgtMethod: 'approx' | 'liljegren';
}

/** Everything the engine needs that doesn't change minute to minute. */
export interface EngineContext {
  profile: Profile;
  session: Pick<SessionRecord, 'scenario' | 'wbgt' | 'schedule' | 'shiftStart' | 'shiftEnd'>;
  /** Worker's own Fasting mode toggle (on the phone). */
  fasting: boolean;
  checkIn: CheckIn;
  /** true on the phone (D7: at L4 or unwell, activity is forced to Rest); false in the open-loop simulator. */
  forceRestWhenLocked: boolean;
  params: EngineParams;
}

/** Inputs the client feeds into the engine between steps. */
export type EngineEvent =
  | { type: 'unwell'; simTs: EpochMs }
  | { type: 'ok-buddy-checked'; simTs: EpochMs }
  | { type: 'activity-tap'; activity: Activity; simTs: EpochMs }
  | { type: 'hr'; bpm: number; simTs: EpochMs }
  | { type: 'watch'; mode: WatchMode; simTs: EpochMs };

/** Persisted on the phone every step (key: Live = worker + site-date; Replay = per session). */
export interface EngineState {
  v: 1;
  /** 0–100, always clamped. */
  budget: number;
  level: Level;
  /** Sim time the current level started. */
  levelSince: EpochMs;
  /** Hysteresis: a lower level waiting out its 5 sim-min. */
  pendingLower: { level: Level; since: EpochMs } | null;
  /** Budget-driven L4 latch. */
  latched: boolean;
  /** Unwell lock; only 'ok-buddy-checked' clears it. Written synchronously on tap. */
  unwell: boolean;
  /** When unwell or the latch was last cleared (post-unwell floor L2 for 15 sim-min). */
  clearedAt: EpochMs | null;
  /** Start of the current Rest stretch (for the L4 clear rule and the rest countdown). */
  restSince: EpochMs | null;
  /** Worker's Rest tap; reverts to the scheduled class after 15 sim-min (except when locked). */
  restTapAt: EpochMs | null;
  watch: WatchMode;
  lastHrAt: EpochMs | null;
  hrHighSince: EpochMs | null;
  lastSimTs: EpochMs;
}

/** Result of advanceTo: state plus what the UI needs this tick. */
export interface EngineResult {
  state: EngineState;
  level: Level;
  /** At most one chip is shown; the first is the most important. */
  reasons: ReasonChip[];
  tiers: Tier[];
  /** Effective activity this minute (scheduled, tapped or forced). */
  activity: Activity;
  /** true at L4 or while unwell on the phone. */
  activityLocked: boolean;
  /** "I'm OK, buddy checked" enabled: ≥15 sim-min Rest and budget ≥18 (latch), or unwell set. */
  canClearL4: boolean;
  /** Budget as 0–1 for the banded bar (no number is shown). */
  budgetFraction: number;
}

/**
 * Engine API implemented in lib/engine (pure, deterministic, 1 sim-minute steps).
 * - initState: start-of-shift state (Replay 100; Live carry-over or 80; then check-in deductions; late join = join time).
 * - applyEvent: fold one client event into the state.
 * - advanceTo: step from state.lastSimTs to `toSimTs` along the schedule (gaps included).
 */
export interface EngineApi {
  initState(ctx: EngineContext, startSimTs: EpochMs, carry: Carryover | null): EngineState;
  applyEvent(state: EngineState, event: EngineEvent, ctx: EngineContext): EngineState;
  advanceTo(state: EngineState, toSimTs: EpochMs, ctx: EngineContext): EngineResult;
}

// ─── Worker UI states (v0 renders these; mocks/ has one JSON per state) ─────────

/** D1 delivery line. The worker never sees supervisor acks. */
export type DeliveryState =
  | { kind: 'sent'; level: Level; at: EpochMs }
  | { kind: 'queued' }
  | { kind: 'not-shared' };

/** Main action button on the card. */
export type MainAction = 'none' | 'in-shade' | 'light-task' | 'call';

export type WorkerBanner = 'replay' | 'not-shared' | 'low-battery' | 'offline-delete';

export interface CardView {
  level: Level;
  /** Action phrase for the level; the fasting variant is chosen by the client. */
  phraseKey: I18nKey;
  mainAction: MainAction;
  delivery: DeliveryState;
  budgetFraction: number;
  reason: ReasonChip | null;
  activity: Activity;
  activityLocked: boolean;
  canClearL4: boolean;
  /** End of the "I'm in the shade" countdown ring, sim time. */
  restCountdownEnd: EpochMs | null;
  banners: WorkerBanner[];
  /** "Joined HH:MM". */
  lateJoinAt: EpochMs | null;
  /** "Yesterday was hard: starting lower". */
  startedLower: boolean;
  medicTel: string;
  /** Demo session: calls show a "Would dial 998" toast. */
  demo: boolean;
  tiers: Tier[];
  offlineReady: boolean;
}

export interface ShiftSummary {
  highestLevel: Level;
  minutesAtLevel: Record<Level, number>;
  restMinutes: number;
}

export type WorkerViewState =
  | { screen: 'no-session' } //                                  "Scan your supervisor's QR" + 998
  | { screen: 'language' }
  | { screen: 'consent' }
  | { screen: 'pick-crew'; crews: Crew[] }
  | { screen: 'pick-name'; crewId: string; roster: RosterEntry[] }
  | { screen: 'confirm-name'; entry: RosterEntry }
  | { screen: 'check-in' }
  | { screen: 'start-shift' }
  | { screen: 'countdown'; startsAt: EpochMs }
  | { screen: 'card'; card: CardView }
  | { screen: 'after-shift'; summary: ShiftSummary }
  | { screen: 'session-expired' } //                             401 "Session expired: rescan QR"
  | { screen: 'device-mismatch' }; //                            403 "Name in use on another phone, ask for a new QR"

// ─── Supervisor board UI states ─────────────────────────────────────────────────

/** The supervisor's action on a tile (never a health detail). */
export type SupervisorAction = 'send-buddy' | 'move-to-light' | 'allow-shade' | null;

export type AckState = 'none' | 'due' | 'overdue' | 'acked';

/** One badge per tile, priority overdue > stale > battery. */
export type TileBadge = 'overdue' | 'stale' | 'battery' | null;

export type BoardTileState =
  | { kind: 'no-data'; workerId: WorkerId; displayName: string } // not started / declined / deleted: one neutral look
  | {
      kind: 'status';
      workerId: WorkerId;
      displayName: string;
      level: Level;
      action: SupervisorAction;
      lastSeenAt: EpochMs;
      /** 2 missed heartbeats: shown hatched with a "stale" badge. */
      stale: boolean;
      ack: AckState;
      /** Wall time the ack window ends ("Ack due 0:22"). */
      ackDueAt: EpochMs | null;
      badge: TileBadge;
      lowBattery: boolean;
      /** Client-side demo crew-mate (Replay only): SIM tag + dashed border. */
      sim: boolean;
    };

export interface BoardView {
  sessionId: string;
  scenario: Scenario;
  multiplier: Multiplier;
  /** "Board offline since HH:MM": stale/overdue calculation paused. */
  offlineSince: EpochMs | null;
  /** 401/403: polling stopped. */
  sessionInvalid: boolean;
  needsYou: BoardTileState[];
  grid: BoardTileState[];
}

// ─── Evidence (public/evidence.json, written by `npm run sim`) ──────────────────

export interface MetricSet {
  /** 0–1. Truth-event days with a level ≥2 alert active within 60 min before the event. */
  sensitivity: number;
  /** 0–1. Alerted days with no truth event ÷ non-event days. */
  falseAlarmRate: number;
  /** Median minutes from alert-episode onset to event, capped at 60. */
  leadTimeMedianMin: number;
  eventDays: number;
  nonEventDays: number;
}

export type FairnessGroup = 'age' | 'acclimatised' | 'fasting' | 'ppe';

export interface FairnessCell {
  group: FairnessGroup;
  /** e.g. "40–49", "unacclimatised", "fasting", "doubleLayerWoven". */
  value: string;
  engine: Pick<MetricSet, 'sensitivity' | 'falseAlarmRate'>;
  events: number;
  /** Fewer than 30 events. */
  insufficient: boolean;
}

export interface FairnessResult {
  group: FairnessGroup;
  cells: FairnessCell[];
  /** Max gap between cells, percentage points. Pass = both ≤ 10. */
  sensitivityGapPp: number;
  falseAlarmGapPp: number;
  pass: boolean;
  /** Shown in red with the fix when pass = false. */
  fixNote: string | null;
}

export interface RobustnessPoint {
  /** Truth-model effect multiplier, 0–2. */
  acclimEffect: number;
  fastingEffect: number;
  engineSensitivity: number;
  b1Sensitivity: number;
}

export interface PlannerMetric {
  tasksCompleted: number;
  level2PlusEvents: number;
  truthEvents: number;
}

export interface EvidenceReport {
  /** Hash of the engine DEFAULTS used; a test fails if constants changed without re-running the sim. */
  paramsHash: string;
  generatedAt: EpochMs;
  seed: 42;
  calibrationSeed: 7;
  workers: number;
  days: number;
  /** e.g. ["2026-05-25..2026-05-29", "2026-10-05..2026-10-09"]. */
  weatherWindows: string[];
  headline: {
    /** "Illustrates how much a generic threshold misses if acclimatisation matters as much as NIOSH says." */
    claimKey: I18nKey;
    unacclimatisedEngineSensitivity: number;
    unacclimatisedB1Sensitivity: number;
  };
  engine: MetricSet;
  /** One generic WBGT threshold, tuned on seed 7 like the engine. */
  b1: MetricSet & { thresholdC: number };
  /** Midday ban only; reference, no alerts. */
  b0: { truthEventDays: number };
  fairness: FairnessResult[];
  robustness: RobustnessPoint[];
  planner: { on: PlannerMetric; off: PlannerMetric };
  limitations: I18nKey[];
}
