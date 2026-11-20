'use client';

// One engine loop, three layouts (spec 07 demo, spec 04 QR join):
// - demo:  worker phone frame + supervisor board in one window, no server.
// - board: /supervisor, the board plus the crew QR. Ravi K.'s tile follows the real phone once it joins.
// - phone: /worker#c=CODE, Ravi K.'s full-screen card. The engine runs on the phone; only the level leaves it.
// Everything shown comes from lib/demo/scenario.ts; lib/client/link.ts carries the few messages between devices.
import Link from 'next/link';
import QRCode from 'qrcode';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import Board from '@/components/board/Board';
import PlanSummary from '@/components/board/PlanSummary';
import WorkerCard from '@/components/worker/WorkerCard';
import { makeT } from '@/components/worker/t';
import ar from '@/data/i18n/ar.json';
import en from '@/data/i18n/en.json';
import { HEARTBEAT_MS, STALE_MS, newCode, openLink, type Link as LinkHandle } from '@/lib/client/link';
import {
  COUNTDOWN_MS, CREW, LIGHT_HOLD_MIN, MEDIC_TEL, MULTIPLIER, SHIFT_END, SHIFT_START, WBGT, contextFor, heartRate, hhmm, needsYou,
  plan, timelineFor, toCard, toTile, withLightTap, type CrewMember, type PlanMode,
} from '@/lib/demo/scenario';
import { engine } from '@/lib/engine';
import { MIN } from '@/lib/engine/time';
import { wbgtAt } from '@/lib/engine/wbgt';
import type { Activity, BoardTileState, BoardView, EngineContext, EngineEvent, EngineResult, EngineState, Level, MainAction, ScheduleSlot, WatchMode } from '@/lib/types';

const COPY = {
  home: 'HeatShield', sub: 'Demo · 15 Jul 2026 · real Abu Dhabi weather · 240×', crew: 'Crew A · Abu Dhabi',
  controls: 'Demo controls', restart: 'Restart', watch: 'Watch', battery: 'Low battery', auto: 'Auto-follow advice',
  planner: 'Planner', plannerOff: 'PLANNER OFF · comparison run', lang: 'Phone language', on: 'On', off: 'Off', drop: 'Drop',
  over: 'Shift over at 18:00', phone: 'Worker phone (Ravi K., new arrival, day 1)', board: 'Supervisor board',
  boardSub: 'Supervisor · 15 Jul 2026 replay · 240×', start: 'Start shift', crewCode: 'Crew code', qrAlt: 'Crew QR code. Tap to show or hide it large.',
  joinInternet: "Workers scan this with their phone camera. Ravi K.'s tile follows the phone that joins; the other five are simulated.",
  joinLocal: "Phones can't connect yet (no Supabase keys). To try it, open this link in another tab of this browser:",
  realPhone: 'Use a real phone (QR)',
  phoneNone: "Ravi K.'s phone: not joined", phoneLive: "Ravi K.'s phone: connected", phoneLost: "Ravi K.'s phone: no signal",
};
const TICK_MS = 250;
const CODE_KEY = 'heatshield-crew-code';

type Layout = 'demo' | 'board' | 'phone';

interface Run {
  member: CrewMember;
  ctx: EngineContext;
  schedule: ScheduleSlot[];
  state: EngineState;
  result: EngineResult;
  lightFrom: number | null;
  levelSinceWall: number;
  postedLevel: Level;
  postedAt: number;
}

/** What the board last heard from a real phone. Wall times are board time. */
interface Remote { level: Level; lowBattery: boolean; lastSeenWall: number; levelSinceWall: number }

function startRuns(mode: PlanMode, wallStart: number, phoneOnly: boolean): Run[] {
  const { schedule } = plan(mode);
  return CREW.filter((m) => !phoneOnly || m.phone).map((member) => {
    const ctx = contextFor(member, schedule);
    let state = engine.initState(ctx, SHIFT_START, null);
    // The demo phone has a simulated watch; a real phone has none, so it runs on Tier 0 + 1.
    if (member.phone && !phoneOnly) state = engine.applyEvent(state, { type: 'watch', mode: 'on', simTs: SHIFT_START }, ctx);
    const result = engine.advanceTo(state, SHIFT_START, ctx);
    return { member, ctx, schedule, state, result, lightFrom: null, levelSinceWall: wallStart, postedLevel: result.level, postedAt: SHIFT_START };
  });
}

