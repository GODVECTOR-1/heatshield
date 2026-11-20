'use client';

// Worker main card (spec 05). From the v0 visual pass (chat x6HlVHgSygt), copied in by hand with fixes:
// marker on the arc, outer band ring, SVG activity icons, disabled contrast, delivery landmark, pressed main button,
// colour transition instead of an invisible sweep overlay, and a layout where the sheet never clips (container units).
// Presentational only: no fetching, timers, storage or Date calls; the caller formats times.
import type { Activity, CardView, Level, MainAction } from '@/lib/types';

export interface WorkerCardProps {
  card: CardView;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
  lang: string;
  /** Epoch ms, for the countdown ring and "n min ago". */
  simNow: number;
  /** Site time, already formatted "09:58". */
  clockLabel: string;
  /** card.lateJoinAt as site time "HH:MM", formatted by the caller. */
  lateJoinLabel: string | null;
  onMainAction: (action: MainAction) => void;
  onCall: (who: 'medic' | '998') => void;
  onActivity: (activity: Activity) => void;
  onUnwell: () => void;
  onClearL4: () => void;
  onOpenMenu: () => void;
  /** Live readings line; null hides that reading. */
  readings: { wbgtC: number | null; heartRate: number | null };
}

type Shape = 'circle' | 'drop' | 'triangle' | 'square' | 'octagon';
const LEVELS: { bg: string; text: string; shape: Shape }[] = [
  { bg: 'bg-l0', text: 'text-on-l0', shape: 'circle' },
  { bg: 'bg-l1', text: 'text-on-l1', shape: 'drop' },
  { bg: 'bg-l2', text: 'text-on-l2', shape: 'triangle' },
  { bg: 'bg-l3', text: 'text-on-l3', shape: 'square' },
  { bg: 'bg-l4', text: 'text-on-l4', shape: 'octagon' },
];

export function LevelIcon({ level, size = 64 }: { level: Level; size?: number }) {
  const shape = LEVELS[level].shape;
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 100 100" className="shrink-0">
      {shape === 'circle' && <circle cx="50" cy="50" r="40" fill="currentColor" />}
      {shape === 'drop' && <path d="M50 7C42 22 17 49 17 66a33 33 0 0 0 66 0C83 49 58 22 50 7Z" fill="currentColor" />}
      {shape === 'triangle' && <path d="M50 10 94 88H6L50 10Z" fill="currentColor" />}
      {shape === 'square' && <rect x="12" y="12" width="76" height="76" fill="currentColor" />}
      {shape === 'octagon' && <path d="m31 7 38 0 24 24v38L69 93H31L7 69V31Z" fill="currentColor" />}
    </svg>
  );
}

export function ActivityIcon({ activity }: { activity: Activity }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="mx-auto h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {activity === 'rest' && <path d="M8 5v14M16 5v14" />}
      {activity === 'light' && <><path d="M4 18a8 8 0 0 1 16 0" /><path d="M12 18l4-7" /></>}
      {activity === 'moderate' && <><path d="m12 3 9 9-9 9-9-9 9-9Z" /><path d="M12 7v10" /></>}
      {activity === 'heavy' && <><path d="M7 3h10l5 9-5 9H7l-5-9 5-9Z" /><path d="M12 7v10" /></>}
    </svg>
  );
}

export const LEVEL_THEME: Record<Level, string> = {
  0: '#0b5e2e', 1: '#ffd400', 2: '#ff8a00', 3: '#9e1116', 4: '#4a1470',
};

const activities: Activity[] = ['rest', 'light', 'moderate', 'heavy'];
const bandWidths = [15, 15, 20, 25, 25];
const bandLevels: Level[] = [4, 3, 2, 1, 0];

