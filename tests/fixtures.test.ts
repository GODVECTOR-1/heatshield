// Bundled weather fixtures (spec 10: "a test checks the bundled fixtures contain zero nulls").
// Regenerate with docs/analysis/make_fixtures.py; never hand-edit the JSON.
import { describe, expect, it } from 'vitest';
import climatologyJson from '../data/climatology.json';
import may from '../data/fixtures/2026-05-25_to_29.json';
import jul from '../data/fixtures/2026-07-13_to_18.json';
import oct from '../data/fixtures/2026-10-08_to_12.json';
import nov from '../data/fixtures/2026-11-07.json';
import type { Climatology, WeatherHour } from '../lib/types';

const H = 3_600_000;
const siteMidnight = (day: string) => Date.parse(`${day}T00:00:00+04:00`);
const KEYS = ['t', 'ta', 'rh', 'u10', 'dni', 'diffuse', 'tw'];

const FIXTURES: Array<[string, WeatherHour[], string, number]> = [
  ['Replay 13–18 Jul', jul, '2026-07-13', 6],
  ['evidence 25–29 May', may, '2026-05-25', 5],
  ['evidence 8–12 Oct', oct, '2026-10-08', 5],
  ['E1 November live, 7 Nov', nov, '2026-11-07', 1],
];

describe.each(FIXTURES)('fixture: %s', (_name, rows, firstDay, days) => {
  it('is whole site-time days of contiguous hours', () => {
    expect(rows).toHaveLength(24 * days);
    rows.forEach((r, i) => expect(r.t).toBe(siteMidnight(firstDay) + i * H));
  });

  it('has zero nulls: every field is a finite number', () => {
    for (const r of rows) {
      expect(Object.keys(r).sort()).toEqual([...KEYS].sort());
      for (const k of KEYS) expect(Number.isFinite(r[k as keyof WeatherHour] as number), `${k} at ${r.t}`).toBe(true);
    }
  });

  it('is physically plausible', () => {
    for (const r of rows) {
      expect(r.ta).toBeGreaterThan(5);
      expect(r.ta).toBeLessThan(55);
      expect(r.rh).toBeGreaterThanOrEqual(0);
      expect(r.rh).toBeLessThanOrEqual(100);
      expect(Math.min(r.u10, r.dni, r.diffuse)).toBeGreaterThanOrEqual(0);
      expect(r.tw!).toBeLessThanOrEqual(r.ta + 0.05);
    }
  });
});

describe('the hand-written test inputs come from the fixtures', () => {
  it.each<[WeatherHour[], WeatherHour]>([
    [jul, { t: 1784106000000, ta: 43.6, rh: 25, u10: 2.17, dni: 691.7, diffuse: 232.7, tw: 27.1 }], // wbgt.test 15 Jul 13:00
    [nov, { t: 1794038400000, ta: 34.9, rh: 30, u10: 2.79, dni: 817.5, diffuse: 142.5, tw: 22.1 }], // wbgt.test 7 Nov 12:00
  ])('row at %#', (rows, row) => {
    expect(rows.find((r) => r.t === row.t)).toEqual(row);
  });
});

describe('climatology (12 months × 24 site hours, p95 WBGT)', () => {
  const c: Climatology = climatologyJson;
  it('is a complete 12 × 24 grid of finite values for sun and shade', () => {
    for (const grid of [c.sun, c.shade]) {
      expect(grid).toHaveLength(12);
      for (const month of grid) {
        expect(month).toHaveLength(24);
        for (const v of month) expect(Number.isFinite(v) && v > 10 && v < 40).toBe(true);
      }
    }
  });

  it('sun is never below shade, and July noon is hotter than January noon', () => {
    c.sun.forEach((month, m) => month.forEach((v, h) => expect(v).toBeGreaterThanOrEqual(c.shade[m][h])));
    expect(c.sun[6][12]).toBeGreaterThan(c.sun[0][12] + 8);
  });
});
