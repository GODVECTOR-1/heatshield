// Site time: Asia/Dubai, fixed UTC+4, no DST. The only place local time is derived (spec 02, Time).
import type { EpochMs, MinuteOfDay } from '../types';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const OFFSET = 4 * HOUR;

export interface SiteTime {
  /** "YYYY-MM-DD" */
  date: string;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minuteOfDay: MinuteOfDay;
  /** Epoch ms of site midnight that starts this site date. */
  midnight: EpochMs;
}

export function toSiteTime(ts: EpochMs): SiteTime {
  const shifted = ts + OFFSET;
  const d = new Date(shifted); // read with getUTC* only: the device zone never leaks in
  return {
    date: d.toISOString().slice(0, 10),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minuteOfDay: d.getUTCHours() * 60 + d.getUTCMinutes(),
    midnight: shifted - (((shifted % DAY) + DAY) % DAY) - OFFSET,
  };
}
