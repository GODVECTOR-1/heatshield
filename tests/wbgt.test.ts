// WBGT tolerance cases, hand-written before lib/engine/wbgt.ts exists (spec 10, Z17).
// Expected values: Dimiceli (2011) constants as in pywbgt/dimiceli.py, computed by
// docs/analysis/heat_check.py from real Open-Meteo archive rows (Abu Dhabi). Tolerance ±0.05 °C.
import { describe, expect, it } from 'vitest';
import { stullWetBulb, wbgtHour } from '../lib/engine/wbgt';
import type { WeatherHour } from '../lib/types';

const JUL15_1300: WeatherHour = { t: 1784106000000, ta: 43.6, rh: 25, u10: 2.17, dni: 691.7, diffuse: 232.7, tw: 27.1 };

const CASES: Array<[string, WeatherHour, number, number]> = [
  ['15 Jul 13:00, peak sun', JUL15_1300, 33.83, 32.05],
  ['15 Jul 06:00, sunrise (diffuse only)', { t: 1784080800000, ta: 33.7, rh: 59, u10: 5.13, dni: 0, diffuse: 18.8, tw: 27.2 }, 29.2, 29.15],
  ['15 Jul 02:00, night', { t: 1784066400000, ta: 32.6, rh: 81, u10: 2.1, dni: 0, diffuse: 0, tw: 29.7 }, 30.57, 30.57],
  ['7 Nov 12:00, Live-season noon', { t: 1794038400000, ta: 34.9, rh: 30, u10: 2.79, dni: 817.5, diffuse: 142.5, tw: 22.1 }, 27.22, 25.94],
  ['19 Apr 12:00, calm (u2 clamped to 0.5 m/s)', { t: 1776585600000, ta: 32, rh: 27, u10: 0.3, dni: 754.5, diffuse: 229, tw: 19.1 }, 26.59, 22.97],
];

describe('wbgtHour (Dimiceli globe, psychrometric wet bulb)', () => {
  it.each(CASES)('%s', (_label, row, sun, shade) => {
    const w = wbgtHour(row);
    expect(w.t).toBe(row.t);
    expect(w.sun).toBeCloseTo(sun, 1);
    expect(w.shade).toBeCloseTo(shade, 1);
  });

  it('sun is never below shade, and they match at night', () => {
    for (const [, row] of CASES) {
      const w = wbgtHour(row);
      expect(w.sun!).toBeGreaterThanOrEqual(w.shade!);
    }
    const night = wbgtHour(CASES[2][1]);
    expect(night.sun).toBeCloseTo(night.shade!, 6);
  });

  it('clamps u2 = 0.75·u10 to at least 0.5 m/s', () => {
    const calm = CASES[4][1];
    const atClamp = wbgtHour({ ...calm, u10: 0.5 / 0.75 }).sun!;
    expect(wbgtHour({ ...calm, u10: 0 }).sun).toBeCloseTo(atClamp, 6);
    expect(wbgtHour(calm).sun).toBeCloseTo(atClamp, 6);
  });

  it('falls back to Stull when the wet bulb is null or non-finite', () => {
    // 0.7 × (Stull 26.99 − Open-Meteo 27.1) shifts both values by −0.07.
    for (const tw of [null, Number.NaN]) {
      const w = wbgtHour({ ...JUL15_1300, tw });
      expect(w.sun).toBeCloseTo(33.75, 1);
      expect(w.shade).toBeCloseTo(31.98, 1);
    }
  });

  it.each(['ta', 'rh', 'u10', 'dni', 'diffuse'] as const)('a non-finite %s makes the hour missing (null)', (key) => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(wbgtHour({ ...JUL15_1300, [key]: bad })).toEqual({ t: JUL15_1300.t, sun: null, shade: null });
    }
  });
});

describe('stullWetBulb', () => {
  it("matches Stull (2011)'s worked example: 20 °C, 50 % → 13.7 °C", () => {
    expect(stullWetBulb(20, 50)).toBeCloseTo(13.7, 1);
  });

  it('stays within 0.3 °C of Open-Meteo wet_bulb_temperature_2m', () => {
    expect(Math.abs(stullWetBulb(43.6, 25) - 27.1)).toBeLessThan(0.3);
    expect(Math.abs(stullWetBulb(32.6, 81) - 29.7)).toBeLessThan(0.3);
  });
});
