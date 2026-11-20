// Compile-time self-check for lib/types.ts (run: tsc --noEmit). Lines marked @ts-expect-error MUST fail to compile.
import type {
  SessionCreate, StatusPost, WorkerViewState, BoardTileState, EngineApi, Problem, ScheduleSlot,
} from './types';

const base = {
  crewId: 'c1', wallStart: 0, simStart: 0, shiftStart: 0, shiftEnd: 0, fastingSafe: false, demo: true,
  wbgt: [{ t: 0, sun: 31.2, shade: null }], forecastFetchedAt: null, schedule: [] as ScheduleSlot[], unscheduled: [],
};
export const replay: SessionCreate = { ...base, scenario: 'replay-2026-07-15', multiplier: 240 };
export const live: SessionCreate = { ...base, scenario: 'live', multiplier: 1 };
// @ts-expect-error Live sessions must run at 1×
export const badLive: SessionCreate = { ...base, scenario: 'live', multiplier: 240 };

export const post: StatusPost = { workerId: 'W-7F3A', level: 2, simTs: 1, lowBattery: false };
// @ts-expect-error nothing beyond the four keys may leave the phone
export const leaky: StatusPost = { workerId: 'W-7F3A', level: 2, simTs: 1, lowBattery: false, unwell: true };
// @ts-expect-error level is 0–4
export const badLevel: StatusPost = { workerId: 'W-7F3A', level: 5, simTs: 1, lowBattery: false };

export function render(s: WorkerViewState): string {
  switch (s.screen) {
    case 'card': return s.card.delivery.kind;
    case 'countdown': return String(s.startsAt);
    default: return s.screen;
  }
}
export function tile(t: BoardTileState): string { return t.kind === 'status' ? String(t.level) : t.displayName; }
export type _api = EngineApi;
export const p: Problem = { type: '/errors#status-superseded', title: 'Superseded', status: 409, code: 'status-superseded', detail: 'simTs older', fix: 'drop the queued item', storedSimTs: 5 };
