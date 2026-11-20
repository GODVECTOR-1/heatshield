// WBGT approximation (spec 02, WBGT): 0.7·Tnwb + 0.2·Tg + 0.1·Ta, Dimiceli (2011) globe, psychrometric wet bulb.
import climatologyJson from '../../data/climatology.json';
import type { Climatology, EpochMs, WbgtHour, WeatherHour } from '../types';
import { HOUR, toSiteTime } from './time';

const SIGMA = 5.67e-8;
const CLIMATOLOGY: Climatology = climatologyJson;

/** Stull (2011) wet bulb from air temperature (°C) and RH (%). */
export function stullWetBulb(ta: number, rh: number): number {
  return ta * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) + Math.atan(ta + rh) - Math.atan(rh - 1.676331)
    + 0.00391838 * rh ** 1.5 * Math.atan(0.023101 * rh) - 4.686035;
}

/** Dimiceli globe temperature. Ta in °C, u in m/s (converted to m/h here), irradiance in W/m². */
function globe(ta: number, rh: number, u: number, dni: number, diffuse: number): number {
  const ea = (rh / 100) * 6.112 * Math.exp((17.67 * ta) / (ta + 243.5)); // hPa
  const b = dni / (4 * SIGMA) + (1.2 * diffuse) / SIGMA + 0.575 * ea ** (1 / 7) * ta ** 4;
  const c = (0.315 * (u * 3600) ** 0.58) / 5.3865e-8;
  return (b + c * ta + 7.68e6) / (c + 2.56e5);
}

export function wbgtHour(row: WeatherHour): WbgtHour {
  const { t, ta, rh, u10, dni, diffuse } = row;
  if (![ta, rh, u10, dni, diffuse].every(Number.isFinite)) return { t, sun: null, shade: null };
  const tw = row.tw !== null && Number.isFinite(row.tw) ? row.tw : stullWetBulb(ta, rh);
  const u2 = Math.max(0.5, 0.75 * u10);
  const w = (tg: number) => 0.7 * tw + 0.2 * tg + 0.1 * ta;
  return { t, sun: w(globe(ta, rh, u2, dni, diffuse)), shade: w(globe(ta, rh, u2, 0, 0)) };
}

/**
 * WBGT (°C) for one minute: linear interpolation between hourly values, holding the first/last outside them.
 * Worst-case p95 climatology when the value is null/non-finite, or (Live) when the current hour has no row.
 */
export function wbgtAt(hours: WbgtHour[], ts: EpochMs, sun: boolean, live: boolean): { c: number; fallback: boolean } {
  const key = sun ? 'sun' : 'shade';
  let i = -1; // last row starting at or before ts (rows are sorted)
  while (i + 1 < hours.length && hours[i + 1].t <= ts) i++;
  if (live && hours[i] && ts - hours[i].t >= HOUR) i = -1; // Live: no row for this hour → climatology
  if (!live && i < 0 && hours.length > 0) i = 0; //            Replay holds the first value
  const a = hours[i]?.[key];
  if (a === undefined || a === null || !Number.isFinite(a)) {
    const st = toSiteTime(ts);
    return { c: CLIMATOLOGY[key][st.month - 1][st.hour], fallback: true };
  }
  const next = hours[i + 1];
  const b = next && next.t === hours[i].t + HOUR ? next[key] : null;
  const f = Math.min(1, Math.max(0, (ts - hours[i].t) / HOUR));
  return { c: b !== null && Number.isFinite(b) ? a + (b - a) * f : a, fallback: false };
}
