'use client';

import { useEffect, useRef, useState } from 'react';
import type { BoardTileState, Level } from '@/lib/types';
import { LevelIcon } from '@/components/worker/WorkerCard';

const themes = [
  ['bg-l0', 'text-on-l0'], ['bg-l1', 'text-on-l1'], ['bg-l2', 'text-on-l2'],
  ['bg-l3', 'text-on-l3'], ['bg-l4', 'text-on-l4'],
];
const COPY = {
  noData: 'No data', sendBuddy: 'Send buddy', moveToLight: 'Move to light task', allowShade: 'Allow shade break',
  overdue: 'Ack overdue', stale: 'Stale', battery: 'Buddy check: low battery', acked: 'Help sent', ack: 'Help sent',
  due: 'Ack due', minAgo: 'min ago', sim: 'SIM',
};

function actionLabel(action: 'send-buddy' | 'move-to-light' | 'allow-shade' | null) {
  if (action === 'send-buddy') return COPY.sendBuddy;
  if (action === 'move-to-light') return COPY.moveToLight;
  if (action === 'allow-shade') return COPY.allowShade;
  return '';
}

function dueLabel(ackDueAt: number, wallNow: number) {
  const seconds = Math.max(0, Math.ceil((ackDueAt - wallNow) / 1000));
  return `${COPY.due} ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function StatusTile({ tile, wallNow, onAck, needsAttention }: {
  tile: Extract<BoardTileState, { kind: 'status' }>;
  wallNow: number;
  onAck: (workerId: string, level: Level) => void;
  needsAttention: boolean;
}) {
  const previousLevel = useRef(tile.level);
  const [transition, setTransition] = useState({ level: tile.level, from: tile.level, active: false });
  useEffect(() => {
    if (previousLevel.current === tile.level) return;
    const previous = previousLevel.current;
    previousLevel.current = tile.level;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTransition({ level: tile.level, from: tile.level, active: false });
      return;
    }
    setTransition({ level: tile.level, from: previous, active: true });
    const timer = window.setTimeout(() => setTransition({ level: tile.level, from: tile.level, active: false }), 550);
    return () => window.clearTimeout(timer);
  }, [tile.level]);

  const [background, foreground] = themes[transition.active ? transition.from : tile.level];
  const [nextBackground] = themes[tile.level];
  const badge = tile.ack === 'overdue' || tile.badge === 'overdue' ? COPY.overdue : tile.badge === 'stale' ? COPY.stale : tile.badge === 'battery' ? COPY.battery : null;
  const elapsed = Math.max(0, Math.floor((wallNow - tile.lastSeenAt) / 60_000));
  const acknowledge = tile.ack === 'due' && tile.ackDueAt !== null;
  const action = actionLabel(tile.action);
  return <article tabIndex={0} className={`relative isolate flex min-h-24 flex-col justify-between overflow-hidden border shadow-lift ${needsAttention ? 'p-4' : 'p-2'} ${background} ${foreground} ${tile.sim ? 'border-dashed border-2 border-ink' : 'border-transparent'} ${tile.level >= 3 || needsAttention ? 'animate-attention' : ''} ${tile.level === 4 ? 'stripe-l4' : ''}`}>
    {transition.active && <div key={transition.level} aria-hidden="true" className={`pointer-events-none absolute inset-0 z-0 ${nextBackground} animate-level-sweep`} />}
    {tile.stale && <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] hatch" />}
    <div className="relative z-10 flex items-start justify-between gap-2">
      <div className="min-w-0"><p className={`truncate font-semibold ${needsAttention ? 'text-lg' : 'text-base'}`}>{tile.displayName}</p>{action && <p className={`mt-1 font-semibold ${needsAttention ? 'text-base' : 'text-sm'}`}>{action}</p>}</div>
      {tile.sim && <span className="shrink-0 border border-current px-1 text-xs font-semibold">{COPY.sim}</span>}
    </div>
    <div className={`relative z-10 flex items-center justify-between gap-2 ${needsAttention ? 'mt-2' : 'mt-1'}`}>
      <div className="flex items-center gap-2"><span className={`font-semibold tabular-nums leading-none ${needsAttention ? 'text-4xl' : 'text-3xl'}`}>{tile.level}</span><LevelIcon level={tile.level} size={needsAttention ? 32 : 28} /></div>
      {badge && <span className={`max-w-[58%] border border-current px-2 py-1 font-semibold leading-tight ${needsAttention ? 'text-sm' : 'text-xs'}`}>{badge}</span>}
    </div>
    <div className={`relative z-10 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 font-semibold ${needsAttention ? 'mt-2 text-sm' : 'mt-1 text-xs'}`}>
      <span className="tabular-nums">{elapsed} {COPY.minAgo}</span>
      {acknowledge && <span className="tabular-nums">{dueLabel(tile.ackDueAt!, wallNow)}</span>}
      {tile.ack === 'acked' && <span className="inline-flex items-center gap-1"><svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 10 4 4 10-9" /></svg>{COPY.acked}</span>}
      {(tile.ack === 'due' || tile.ack === 'overdue') && <button type="button" onClick={() => onAck(tile.workerId, tile.level)} className={`rounded-ui bg-ink text-paper shadow-press ${needsAttention ? 'min-h-10 px-3' : 'min-h-8 px-2'}`}>{COPY.ack}</button>}
    </div>
  </article>;
}

export function CrewTile({ tile, wallNow, onAck, needsAttention = false }: {
  tile: BoardTileState;
  wallNow: number;
  onAck: (workerId: string, level: Level) => void;
  needsAttention?: boolean;
}) {
  if (tile.kind === 'no-data') return <article tabIndex={0} className="flex min-h-24 flex-col justify-between border border-line bg-paper p-3 text-ink shadow-lift">
    <span className="font-semibold">{tile.displayName}</span><span className="text-base text-muted">{COPY.noData}</span>
  </article>;
  return <StatusTile tile={tile} wallNow={wallNow} onAck={onAck} needsAttention={needsAttention} />;
}
