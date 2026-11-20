import { describe, expect, it } from 'vitest';
import { CODE_RE, cleanCode, newCode, parseMsg } from './link';

describe('link messages', () => {
  it('keeps a good status and strips extra fields', () => {
    expect(parseMsg({ type: 'status', workerId: 'W-DEMO', level: 4, simTs: 1, lowBattery: false, name: 'Ravi', hr: 150 }))
      .toEqual({ type: 'status', workerId: 'W-DEMO', level: 4, simTs: 1, lowBattery: false });
  });
  it('drops bad levels, unknown workers and junk', () => {
    expect(parseMsg({ type: 'status', workerId: 'W-DEMO', level: 5, simTs: 1, lowBattery: false })).toBeNull();
    expect(parseMsg({ type: 'status', workerId: 'W-DEMO', level: 1.5, simTs: 1, lowBattery: false })).toBeNull();
    expect(parseMsg({ type: 'status', workerId: 'W-NOPE', level: 1, simTs: 1, lowBattery: false })).toBeNull();
    expect(parseMsg({ type: 'session', wallStart: Number.NaN, boardNow: 1 })).toBeNull();
    expect(parseMsg('hello')).toBeNull();
    expect(parseMsg(null)).toBeNull();
  });
  it('makes codes that pass its own check', () => {
    for (let i = 0; i < 50; i++) expect(newCode()).toMatch(CODE_RE);
    expect(cleanCode(' ab-c 23k ')).toBe('ABC23K');
  });
});
