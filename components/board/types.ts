import type { ReactNode } from 'react';
import type { BoardView, EpochMs, Level, PlannerMetric, ScheduleSlot, Task, Unscheduled, WbgtHour, WorkerId } from '@/lib/types';

export interface TimelineData {
  simNow: EpochMs;
  shiftStart: EpochMs;
  shiftEnd: EpochMs;
  banStart: EpochMs;
  banEnd: EpochMs;
  forecastFetchedAt: EpochMs | null;
  wbgt: WbgtHour[];
  tasks: Task[];
  schedule: ScheduleSlot[];
  unscheduled: Unscheduled[];
  predicted: { t: EpochMs; level: Level }[];
  plannerCompare: { on: PlannerMetric; off: PlannerMetric };
}

export interface BoardProps {
  view: BoardView;
  timeline: TimelineData;
  crewName: string;
  clockLabel: string;
  formatTime: (ms: EpochMs) => string;
  wallNow: EpochMs;
  qr: ReactNode | null;
  onAck: (workerId: WorkerId, level: Level) => void;
  /** Shown under the heat timeline: the plain-words plan summary. */
  summary?: ReactNode;
}
