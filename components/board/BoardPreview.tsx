'use client';

import { useEffect, useState } from 'react';
import Board from './Board';
import type { TimelineData } from './types';
import type { BoardView, Level } from '@/lib/types';

const COPY = { view: 'Board view', simulate: 'Simulate live', crew: 'Crew A · Abu Dhabi', on: 'On', off: 'Off' };
const wallNow = 1794650000000;
const noop = () => {};

export default function BoardPreview({ views, timeline, initialName }: { views: Record<string, BoardView>; timeline: TimelineData; initialName?: string }) {
  const names = Object.keys(views);
  const [name, setName] = useState(initialName ?? (names.includes('live') ? 'live' : names[0]));
  const [simulate, setSimulate] = useState(false);
  const [level, setLevel] = useState<Level>(0);
  useEffect(() => {
    if (!simulate) return;
    const timer = window.setInterval(() => setLevel((current) => ((current + 1) % 5) as Level), 3000);
    return () => window.clearInterval(timer);
  }, [simulate]);
  const baseView = views[name];
  const view = simulate && baseView.grid.length ? {
    ...baseView,
    grid: baseView.grid.map((tile, index) => index === 0 && tile.kind === 'status' ? { ...tile, level } : tile),
  } : baseView;
  const formatTime = (epoch: number) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(epoch);

  return <div className="min-h-dvh bg-paper text-ink">
    <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
      <label className="flex items-center gap-2 text-base font-semibold">{COPY.view}<select value={name} onChange={(event) => { setName(event.target.value); setSimulate(false); }} className="min-h-10 border border-line bg-paper px-3">{names.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <button type="button" aria-pressed={simulate} onClick={() => setSimulate((value) => !value)} className={`min-h-10 border px-3 font-semibold ${simulate ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink'}`}>{COPY.simulate}: {simulate ? COPY.on : COPY.off}</button>
    </div>
    <Board view={view} timeline={timeline} crewName={COPY.crew} clockLabel={formatTime(timeline.simNow)} formatTime={formatTime} wallNow={wallNow} qr={null} onAck={noop} />
  </div>;
}
