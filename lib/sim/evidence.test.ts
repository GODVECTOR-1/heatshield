import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULTS } from '../engine/constants';
import type { EvidenceReport } from '../types';
import { buildReport, calibrate } from './evidence';

const EVIDENCE = 'public/evidence.json';
const published = existsSync(EVIDENCE) ? (JSON.parse(readFileSync(EVIDENCE, 'utf8')) as EvidenceReport) : null;

describe('simulator', () => {
  it('is deterministic for seeds 7 and 42 (reduced population), and B1 sensitivity stays below 100 %', () => {
    const cal = calibrate(20);
    expect(calibrate(20)).toEqual(cal);
    const report = buildReport(20, cal);
    expect(buildReport(20, cal)).toEqual(report);
    expect(report.b1.sensitivity).toBeLessThan(1);
  }, 60_000);

  it('lib/engine never imports lib/sim, and the truth model never imports engine physiology', () => {
    for (const f of readdirSync('lib/engine')) expect(readFileSync(`lib/engine/${f}`, 'utf8'), f).not.toMatch(/from ['"][^'"]*\bsim\b/);
    expect(readFileSync('lib/sim/truth.ts', 'utf8')).not.toMatch(/from ['"][^'"]*(engine|physiology|risk)/);
  });
});

describe.runIf(published)('public/evidence.json', () => {
  const r = published!;
  it('paramsHash matches the current DEFAULTS (re-run npm run sim after changing constants)', () => {
    expect(r.paramsHash).toBe(createHash('sha256').update(JSON.stringify(DEFAULTS)).digest('hex').slice(0, 12));
  });

  it('matches EvidenceReport', () => {
    expect(r).toMatchObject({ seed: 42, calibrationSeed: 7, days: 10, headline: { claimKey: 'evidence.claim' } });
    expect(r.weatherWindows).toEqual(['2026-05-25..2026-05-29', '2026-10-08..2026-10-12']);
    expect(r.limitations).toEqual(['evidence.limit.truthModel', 'evidence.limit.wbgtNotValidated', 'evidence.limit.simulatedWorkers', 'evidence.limit.twoWindows']);
    expect(r.fairness.map((g) => g.group)).toEqual(['age', 'acclimatised', 'fasting', 'ppe']);
    expect(r.robustness.map((p) => p.acclimEffect)).toEqual([0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
    for (const m of [r.engine, r.b1]) {
      expect(m.eventDays + m.nonEventDays).toBe(r.workers * r.days);
      for (const x of [m.sensitivity, m.falseAlarmRate]) expect(x >= 0 && x <= 1).toBe(true);
    }
    expect(typeof r.b1.thresholdC).toBe('number');
    expect(r.b1.sensitivity).toBeLessThan(1);
  });
});
