'use client';

import { useState } from 'react';
import type { Level } from '@/lib/types';
import type { TimelineData } from './types';

const COPY = {
  sun: 'Sun', shade: 'Shade', plan: 'Plan', predictedA: 'Predicted', predictedB: 'level', rest: 'Rest', now: 'Now',
  midday: 'Midday break (law)', source: 'Forecast fetched', replaySource: 'Replay: bundled Open-Meteo archive',
  tooHot: 'Too hot all day', banWindow: 'Inside the midday break', noSlot: 'No free slot', pastLatest: 'Past latest start',
  planner: 'Planner comparison only', on: 'On', off: 'Off', alerts: 'Level 2+ alerts', completed: 'Tasks completed',
  title: "Today's heat plan", comparison: 'vs', noValue: '—',
};
const heatClass = ['bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4', 'bg-heat-5'];
const taskClass: Record<string, string> = { light: 'bg-task-light', moderate: 'bg-task-moderate', heavy: 'bg-task-heavy', veryHeavy: 'bg-task-veryheavy' };
const taskText: Record<string, string> = { light: 'text-ink', moderate: 'text-ink', heavy: 'text-ink', veryHeavy: 'text-paper' };
const taskFill: Record<string, string> = { light: 'var(--color-task-light)', moderate: 'var(--color-task-moderate)', heavy: 'var(--color-task-heavy)', veryHeavy: 'var(--color-task-veryheavy)' };
const heatFill = ['var(--color-heat-1)', 'var(--color-heat-2)', 'var(--color-heat-3)', 'var(--color-heat-4)', 'var(--color-heat-5)'];

function heatIndex(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 0;
  if (value < 28) return 0;
  if (value < 30) return 1;
  if (value < 32) return 2;
  if (value < 34) return 3;
  return 4;
}

