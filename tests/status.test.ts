// applyStatus / applyAck cases, hand-written from docs/spec/03-api-and-storage.md before lib/status.ts exists.
import { describe, expect, it } from 'vitest';
import { applyAck, applyStatus } from '../lib/status';
import type { StatusInput, StatusPost, StatusRecord } from '../lib/types';

const MIN = 60_000;
const SIM_NOW = 1_784_100_000_000;
const NOW = 1_800_000_000_000; // server wall time
const ROSTER = ['W-7F3A', 'W-DEMO'];
const GOOD: StatusPost = { workerId: 'W-7F3A', level: 2, simTs: SIM_NOW, lowBattery: false };

const input = (body: unknown, over: Partial<StatusInput> = {}): StatusInput => ({
  bodyText: typeof body === 'string' ? body : JSON.stringify(body),
  roster: ROSTER,
  simNow: SIM_NOW,
  deviceKeyHash: 'dev-A',
  ...over,
});

const stored = (over: Partial<StatusRecord> = {}): StatusRecord => ({
  ...GOOD, receivedAt: NOW - 5 * MIN, levelSince: NOW - 9 * MIN, deviceKeyHash: 'dev-A', ...over,
});

describe('applyStatus: validation (400 bad-status-body, field named)', () => {
  const { lowBattery: _omit, ...noBattery } = GOOD;
  it.each<[string, unknown, string]>([
    ['level 5', { ...GOOD, level: 5 }, 'level'],
    ['level −1', { ...GOOD, level: -1 }, 'level'],
    ['level 2.5', { ...GOOD, level: 2.5 }, 'level'],
    ['level as a string', { ...GOOD, level: '2' }, 'level'],
    ['worker not in roster', { ...GOOD, workerId: 'W-NOPE' }, 'workerId'],
    ['simTs as a string', { ...GOOD, simTs: String(SIM_NOW) }, 'simTs'],
    ['simTs 1e400 (parses to Infinity)', '{"workerId":"W-7F3A","level":2,"simTs":1e400,"lowBattery":false}', 'simTs'],
    ['lowBattery as a string', { ...GOOD, lowBattery: 'false' }, 'lowBattery'],
    ['lowBattery missing', noBattery, 'lowBattery'],
    ['an extra key (nothing else may leave the phone)', { ...GOOD, unwell: true }, 'unwell'],
    ['not JSON', '{level:2', 'body'],
    ['JSON null', 'null', 'body'],
    ['a JSON array', '[1,2]', 'body'],
    ['over 1024 bytes (padding, still valid JSON)', JSON.stringify(GOOD) + ' '.repeat(1024), 'body'],
    ['over 1024 UTF-8 bytes but under 1024 chars', { ...GOOD, workerId: 'W-' + 'é'.repeat(520) }, 'body'],
  ])('%s', (_label, body, field) => {
    expect(applyStatus(null, input(body), NOW)).toEqual({ ok: false, status: 400, code: 'bad-status-body', field });
  });

  it('accepts a body of exactly 1024 bytes', () => {
    const text = JSON.stringify(GOOD);
    expect(applyStatus(null, input(text + ' '.repeat(1024 - text.length)), NOW).ok).toBe(true);
  });

  it('a bad body is a 400 even from the wrong device', () => {
    const out = applyStatus(stored(), input({ ...GOOD, level: 9 }, { deviceKeyHash: 'dev-B' }), NOW);
    expect(out).toMatchObject({ status: 400, field: 'level' });
  });
});

