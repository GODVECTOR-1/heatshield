import { describe, expect, it } from 'vitest';
import type { ScheduleSlot } from '../types';
import { ACK_WINDOW_MS, CREW, SHIFT_START, timelineFor, toTile, withLightTap } from './scenario';

const MIN = 60_000;

describe('demo scenario', () => {
  it('a Light tap rewrites only the task time inside the 15-min hold', () => {
    const slots: ScheduleSlot[] = [
      { kind: 'task', start: 0, end: 30 * MIN, taskId: 'a', activity: 'heavy', sun: true },
      { kind: 'rest', start: 30 * MIN, end: 45 * MIN, reason: 'planned' },
    ];
    expect(withLightTap(slots, 10 * MIN)).toEqual([
      { kind: 'task', start: 0, end: 10 * MIN, taskId: 'a', activity: 'heavy', sun: true },
      { kind: 'task', start: 10 * MIN, end: 25 * MIN, taskId: 'a', activity: 'light', sun: true },
      { kind: 'task', start: 25 * MIN, end: 30 * MIN, taskId: 'a', activity: 'heavy', sun: true },
      slots[1],
    ]);
    expect(withLightTap(slots, null)).toBe(slots);
  });

  it('tile ack: due inside the window, overdue after it at L3+, acked once help is sent for that level', () => {
    const s = { level: 3 as const, levelSinceWall: 1000, lastSeenWall: 1000, lowBattery: false };
    expect(toTile(CREW[0], s, null, 1000).ack).toBe('due');
    expect(toTile(CREW[0], s, null, 1000 + ACK_WINDOW_MS).ack).toBe('overdue');
    expect(toTile(CREW[0], { ...s, level: 2 }, null, 1000 + ACK_WINDOW_MS).ack).toBe('none');
    expect(toTile(CREW[0], s, { level: 3, wall: 1500 }, 9e9).ack).toBe('acked');
    expect(toTile(CREW[0], s, { level: 2, wall: 1500 }, 9e9).ack).toBe('overdue');
  });

  it('on 15 Jul the planner gives the vulnerable profile fewer level-2+ alerts than planner off', () => {
    const t = timelineFor('on');
    expect(t.predicted[0].t).toBe(SHIFT_START);
    expect(t.plannerCompare.on.level2PlusEvents).toBeLessThan(t.plannerCompare.off.level2PlusEvents);
  });
});