/** The context for the next minute: the schedule with any Light tap applied. */
const ctxOf = (run: Run): EngineContext => ({ ...run.ctx, session: { ...run.ctx.session, schedule: withLightTap(run.schedule, run.lightFrom) } });
const refresh = (run: Run) => { run.result = engine.advanceTo(run.state, run.state.lastSimTs, ctxOf(run)); };

export default function DemoClient({ layout = 'demo', code: joinCode }: { layout?: Layout; code?: string }) {
  const [now, setNow] = useState<number | null>(null);
  const [mode, setMode] = useState<PlanMode>('on');
  const [watch, setWatch] = useState<WatchMode>(layout === 'phone' ? 'off' : 'on');
  const [battery, setBattery] = useState(false);
  const [auto, setAuto] = useState(layout !== 'phone');
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<{ text: string; until: number } | null>(null);
  const [code, setCode] = useState<string | null>(joinCode ?? null);
  const [qr, setQr] = useState<string | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [linkKind, setLinkKind] = useState<LinkHandle['kind'] | null>(null);
  const wallStart = useRef(0);
  const runs = useRef<Run[]>([]);
  const acks = useRef<Record<string, { level: Level; wall: number }>>({});
  const remote = useRef<Record<string, Remote>>({});
  const phoneSeen = useRef(0);
  const link = useRef<LinkHandle | null>(null);
  const offset = useRef(0); // phone only: board clock minus phone clock
  const joinedAt = useRef(0);
  const sent = useRef({ level: -1, at: 0 });
  const queued = useRef(false);
  const settings = useRef({ watch, auto });
  settings.current = { watch, auto };
  const clock = () => Date.now() + offset.current;

  const restart = (m: PlanMode, start = clock() + COUNTDOWN_MS) => {
    wallStart.current = start;
    runs.current = startRuns(m, start, layout === 'phone');
    acks.current = {};
    remote.current = {};
    sent.current = { level: -1, at: 0 };
    queued.current = false;
    setWatch(layout === 'phone' ? 'off' : 'on');
    setBattery(false);
    setNow(clock());
    if (layout === 'board') void link.current?.send({ type: 'session', wallStart: start, boardNow: Date.now() });
  };

  useEffect(() => {
    if (layout === 'demo') restart(mode);
    if (layout === 'board') {
      let c: string | null = null;
      try { c = sessionStorage.getItem(CODE_KEY); } catch { /* private mode */ }
      if (!c) { c = newCode(); try { sessionStorage.setItem(CODE_KEY, c); } catch { /* private mode */ } }
      setCode(c);
    }
    setNow(clock());
    const id = window.setInterval(() => setNow(clock()), TICK_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The link: the board answers "hello" with the session and records phone statuses; the phone follows the session.
  useEffect(() => {
    if (!code || layout === 'demo') return;
    const l = openLink(code, (m) => {
      if (layout === 'board') {
        if (m.type === 'hello' || m.type === 'status') phoneSeen.current = Date.now();
        if (m.type === 'hello' && wallStart.current > 0) void l.send({ type: 'session', wallStart: wallStart.current, boardNow: Date.now() });
        if (m.type === 'status') {
          const w = Date.now();
          const prev = remote.current[m.workerId];
          remote.current[m.workerId] = { level: m.level, lowBattery: m.lowBattery, lastSeenWall: w, levelSinceWall: prev && prev.level === m.level ? prev.levelSinceWall : w };
          setNow(w);
        }
      } else if (m.type === 'session') {
        offset.current = m.boardNow - Date.now();
        if (!joinedAt.current) joinedAt.current = clock();
        if (m.wallStart !== wallStart.current) restart('on', m.wallStart);
      }
    });
    link.current = l;
    setLinkKind(l.kind);
    return () => { l.close(); link.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const joinUrl = code && typeof window !== 'undefined' ? `${window.location.origin}/worker#c=${code}` : '';
  useEffect(() => {
    if (layout !== 'board' || !joinUrl) return;
    QRCode.toDataURL(joinUrl, { margin: 1, width: 440 }).then(setQr).catch(() => setQr(null));
  }, [layout, joinUrl]);

  const timeline = useMemo(() => timelineFor(mode), [mode]);
  const wall = now ?? 0;
  const started = wallStart.current > 0;
  const simAt = (w: number) => Math.min(SHIFT_END, Math.max(SHIFT_START, SHIFT_START + (w - wallStart.current) * MULTIPLIER));
  const simNow = started ? simAt(wall) : SHIFT_START;
  const simMinute = SHIFT_START + Math.floor((simNow - SHIFT_START) / MIN) * MIN;

  // Catch up every worker in 1 sim-minute steps (spec 04, Loop). Runs during render on purpose: it is
  // idempotent for a given simMinute, so a re-render without a new minute does nothing.
  for (const run of runs.current) {
    for (let t = run.state.lastSimTs + MIN; t <= simMinute; t += MIN) {
      const ctx = ctxOf(run);
      if (run.member.phone && settings.current.watch === 'on') {
        run.state = engine.applyEvent(run.state, { type: 'hr', bpm: heartRate(run.result.activity, run.state.budget), simTs: t - MIN }, ctx);
      }
      const r = engine.advanceTo(run.state, t, ctx);
      if (r.level !== run.result.level) run.levelSinceWall = wall;
      run.result = r;
      run.state = r.state;
      if (settings.current.auto) {
        if (r.level === 2 && r.activity !== 'rest') {
          run.state = engine.applyEvent(run.state, { type: 'activity-tap', activity: 'rest', simTs: t }, ctx);
        } else if (r.level === 3 && (run.lightFrom === null || t >= run.lightFrom + LIGHT_HOLD_MIN * MIN)) {
          run.lightFrom = t;
        }
      }
      if (layout !== 'phone') { run.postedLevel = run.result.level; run.postedAt = t; }
    }
  }

  const phone = runs.current.find((r) => r.member.phone);

  // Phone: "hello" until the board sends the session, then the level on every change and every heartbeat.
  // Only {workerId, level, simTs, lowBattery} leaves the phone (spec 13); "Supervisor sees" shows real delivery.
  useEffect(() => {
    const l = link.current;
    if (layout !== 'phone' || !l) return;
    const w = clock();
    const changed = started && phone !== undefined && phone.result.level !== sent.current.level;
    if (!changed && w - sent.current.at < HEARTBEAT_MS) return;
    sent.current.at = w;
    if (!started || !phone) { void l.send({ type: 'hello' }); return; }
    const level = phone.result.level;
    const simTs = phone.state.lastSimTs;
    const start = wallStart.current;
    sent.current.level = level;
    void l.send({ type: 'status', workerId: phone.member.profile.workerId, level, simTs, lowBattery: false }).then((ok) => {
      if (start !== wallStart.current) return;
      queued.current = !ok;
      if (ok) { phone.postedLevel = level; phone.postedAt = simTs; }
      setNow(clock());
    });
  });

  const t = makeT(lang === 'ar' ? ar : en);
  const countdown = started && wall < wallStart.current ? Math.ceil((wallStart.current - wall) / 1000) : null;

  const apply = (run: Run, event: EngineEvent) => {
    run.state = engine.applyEvent(run.state, event, ctxOf(run));
    refresh(run);
    if (run.result.level !== run.postedLevel) {
      run.levelSinceWall = clock();
      if (layout !== 'phone') { run.postedLevel = run.result.level; run.postedAt = run.state.lastSimTs; }
    }
    setNow(clock());
  };
  const tapActivity = (activity: Activity) => {
    if (!phone) return;
    phone.lightFrom = activity === 'light' ? phone.state.lastSimTs : null;
    apply(phone, { type: 'activity-tap', activity, simTs: phone.state.lastSimTs });
  };
  const onMainAction = (action: MainAction) => tapActivity(action === 'in-shade' ? 'rest' : 'light');
  const onWatch = (m: WatchMode) => { setWatch(m); if (phone) apply(phone, { type: 'watch', mode: m, simTs: phone.state.lastSimTs }); };
  const onCall = (who: 'medic' | '998') => setToast({ text: t('demo.wouldDial', { who: who === '998' ? '998' : MEDIC_TEL }), until: clock() + 2500 });

  const running = started && countdown === null;
  const states = runs.current.map((r) => {
    const id = r.member.profile.workerId;
    const rem = layout === 'board' ? remote.current[id] : undefined;
    return rem
      ? { r, id, level: rem.level, levelSinceWall: rem.levelSinceWall, lastSeenWall: rem.lastSeenWall, lowBattery: rem.lowBattery, live: true, stale: wall - rem.lastSeenWall > STALE_MS }
      : { r, id, level: r.result.level, levelSinceWall: r.levelSinceWall, lastSeenWall: wall, lowBattery: r.member.phone && battery, live: layout === 'demo' && r.member.phone, stale: false };
  });
  const tiles = states.map((s) => toTile(s.r.member, s, acks.current[s.id] ?? null, wall));
  const levelSince = Object.fromEntries(states.map((s) => [s.id, s.levelSinceWall]));
  const view: BoardView = {
    sessionId: code ?? 'demo', scenario: 'replay-2026-07-15', multiplier: MULTIPLIER, offlineSince: null, sessionInvalid: false,
    needsYou: running ? needsYou(tiles, levelSince) : [],
    grid: running ? tiles : CREW.map((c): BoardTileState => ({ kind: 'no-data', workerId: c.profile.workerId, displayName: c.displayName })),
  };
  const onAck = (workerId: string, level: Level) => { acks.current[workerId] = { level, wall: clock() }; setNow(clock()); };

  const card = phone && (
    <WorkerCard
      card={toCard(phone.result, { postedLevel: phone.postedLevel, postedAt: phone.postedAt, lowBattery: battery, queued: layout === 'phone' && queued.current })}
      t={t} dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} simNow={simNow} clockLabel={hhmm(simNow)}
      lateJoinLabel={layout === 'phone' && joinedAt.current > wallStart.current ? hhmm(simAt(joinedAt.current)) : null}
      readings={{ wbgtC: wbgtAt(WBGT, simNow, true, false).c, heartRate: watch === 'on' ? heartRate(phone.result.activity, phone.state.budget) : null }}
      onMainAction={onMainAction} onActivity={tapActivity} onCall={onCall}
      onUnwell={() => apply(phone, { type: 'unwell', simTs: phone.state.lastSimTs })}
      onClearL4={() => apply(phone, { type: 'ok-buddy-checked', simTs: phone.state.lastSimTs })}
      onOpenMenu={() => (layout === 'phone' ? setLang((v) => (v === 'en' ? 'ar' : 'en')) : setDrawer((d) => !d))}
    />
  );
  const overlays = (over: ReactNode) => <>
    {countdown !== null && (
      <div aria-live="polite" className="absolute inset-0 flex items-center justify-center bg-ink/80 text-[120px] font-semibold tabular-nums text-paper">{countdown}</div>
    )}
    {simNow >= SHIFT_END && <div className="absolute inset-x-3 top-1/3 rounded-ui bg-ink p-4 text-center text-paper shadow-lift">{over}</div>}
    {toast && toast.until > wall && (
      <div role="status" className="absolute inset-x-3 top-12 rounded-ui bg-ink px-4 py-3 text-center text-lg font-semibold text-paper shadow-lift">{toast.text}</div>
    )}
  </>;

  if (layout === 'phone') {
    return (
      <div lang={lang} className="relative h-dvh w-full overflow-hidden bg-paper text-ink">
        {started && card ? card : (
          <main dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-2xl font-semibold">{t('join.waiting')}</p>
            <p className="text-base text-muted">{t('join.codeIs', { code: code ?? '' })}</p>
          </main>
        )}
        {overlays(<p className="text-xl font-semibold">{t('join.over')}</p>)}
      </div>
    );
  }

  const header = (sub: string, extra: ReactNode, actions: ReactNode) => (
    <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2">
      <Link href="/" className="text-lg font-semibold">{COPY.home}</Link>
      <span className="text-sm text-muted">{sub}</span>
      {extra}
      <div className="ms-auto flex gap-2">{actions}</div>
    </header>
  );
  const primary = 'min-h-10 rounded-ui bg-ink px-3 text-sm font-semibold text-paper shadow-press active:translate-y-[2px] active:shadow-none';
  const summary = <PlanSummary mode={mode} />;

  if (layout === 'board') {
    const seen = phoneSeen.current;
    const phoneLabel = !seen ? COPY.phoneNone : Date.now() - seen > STALE_MS ? COPY.phoneLost : COPY.phoneLive;
    const startButton = <button type="button" onClick={() => { restart('on'); setShowJoin(false); }} className={primary}>{started ? COPY.restart : COPY.start}</button>;
    return (
      <div className="flex min-h-dvh flex-col bg-paper text-ink">
        {header(COPY.boardSub, <span role="status" className="text-sm font-semibold">{phoneLabel}</span>, startButton)}
        {(!started || showJoin) && (
          <section aria-label={COPY.crewCode} className="flex shrink-0 flex-wrap items-center gap-6 border-b border-line px-4 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr ? <img src={qr} alt={COPY.qrAlt} width={220} height={220} className="h-[220px] w-[220px] border border-line" /> : <div className="h-[220px] w-[220px] bg-line" />}
            <div className="max-w-xl space-y-3">
              <p className="text-2xl font-semibold">{COPY.crewCode} <span className="font-mono tracking-[0.2em]">{code}</span></p>
              <p className="text-base">{linkKind === 'internet' ? COPY.joinInternet : COPY.joinLocal}</p>
              {joinUrl && <p className="break-all text-sm"><a href={joinUrl} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">{joinUrl}</a></p>}
              {!started && <button type="button" onClick={() => restart('on')} className={`${primary} min-h-tap px-6 text-lg`}>{COPY.start}</button>}
            </div>
          </section>
        )}
        <Board
          view={view} timeline={{ ...timeline, simNow }} crewName={COPY.crew} clockLabel={hhmm(simNow)} formatTime={hhmm} wallNow={wall}
          qr={started && qr ? <button type="button" onClick={() => setShowJoin((v) => !v)} aria-label={COPY.qrAlt} className="h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="" className="h-full w-full" />
          </button> : null}
          onAck={onAck} summary={summary}
        />
      </div>
    );
  }

  const seg = <T extends string>(label: string, value: T, options: [T, string][], onPick: (v: T) => void) => (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex border border-line">
        {options.map(([v, text]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onPick(v)} className={`min-h-10 px-3 text-sm font-semibold ${value === v ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}>{text}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink lg:h-dvh">
      {header(COPY.sub, mode === 'off' && <span className="bg-ink px-2 py-1 text-sm font-semibold text-paper">{COPY.plannerOff}</span>, <>
        <Link href="/start" className="flex min-h-10 items-center rounded-ui border-2 border-ink px-3 text-sm font-semibold">{COPY.realPhone}</Link>
        <button type="button" aria-expanded={drawer} onClick={() => setDrawer((d) => !d)} className="min-h-10 rounded-ui border-2 border-ink px-3 text-sm font-semibold">{COPY.controls}</button>
        <button type="button" onClick={() => restart(mode)} className={primary}>{COPY.restart}</button>
      </>)}
      {drawer && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-line px-4 py-3">
          {seg(COPY.watch, watch, [['on', COPY.on], ['off', COPY.off], ['drop', COPY.drop]], onWatch)}
          {seg(COPY.battery, battery ? 'on' : 'off', [['off', COPY.off], ['on', COPY.on]], (v) => setBattery(v === 'on'))}
          {seg(COPY.auto, auto ? 'on' : 'off', [['on', COPY.on], ['off', COPY.off]], (v) => setAuto(v === 'on'))}
          {seg(COPY.planner, mode, [['on', COPY.on], ['off', COPY.off]], (v) => { setMode(v); restart(v); })}
          {seg(COPY.lang, lang, [['en', 'EN'], ['ar', 'AR']], setLang)}
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section aria-label={COPY.phone} className="flex shrink-0 justify-center p-2">
          <div className="relative h-[648px] w-[368px] overflow-hidden rounded-[28px] border-4 border-ink shadow-lift">
            {card}
            {overlays(<>
              <p className="text-xl font-semibold">{COPY.over}</p>
              <button type="button" onClick={() => restart(mode)} className="mt-3 min-h-tap w-full rounded-ui bg-paper px-4 text-lg font-semibold text-ink">{COPY.restart}</button>
            </>)}
          </div>
        </section>
        <section aria-label={COPY.board} className="min-w-0 flex-1 overflow-auto lg:border-s lg:border-line">
          <Board view={view} timeline={{ ...timeline, simNow }} crewName={COPY.crew} clockLabel={hhmm(simNow)} formatTime={hhmm} wallNow={wall} qr={null} onAck={onAck} summary={summary} />
        </section>
      </div>
    </div>
  );
}