describe('applyStatus: storing', () => {
  it('first post stores the record and binds the device (trust on first use)', () => {
    expect(applyStatus(null, input(GOOD), NOW)).toEqual({
      ok: true, write: true,
      record: { ...GOOD, receivedAt: NOW, levelSince: NOW, deviceKeyHash: 'dev-A' },
    });
  });

  it('another device for the same worker gets 403 device-mismatch', () => {
    const out = applyStatus(stored(), input({ ...GOOD, simTs: SIM_NOW + MIN }, { deviceKeyHash: 'dev-B' }), NOW);
    expect(out).toEqual({ ok: false, status: 403, code: 'device-mismatch' });
  });

  it('simTs up to simNow + 2 sim-min is accepted, beyond is 409 simts-in-future', () => {
    expect(applyStatus(null, input({ ...GOOD, simTs: SIM_NOW + 2 * MIN }), NOW).ok).toBe(true);
    expect(applyStatus(null, input({ ...GOOD, simTs: SIM_NOW + 2 * MIN + 1 }), NOW))
      .toEqual({ ok: false, status: 409, code: 'simts-in-future' });
  });

  it('an older simTs is 409 status-superseded with the stored simTs', () => {
    expect(applyStatus(stored(), input({ ...GOOD, simTs: SIM_NOW - MIN }), NOW))
      .toEqual({ ok: false, status: 409, code: 'status-superseded', storedSimTs: SIM_NOW });
  });

  it('a retry (same simTs, same body) is 200 with nothing to write', () => {
    const prev = stored();
    expect(applyStatus(prev, input(GOOD), NOW)).toEqual({ ok: true, write: false, record: prev });
  });

  it('same simTs with a different body is stored: an L4 in the same minute is never dropped', () => {
    const out = applyStatus(stored(), input({ ...GOOD, level: 4 }), NOW);
    expect(out).toEqual({
      ok: true, write: true,
      record: { ...GOOD, level: 4, receivedAt: NOW, levelSince: NOW, deviceKeyHash: 'dev-A' },
    });
    const battery = applyStatus(stored(), input({ ...GOOD, lowBattery: true }), NOW);
    expect(battery).toMatchObject({ ok: true, write: true, record: { lowBattery: true } });
  });

  it('a newer simTs at the same level keeps levelSince', () => {
    const prev = stored();
    const out = applyStatus(prev, input({ ...GOOD, simTs: SIM_NOW + MIN, lowBattery: true }), NOW);
    expect(out).toEqual({
      ok: true, write: true,
      record: { ...GOOD, simTs: SIM_NOW + MIN, lowBattery: true, receivedAt: NOW, levelSince: prev.levelSince, deviceKeyHash: 'dev-A' },
    });
  });

  it('a level change moves levelSince to now', () => {
    const out = applyStatus(stored(), input({ ...GOOD, level: 1, simTs: SIM_NOW + MIN }), NOW);
    expect(out).toMatchObject({ ok: true, record: { level: 1, levelSince: NOW } });
  });
});

describe('applyAck', () => {
  it('404 no-status when the worker has no status', () => {
    expect(applyAck(null, { workerId: 'W-7F3A', level: 3 }, NOW)).toEqual({ ok: false, status: 404, code: 'no-status' });
  });

  it('409 ack-level-stale when the level rose since the board rendered (nothing written)', () => {
    expect(applyAck(stored({ level: 3 }), { workerId: 'W-7F3A', level: 2 }, NOW))
      .toEqual({ ok: false, status: 409, code: 'ack-level-stale', ackedLevel: 2, currentLevel: 3 });
  });

  it('acks at the current level, or above it if the level fell', () => {
    expect(applyAck(stored({ level: 3 }), { workerId: 'W-7F3A', level: 3 }, NOW)).toEqual({ ok: true, ack: { level: 3, ackTs: NOW } });
    expect(applyAck(stored({ level: 2 }), { workerId: 'W-7F3A', level: 3 }, NOW)).toEqual({ ok: true, ack: { level: 3, ackTs: NOW } });
  });

  it('a level rise after the ack un-acks automatically (board rule)', () => {
    const acked = (s: StatusRecord, a: { level: number; ackTs: number }) => a.level >= s.level && a.ackTs >= s.levelSince;
    const l3 = stored({ level: 3 });
    const ack = applyAck(l3, { workerId: 'W-7F3A', level: 3 }, NOW);
    if (!ack.ok) throw new Error('ack failed');
    expect(acked(l3, ack.ack)).toBe(true);

    const rise = applyStatus(l3, input({ ...GOOD, level: 4, simTs: SIM_NOW + MIN }), NOW + MIN);
    if (!rise.ok) throw new Error('rise rejected');
    expect(acked(rise.record, ack.ack)).toBe(false);
  });
});