function BudgetGauge({ fraction, t, dir, compact }: { fraction: number; t: WorkerCardProps['t']; dir: 'ltr' | 'rtl'; compact: boolean }) {
  const value = Math.max(0, Math.min(1, fraction));
  const length = Math.PI * 90;
  let elapsed = 0;
  return (
    <div className="flex items-center gap-3">
      <svg role="img" aria-label={t('a11y.budget')} viewBox="0 0 220 126" className={`${compact ? 'h-[64px]' : 'h-[88px]'} min-w-0 flex-1 ${dir === 'rtl' ? '-scale-x-100' : ''}`}>
        {bandLevels.map((level, index) => { const start = bandWidths.slice(0, index).reduce((a, b) => a + b, 0); const ring = Math.PI * 103; return <path key={`ring-${level}`} d="M7 112 A103 103 0 0 1 213 112" fill="none" stroke={LEVEL_THEME[level]} strokeWidth="4" strokeDasharray={`${ring * bandWidths[index] / 100} ${ring}`} strokeDashoffset={-ring * start / 100} />; })}
        <path d="M20 112 A90 90 0 0 1 200 112" fill="none" stroke="var(--color-line)" strokeWidth="18" />
        {bandLevels.map((level, index) => {
          const start = elapsed;
          const end = start + bandWidths[index];
          elapsed = end;
          const activeEnd = Math.min(value * 100, end);
          const active = Math.max(0, activeEnd - start);
          if (!active) return null;
          return <path key={level} d="M20 112 A90 90 0 0 1 200 112" fill="none" stroke={LEVEL_THEME[level]} strokeWidth="18" strokeDasharray={`${length * active / 100} ${length}`} strokeDashoffset={-length * start / 100} className="transition-[stroke-dasharray,stroke-dashoffset] duration-[600ms]" />;
        })}
        <circle cx={110 - 90 * Math.cos(Math.PI * value)} cy={112 - 90 * Math.sin(Math.PI * value)} r="7" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="3" />
      </svg>
    </div>
  );
}