function PlannerCompare({ timeline }: { timeline: TimelineData }) {
  const [selected, setSelected] = useState<'on' | 'off'>('on');
  const on = timeline.plannerCompare.on;
  const off = timeline.plannerCompare.off;
  return <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
    <div role="group" aria-label={COPY.planner} className="flex border border-line">
      {(['on', 'off'] as const).map((option) => <button key={option} type="button" aria-pressed={selected === option} onClick={() => setSelected(option)} className={`min-h-10 px-3 text-sm font-semibold ${selected === option ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}>{option === 'on' ? COPY.on : COPY.off}</button>)}
    </div>
    {selected === 'off' && <p className="flex flex-wrap gap-x-4 text-sm tabular-nums"><span>{COPY.alerts} {on.level2PlusEvents} {COPY.comparison} {off.level2PlusEvents}</span><span>{COPY.completed} {on.tasksCompleted} {COPY.comparison} {off.tasksCompleted}</span></p>}
  </div>;
}

export default function HeatTimeline({ timeline, formatTime }: { timeline: TimelineData; formatTime: (ms: number) => string }) {
  const width = 1000;
  const plotStart = 95;
  const plotWidth = 885;
  const duration = Math.max(1, timeline.shiftEnd - timeline.shiftStart);
  const x = (time: number) => plotStart + ((time - timeline.shiftStart) / duration) * plotWidth;
  const bandHeight = 25;
  const tasks = new Map(timeline.tasks.map((task) => [task.id, task]));
  const plottedSlots = timeline.schedule;
  const predicted = timeline.predicted;
  const yLevel = (level: Level) => 136 + (4 - level) * 20;
  const nowX = x(timeline.simNow);
  const labelX = Math.min(Math.max(nowX, plotStart + 32), plotStart + plotWidth - 32); // keeps "Now HH:MM" inside the plot
  const ticks = Array.from({ length: 13 }, (_, index) => timeline.shiftStart + index * 60 * 60 * 1000).filter((time) => time <= timeline.shiftEnd);

  return <section className="min-w-0 border-t border-line pt-3" aria-label={COPY.title}>
    <div className="mb-1 flex items-end justify-between gap-3"><h2 className="text-lg font-semibold">{COPY.title}</h2><p className="text-xs text-muted">{timeline.forecastFetchedAt === null ? COPY.replaySource : `${COPY.source} ${formatTime(timeline.forecastFetchedAt)}`}</p></div>
    <div className="overflow-hidden">
      <svg viewBox={`0 0 ${width} 252`} className="h-auto w-full text-ink">
        <rect x={plotStart} y="0" width={Math.max(0, nowX - plotStart)} height="235" fill="var(--color-line)" />
        <text x="8" y="17" fontSize="13" fontWeight="600">{COPY.sun}</text>
        <text x="8" y="54" fontSize="13" fontWeight="600">{COPY.shade}</text>
        <text x="8" y="92" fontSize="13" fontWeight="600">{COPY.plan}</text>
        <text x="8" y="170" fontSize="12" fontWeight="600"><tspan x="8">{COPY.predictedA}</tspan><tspan x="8" dy="15">{COPY.predictedB}</tspan></text>
        {timeline.wbgt.map((hour, index) => {
          const next = timeline.wbgt[index + 1]?.t ?? Math.min(timeline.shiftEnd, hour.t + 3600000);
          const left = x(hour.t);
          const cellWidth = Math.max(1, x(next) - left);
          const sun = hour.sun === null ? null : hour.sun;
          const shade = hour.shade === null ? null : hour.shade;
          return <g key={hour.t}>
            <rect x={left} y="0" width={cellWidth} height={bandHeight} className={heatClass[heatIndex(sun)]} fill={heatFill[heatIndex(sun)]} />
            <text x={left + cellWidth / 2} y="17" textAnchor="middle" fontSize="12" fontWeight="600" fill={heatIndex(sun) === 4 ? 'var(--color-paper)' : 'var(--color-ink)'}>{sun === null ? COPY.noValue : sun.toFixed(1)}</text>
            <rect x={left} y="31" width={cellWidth} height="18" className={heatClass[heatIndex(shade)]} fill={heatFill[heatIndex(shade)]} />
            <text x={left + cellWidth / 2} y="45" textAnchor="middle" fontSize="11" fill={heatIndex(shade) === 4 ? 'var(--color-paper)' : 'var(--color-ink)'}>{shade === null ? COPY.noValue : shade.toFixed(1)}</text>
          </g>;
        })}
        {plottedSlots.map((slot, index) => {
          const left = x(slot.start);
          const right = x(slot.end);
          const widthPx = Math.max(0, right - left);
          const task = slot.kind === 'task' ? tasks.get(slot.taskId) : null;
          return <g key={`${slot.start}-${index}`}>
            <rect x={left} y="62" width={widthPx} height="42" className={slot.kind === 'rest' ? 'fill-paper stroke-line' : taskClass[task?.metabolicClass ?? 'moderate']} fill={slot.kind === 'rest' ? 'var(--color-paper)' : taskFill[task?.metabolicClass ?? 'moderate']} stroke="var(--color-line)" strokeWidth="1" />
            <foreignObject x={left + 3} y="67" width={Math.max(0, widthPx - 6)} height="32">
              <div className={`h-full overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold leading-7 ${slot.kind === 'rest' ? 'text-ink' : taskText[task?.metabolicClass ?? 'moderate']}`}>{slot.kind === 'rest' ? COPY.rest : task?.name}</div>
            </foreignObject>
          </g>;
        })}
        {predicted.map((point, index) => {
          const next = predicted[index + 1];
          if (!next) return null;
          return <path key={`${point.t}-${index}`} d={`M ${x(point.t)} ${yLevel(point.level)} H ${x(next.t)} V ${yLevel(next.level)}`} fill="none" stroke="var(--color-ink)" strokeWidth="3" />;
        })}
        {predicted.map((point) => <g key={`level-${point.t}`} transform={`translate(${x(point.t)} ${yLevel(point.level)})`}><circle r="3" fill="var(--color-ink)" /></g>)}
        <rect x={plotStart} y="0" width={Math.max(0, nowX - plotStart)} height="235" fill="var(--color-line)" opacity="0.12" pointerEvents="none" />
        <foreignObject x={x(timeline.banStart)} y="0" width={Math.max(0, x(timeline.banEnd) - x(timeline.banStart))} height="235"><div className="hatch h-full w-full" /></foreignObject>
        <text x={(x(timeline.banStart) + x(timeline.banEnd)) / 2} y="119" textAnchor="middle" fontSize="12" fontWeight="600">{COPY.midday}</text>
        <line x1={nowX} y1="0" x2={nowX} y2="235" stroke="var(--color-ink)" strokeWidth="2" />
        <rect x={labelX - 32} y="225" width="64" height="22" fill="var(--color-ink)" />
        <text x={labelX} y="240" textAnchor="middle" fill="var(--color-paper)" fontSize="12" fontWeight="600">{COPY.now} {formatTime(timeline.simNow)}</text>
        {ticks.slice(1, -1).map((time) => <g key={time}><line x1={x(time)} y1="0" x2={x(time)} y2="235" stroke="var(--color-paper)" strokeWidth="1" /><text x={x(time)} y="251" textAnchor="middle" fontSize="11">{formatTime(time)}</text></g>)}
        {[0, 1, 2, 3, 4].map((level) => <g key={level} transform={`translate(80 ${yLevel(level as Level)})`}><text x="0" y="4" textAnchor="middle" fontSize="12" fontWeight="600">{level}</text><path d={level === 0 ? 'M10 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0' : level === 1 ? 'M15 -7c-2 4-5 7-5 10a5 5 0 0 0 10 0c0-3-3-6-5-10' : level === 2 ? 'm15 -7 6 12H9Z' : level === 3 ? 'M10 -5h10v10H10z' : 'm11 -6h8l4 4v5l-4 4h-8l-4-4v-5Z'} fill="currentColor" /></g>)}
        <text x={plotStart} y="251" textAnchor="start" fontSize="11">{formatTime(timeline.shiftStart)}</text><text x={plotStart + plotWidth} y="251" textAnchor="end" fontSize="11">{formatTime(timeline.shiftEnd)}</text>
      </svg>
    </div>
    {!!timeline.unscheduled.length && <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">{timeline.unscheduled.map((item) => {
      const task = tasks.get(item.taskId);
      const reason = item.reason === 'too-hot' ? COPY.tooHot : item.reason === 'ban-window' ? COPY.banWindow : item.reason === 'no-slot' ? COPY.noSlot : COPY.pastLatest;
      return <span key={item.taskId}><strong className="font-semibold text-ink">{task?.name}</strong> · {reason}</span>;
    })}</div>}
    <PlannerCompare timeline={timeline} />
  </section>;
}
