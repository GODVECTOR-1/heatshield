'use client';

import type { BoardTileState } from '@/lib/types';
import { CrewTile } from './CrewTile';
import HeatTimeline from './HeatTimeline';
import type { BoardProps } from './types';

const COPY = {
  replay: 'REPLAY · 240×', needsYou: 'Needs you', empty: 'Nobody needs you right now.',
  offline: 'Board offline since', frozen: 'statuses frozen', invalid: 'Session not valid: start a new session',
  replayScenario: '15 Jul 2026 · replay', liveScenario: 'Live session', firstPoll: 'Waiting for first status update', progress: 'Replay progress', crew: 'Crew',
};

function LockIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="9" width="12" height="9" rx="1" /><path d="M6.5 9V6a3.5 3.5 0 0 1 7 0v3" /></svg>;
}

function BoardHeader({ crewName, view, clockLabel, qr }: Pick<BoardProps, 'crewName' | 'view' | 'clockLabel' | 'qr'>) {
  return <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
    <div className="flex min-w-0 items-center gap-3">
      <div className="min-w-0"><p className="flex items-center gap-2 truncate text-lg font-semibold"><LockIcon />{crewName}</p><p className="mt-1 text-sm text-muted">{view.scenario === 'live' ? COPY.liveScenario : COPY.replayScenario}</p></div>
      {view.scenario !== 'live' && <span className="bg-ink px-3 py-2 text-sm font-semibold text-paper">{COPY.replay}</span>}
    </div>
    <p className="ms-auto text-4xl font-semibold tabular-nums leading-none md:text-5xl">{clockLabel}</p>
    {qr && <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-line bg-paper p-1">{qr}</div>}
  </header>;
}

function ReplayProgress({ timeline, formatTime }: Pick<BoardProps, 'timeline' | 'formatTime'>) {
  const span = Math.max(1, timeline.shiftEnd - timeline.shiftStart);
  const ratio = Math.max(0, Math.min(1, (timeline.simNow - timeline.shiftStart) / span));
  const tickTimes = Array.from({ length: 13 }, (_, index) => timeline.shiftStart + index * 60 * 60 * 1000).filter((time) => time <= timeline.shiftEnd);
  return <div role="progressbar" aria-label={COPY.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} className="border-b border-line py-2">
    <div className="relative h-2 bg-line"><span className="absolute inset-y-0 start-0 bg-ink" style={{ width: `${ratio * 100}%` }} /><span className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-ui border-2 border-paper bg-ink" style={{ insetInlineStart: `calc(${ratio * 100}% - 8px)` }} /></div>
    <div className="relative mt-1 h-1">{tickTimes.map((time) => <span key={time} aria-hidden="true" className="absolute inset-y-0 w-px bg-muted" style={{ insetInlineStart: `${((time - timeline.shiftStart) / span) * 100}%` }} />)}</div>
    <div className="flex justify-between text-sm font-semibold tabular-nums"><span>{formatTime(timeline.shiftStart)}</span><span>{formatTime(timeline.shiftEnd)}</span></div>
  </div>;
}

function NeedsYou({ tiles, wallNow, onAck }: { tiles: BoardTileState[]; wallNow: number; onAck: BoardProps['onAck'] }) {
  return <section aria-label={COPY.needsYou} className="border-b border-line py-3">
    <div className="mb-2 flex items-baseline justify-between"><h2 className="text-lg font-semibold">{COPY.needsYou}</h2>{!tiles.length && <p className="text-base text-muted">{COPY.empty}</p>}</div>
    {!!tiles.length && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">{tiles.map((tile) => <CrewTile key={tile.workerId} tile={tile} wallNow={wallNow} onAck={onAck} needsAttention />)}</div>}
  </section>;
}

function FirstPoll({ grid }: { grid: BoardTileState[] }) {
  return <div aria-label={COPY.firstPoll} className="grid grid-cols-4 gap-2 xl:grid-cols-6">{grid.map((tile, index) => <div key={tile.workerId || index} className="min-h-24 border border-line bg-paper p-3"><div className="h-4 w-3/5 bg-line" /><div className="mt-4 h-3 w-2/5 bg-line" /></div>)}</div>;
}

export default function Board(props: BoardProps) {
  const { view, timeline, crewName, clockLabel, formatTime, wallNow, qr, onAck, summary } = props;
  if (view.sessionInvalid) return <main className="mx-auto flex min-h-dvh max-w-5xl items-center justify-center p-6"><section className="w-full border border-line bg-paper p-8 text-center shadow-lift"><h1 className="text-2xl font-semibold">{COPY.invalid}</h1></section></main>;
  const offlineLabel = view.offlineSince === null ? null : `${COPY.offline} ${formatTime(view.offlineSince)}, ${COPY.frozen}`;
  return <main className="mx-auto min-h-dvh max-w-[1600px] overflow-hidden bg-paper px-4 py-3 text-ink md:px-6">
    <BoardHeader crewName={crewName} view={view} clockLabel={clockLabel} qr={qr} />
    {offlineLabel && <div role="status" className="my-2 bg-ink px-4 py-2 text-base font-semibold text-paper">{offlineLabel}</div>}
    {view.scenario !== 'live' && <ReplayProgress timeline={timeline} formatTime={formatTime} />}
    <NeedsYou tiles={view.needsYou} wallNow={wallNow} onAck={onAck} />
    <section aria-label={COPY.crew} className="py-3">
      {view.grid.length > 0 && view.needsYou.length === 0 && view.grid.every((tile) => tile.kind === 'no-data')
        ? <FirstPoll grid={view.grid} />
        : <div className="grid grid-cols-4 gap-2 xl:grid-cols-6">{view.grid.map((tile) => <CrewTile key={tile.workerId} tile={tile} wallNow={wallNow} onAck={onAck} />)}</div>}
      {!view.grid.length && <FirstPoll grid={Array.from({ length: 8 }, (_, index) => ({ kind: 'no-data', workerId: `waiting-${index}`, displayName: '' } as BoardTileState))} />}
    </section>
    <HeatTimeline timeline={timeline} formatTime={formatTime} />
    {summary}
  </main>;
}