export default function WorkerCard(props: WorkerCardProps) {
  const { card, t, dir, lang, simNow, clockLabel, lateJoinLabel, readings, onMainAction, onCall, onActivity, onUnwell, onClearL4, onOpenMenu } = props;
  const callMain = card.mainAction === 'call' || (card.delivery.kind === 'queued' && card.level >= 3);
  const band = LEVELS[card.level];
  const selected = card.activity === 'veryHeavy' ? 'heavy' : card.activity;
  const rest = card.restCountdownEnd !== null;
  const remaining = rest ? Math.max(0, Math.ceil((card.restCountdownEnd! - simNow) / 60_000)) : 0;
  const minutesAgo = card.delivery.kind === 'sent' ? Math.max(0, Math.floor((simNow - card.delivery.at) / 60_000)) : 0;
  return (
    <div dir={dir} lang={lang} className={`relative flex h-full min-h-0 flex-col overflow-hidden transition-colors duration-500 motion-reduce:transition-none ${band.bg} ${band.text}`}>
      <div className="z-10 shrink-0">
        {card.banners.map((banner) => <div key={banner} className="bg-ink px-3 py-1 text-base font-semibold text-paper">{banner === 'replay' ? `${t('banner.replay')} · ${clockLabel}` : t(`banner.${banner}`)}</div>)}
        {lateJoinLabel && <div className="bg-ink px-3 py-1 text-base text-paper">{t('card.joinedAt', { time: lateJoinLabel })}</div>}
        {card.startedLower && <div className="bg-ink px-3 py-1 text-base text-paper">{t('card.startedLower')}</div>}
      </div>
      {/* The header takes whatever height the sheet leaves; the number scales to it (container units), so the sheet and the unwell button never clip. */}
      <header className={`relative flex min-h-0 flex-1 flex-col px-4 pb-3 pt-2 text-center ${card.level === 4 ? 'stripe-l4' : ''}`}>
        <button type="button" aria-label={t('a11y.menu')} onClick={onOpenMenu} className="absolute start-1 top-1 z-10 flex min-h-tap min-w-tap items-center justify-center"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
        <div aria-live="assertive" aria-atomic="true" className="relative flex min-h-0 flex-1 flex-col items-center">
          <div className="relative flex min-h-0 w-full flex-1 items-center justify-center gap-2 [container-type:size]">
            <span aria-hidden="true" className={`absolute inset-0 flex items-center justify-center opacity-15 [&>svg]:h-[min(240px,100cqh)] [&>svg]:w-auto ${card.level === 4 ? 'animate-l4-pulse' : ''}`}><LevelIcon level={card.level} size={240} /></span>
            {rest ? <svg aria-hidden="true" className="absolute h-full w-auto -rotate-90" viewBox="0 0 180 180"><circle cx="90" cy="90" r="82" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="7" /><circle cx="90" cy="90" r="82" fill="none" stroke="currentColor" strokeWidth="7" strokeDasharray={`${Math.min(1, remaining / 15) * 515} 515`} /></svg> : null}
            <span className="relative font-semibold tabular-nums leading-none" style={{ fontSize: rest ? 'min(110px, 55cqh)' : 'min(170px, 90cqh)' }}>{card.level}</span>
            {card.level === 4 && <span className="relative text-3xl font-semibold">{t('card.stop')}</span>}
          </div>
          <p className="max-w-full shrink-0 text-pretty text-[28px] font-semibold leading-tight">{t(card.phraseKey)}</p>
          {!callMain && (readings.wbgtC !== null || readings.heartRate !== null) && <p className="mt-1 shrink-0 text-lg font-semibold tabular-nums">{readings.wbgtC !== null && t('reading.wbgt', { value: readings.wbgtC.toFixed(1) })}{readings.wbgtC !== null && readings.heartRate !== null ? ' · ' : ''}{readings.heartRate !== null && t('reading.hr', { value: readings.heartRate })}</p>}
        </div>
      </header>
      <section className="animate-sheet-rise relative flex shrink-0 flex-col gap-1 rounded-t-sheet bg-paper px-3 pt-2 text-ink shadow-lift">
        <div className="flex shrink-0 items-center gap-2">
          <BudgetGauge fraction={card.budgetFraction} t={t} dir={dir} compact={callMain} />
          {card.reason && <span className="max-w-[34%] rounded-ui border border-line px-2 py-1 text-base">{t(`reason.${card.reason}`)}</span>}
        </div>
        {callMain ? <div className="grid shrink-0 gap-1">
          <button type="button" onClick={() => onCall('medic')} className="min-h-tap rounded-ui bg-ink px-3 text-start text-lg font-semibold text-paper shadow-press active:translate-y-[2px] active:shadow-none"><span>{t('action.callMedic')}</span> <span dir="ltr" className="tabular-nums">{card.medicTel}</span></button>
          <button type="button" onClick={() => onCall('998')} className="min-h-tap rounded-ui bg-ink px-3 text-start text-lg font-semibold text-paper shadow-press active:translate-y-[2px] active:shadow-none">{t('action.call998')}</button>
          {card.level === 4 && <button type="button" disabled={!card.canClearL4} onClick={onClearL4} className="min-h-tap rounded-ui border-2 border-ink px-3 text-start text-base font-semibold disabled:border-line disabled:text-muted">{t('action.okBuddyChecked')}</button>}
        </div> : card.mainAction !== 'none' && <button type="button" onClick={() => onMainAction(card.mainAction)} className="min-h-tap shrink-0 rounded-ui bg-ink px-3 text-start text-lg font-semibold text-paper shadow-press active:translate-y-[2px] active:shadow-none">{card.mainAction === 'in-shade' ? (rest ? t('action.restMinutes', { minutes: remaining }) : t('action.inShade')) : t('action.lightTask')}</button>}
        <section aria-label={t('a11y.delivery')} className="flex min-h-8 shrink-0 items-center gap-2 text-base font-semibold">
          {card.delivery.kind === 'sent' && <><span className={`flex h-7 w-7 shrink-0 items-center justify-center ${LEVELS[card.delivery.level].bg} ${LEVELS[card.delivery.level].text}`}><LevelIcon level={card.delivery.level} size={18} /></span><span>{t('delivery.sent', { level: card.delivery.level, minutes: minutesAgo })}</span></>}
          {card.delivery.kind === 'queued' && <span>{t('delivery.queued')}</span>}{card.delivery.kind === 'not-shared' && <span>{t('delivery.notShared')}</span>}
        </section>
        {!(callMain && card.activityLocked) && <nav aria-label={t('a11y.activity')} className="grid shrink-0 grid-cols-4 gap-1">
          {activities.map((activity) => <button key={activity} type="button" disabled={card.activityLocked} aria-pressed={selected === activity} onClick={() => onActivity(activity)} className={`min-h-tap rounded-ui border-2 px-1 text-center text-base font-semibold ${selected === activity ? 'border-ink bg-ink text-paper shadow-press' : 'border-line bg-paper text-ink'} disabled:border-line disabled:bg-paper disabled:text-muted disabled:shadow-none`}><ActivityIcon activity={activity} /><span>{t(`activity.${activity}`)}</span></button>)}
        </nav>}
        <footer className="shrink-0 pb-2"><button type="button" onClick={onUnwell} className="min-h-tap w-full rounded-ui border-2 border-ink bg-paper px-3 text-xl font-semibold text-ink shadow-press active:translate-y-[2px] active:shadow-none">{t('action.unwell')}</button></footer>
      </section>
    </div>
  );
}
