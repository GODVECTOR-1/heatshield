// mocks/ holds one JSON per UI state, for v0 and component work (spec 10). This keeps them honest:
// every screen and tile variant is covered, and each file obeys the rules the UI relies on.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { BoardTileState, BoardView, CardView, WorkerViewState } from '../lib/types';

const load = <T>(dir: string, prefix = ''): Array<[string, T]> =>
  readdirSync(`mocks/${dir}`)
    .filter((f) => f.endsWith('.json') && f.startsWith(prefix))
    .map((f) => [f, JSON.parse(readFileSync(`mocks/${dir}/${f}`, 'utf8')) as T]);

const worker = load<WorkerViewState>('worker');
const tiles = load<BoardTileState>('board', 'tile-');
const views = load<BoardView>('board', 'view-');
const cards = worker.flatMap(([f, s]): Array<[string, CardView]> => (s.screen === 'card' ? [[f, s.card]] : []));

const SCREENS: Array<WorkerViewState['screen']> = [
  'no-session', 'language', 'consent', 'pick-crew', 'pick-name', 'confirm-name', 'check-in', 'start-shift',
  'countdown', 'card', 'after-shift', 'session-expired', 'device-mismatch',
];
const CARD_KEYS = [
  'level', 'phraseKey', 'mainAction', 'delivery', 'budgetFraction', 'reason', 'activity', 'activityLocked', 'canClearL4',
  'restCountdownEnd', 'banners', 'lateJoinAt', 'startedLower', 'medicTel', 'demo', 'tiers', 'offlineReady',
].sort();
const ACTION = ['none', 'none', 'in-shade', 'light-task', 'call'];
const SUP_ACTION = [null, null, 'allow-shade', 'move-to-light', 'send-buddy'];

describe('worker mocks', () => {
  it('cover all 13 screens', () => {
    expect([...new Set(worker.map(([, s]) => s.screen))].sort()).toEqual([...SCREENS].sort());
  });

  it('cover every level, delivery kind, reason chip and banner on the card', () => {
    const set = <T>(f: (c: CardView) => T | T[]) => [...new Set(cards.flatMap(([, c]) => f(c)))].sort();
    expect(set((c) => c.level)).toEqual([0, 1, 2, 3, 4]);
    expect(set((c) => c.delivery.kind)).toEqual(['not-shared', 'queued', 'sent']);
    expect(set((c) => c.reason ?? [])).toEqual(['after-unwell', 'dark-urine', 'hr-high', 'no-forecast', 'recovering', 'watch-lost']);
    expect(set((c) => c.banners)).toEqual(['low-battery', 'not-shared', 'offline-delete', 'replay']);
  });

  it.each(cards)('%s obeys the card rules', (_f, c) => {
    expect(Object.keys(c).sort()).toEqual(CARD_KEYS);
    expect(c.mainAction).toBe(ACTION[c.level]);
    expect(c.budgetFraction).toBeGreaterThanOrEqual(0);
    expect(c.budgetFraction).toBeLessThanOrEqual(1);
    expect(c.medicTel).toMatch(/^\+?\d{3,15}$/);
    if (c.level === 4) expect([c.activity, c.activityLocked]).toEqual(['rest', true]); // L4 forces Rest
    else expect(c.canClearL4).toBe(false);
    if (c.delivery.kind === 'not-shared') expect(c.banners).toContain('not-shared');
  });
});

describe('board mocks', () => {
  const all = [...tiles.map(([f, t]) => [f, t] as [string, BoardTileState]),
    ...views.flatMap(([f, v]) => [...v.needsYou, ...v.grid].map((t) => [f, t] as [string, BoardTileState]))];

  it('cover no-data, every level, ack state and badge, stale and SIM tiles', () => {
    const st = tiles.flatMap(([, t]) => (t.kind === 'status' ? [t] : []));
    expect(tiles.some(([, t]) => t.kind === 'no-data')).toBe(true);
    expect([...new Set(st.map((t) => t.level))].sort()).toEqual([0, 1, 2, 3, 4]);
    expect([...new Set(st.map((t) => t.ack))].sort()).toEqual(['acked', 'due', 'none', 'overdue']);
    expect([...new Set(st.map((t) => t.badge))].sort()).toEqual(['battery', 'overdue', 'stale', null].sort());
    expect(st.some((t) => t.stale) && st.some((t) => t.sim)).toBe(true);
  });

  it.each(all)('%s tile obeys the tile rules', (_f, t) => {
    if (t.kind === 'no-data') return expect(Object.keys(t).sort()).toEqual(['displayName', 'kind', 'workerId']);
    expect(t.action).toBe(SUP_ACTION[t.level]);
    expect(t.ack === 'due').toBe(t.ackDueAt !== null);
    // one badge, priority overdue > stale > battery
    expect(t.badge).toBe(t.ack === 'overdue' ? 'overdue' : t.stale ? 'stale' : t.lowBattery ? 'battery' : null);
  });

  it.each(views)('%s is a consistent board', (_f, v) => {
    expect(v.scenario === 'live' ? v.multiplier : 1).toBe(1); // Live is always 1×
    const names = v.grid.map((t) => t.displayName);
    expect(names).toEqual([...names].sort()); // the grid is sorted by name and never re-sorts
    if (v.scenario === 'live') expect(v.grid.some((t) => t.kind === 'status' && t.sim)).toBe(false); // SIM is Replay only
    for (const t of v.needsYou) expect(v.grid).toContainEqual(t);
  });
});
