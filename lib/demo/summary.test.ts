import { describe, expect, it } from 'vitest';
import { CREW } from './scenario';
import { planFacts, planSummary } from './summary';

describe('plan summary', () => {
  it('never puts a worker name, id or profile in what Gemini sees', () => {
    for (const mode of ['on', 'off'] as const) {
      const text = planFacts(mode).join('\n') + planSummary(mode);
      for (const c of CREW) {
        expect(text).not.toContain(c.displayName);
        expect(text).not.toContain(c.profile.workerId);
      }
      expect(text).not.toMatch(/age|acclim|urine|heart/i);
    }
  });
  it('says what the planner left out and the ban', () => {
    expect(planSummary('on')).toContain('Left out today: Tie rebar mats (too hot all day)');
    expect(planSummary('on')).toContain('12:30–15:00');
    expect(planSummary('off')).toContain('Every task fits in the shift.');
    expect(planSummary('off')).toContain('No planned rest breaks');
  });
});
