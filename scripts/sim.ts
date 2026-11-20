// npm run sim: calibrate on seed 7, report seed 42, write public/evidence.json (spec 08).
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { DEFAULTS } from '../lib/engine/constants';
import { buildReport, calibrate } from '../lib/sim/evidence';
import type { EvidenceReport } from '../lib/types';

const t0 = performance.now();
const run = (workers: number) => {
  const cal = calibrate(workers);
  return { cal, report: buildReport(workers, cal) };
};
const thin = (r: ReturnType<typeof run>['report']) =>
  r.fairness.flatMap((g) => g.cells).filter((c) => c.insufficient).map((c) => `${c.group}/${c.value} (${c.events} events)`);

let out = run(200);
if (thin(out.report).length > 0) {
  console.log(`200 workers: cells under 30 events: ${thin(out.report).join(', ')}. Re-running with 2000.`);
  out = run(2000);
  if (thin(out.report).length > 0) console.log(`2000 workers: still under 30 events: ${thin(out.report).join(', ')}`);
}

const report: EvidenceReport = {
  paramsHash: createHash('sha256').update(JSON.stringify(DEFAULTS)).digest('hex').slice(0, 12),
  generatedAt: Date.now(),
  ...out.report,
};
writeFileSync('public/evidence.json', `${JSON.stringify(report, null, 2)}\n`);

const { cal } = out;
const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
console.log(`workers ${report.workers}, days ${report.days}; seed-7 truth prevalence ${pct(cal.prevalence)}`);
console.log(`B1 threshold (seed 7, Youden J): ${cal.thresholdC} °C`);
console.log(`k grid (seed 7, not applied; DEFAULTS.k = ${DEFAULTS.k}): ${cal.kGrid.map((g) => `${g.k}→J ${g.j}`).join(', ')}; picks ${cal.bestK}`);
console.log(`headline unacclimatised sensitivity: engine ${pct(report.headline.unacclimatisedEngineSensitivity)} vs B1 ${pct(report.headline.unacclimatisedB1Sensitivity)}`);
for (const [name, m] of [['engine', report.engine], ['B1', report.b1]] as const) {
  console.log(`${name}: sensitivity ${pct(m.sensitivity)}, false alarms ${pct(m.falseAlarmRate)}, lead ${m.leadTimeMedianMin} min, events ${m.eventDays}/${m.eventDays + m.nonEventDays}`);
}
for (const g of report.fairness) {
  console.log(`fairness ${g.group}: ${g.pass ? 'pass' : 'FAIL'} (sens gap ${g.sensitivityGapPp} pp, FA gap ${g.falseAlarmGapPp} pp) ${g.cells.map((c) => `${c.value} ${pct(c.engine.sensitivity)}/${pct(c.engine.falseAlarmRate)} n=${c.events}${c.insufficient ? ' insufficient' : ''}`).join('; ')}${g.fixNote ? ` | fix: ${g.fixNote}` : ''}`);
}
console.log(`robustness m: ${report.robustness.map((p) => `${p.acclimEffect}: ${pct(p.engineSensitivity)} vs ${pct(p.b1Sensitivity)}`).join(', ')}`);
console.log(`planner on ${JSON.stringify(report.planner.on)} off ${JSON.stringify(report.planner.off)}`);
console.log(`wrote public/evidence.json (paramsHash ${report.paramsHash}) in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
