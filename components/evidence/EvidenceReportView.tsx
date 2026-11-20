// Evidence report view, from v0 visual pass (chat x6HlVHgSygt). Server component: static HTML, no client JS.
import type { EpochMs, EvidenceReport, FairnessResult, MetricSet } from '@/lib/types';

const COPY = {
  title: 'HeatShield · Evidence',
  mock: 'MOCK DATA: layout only, these are not results.',
  claimEnd: 'when the shift is planned around the heat.',
  caveat: 'Simulated crews on real Abu Dhabi weather. The truth model is ours: this illustrates, it does not prove, and it does not validate the WBGT model itself.',
  fewer: 'fewer', more: 'more', and: 'and',
  truthFigure: 'Overheating events (core ≥ 38.5 °C)', alertFigure: 'Orange-or-worse alerts', workFigure: 'Tasks completed',
  withPlan: 'with the plan', without: 'without',
  closedLoop: 'Closed loop: workers follow the advice (rest at level 2, light task at level 3, stop at level 4).',
  warning: 'As a warning alone',
  noBetterThanChance: (fa: string, sens: string) => `Neither the engine nor a single WBGT threshold beats chance here. The engine is orange on ${fa} of worker-days with no event, so its ${sens} catch rate comes mostly from being on almost all the time. This test day has no planned breaks.`,
  scores: (e: string, b: string) => `Score (sensitivity minus false alarms): engine ${e}, B1 ${b}.`,
  flat: (lo: string, hi: string) => `Across the sweep the engine stays between ${lo} and ${hi}, so its catch rate does not depend on how much acclimatisation matters.`,
  sweepRange: (lo: string, hi: string) => `Across the sweep the engine's sensitivity ranges from ${lo} to ${hi}.`,
  engine: 'Engine',
  b1: 'B1',
  sensitivity: 'Sensitivity',
  falseAlarm: 'False-alarm rate',
  leadTime: 'Median lead time (minutes)',
  fairness: 'Fairness',
  groups: { age: 'Age', acclimatised: 'Acclimatised', fasting: 'Fasting', ppe: 'PPE' },
  insufficient: 'insufficient (n < 30)',
  robustness: 'Robustness sweep',
  acclimEffect: 'Acclimatisation effect',
  niosh: 'NIOSH assumption',
  planner: 'With the plan vs without it',
  tasksCompleted: 'Tasks completed',
  level2PlusEvents: 'Orange-or-worse alerts',
  truthEvents: 'Overheating events',
  on: 'Planner on',
  off: 'Planner off',
  limitations: 'Limitations',
  limits: {
    'evidence.limit.truthModel': 'The truth model is ours, not measured core temperature.',
    'evidence.limit.wbgtNotValidated': 'This does not validate the WBGT model itself.',
    'evidence.limit.simulatedWorkers': 'Simulated workers, not field data.',
    'evidence.limit.twoWindows': 'Two shoulder-season weeks of Abu Dhabi weather (May and October).',
  } as Record<string, string>,
  seed: 'Seed',
  calibration: 'Calibration seed',
  workers: 'Workers × days',
  weather: 'Weather windows',
  params: 'Parameters hash',
  generated: 'Generated',
  meanBand: 'Group mean ±10 percentage points',
  sensitivityAxis: 'Sensitivity (%)',
  rateAxis: 'Rate (%)',
  minutesAxis: 'Minutes',
  countAxis: 'Count',
  value: 'Value',
  groupMean: 'Group mean',
  pass: 'Within fairness limits',
  fail: 'Fairness gap exceeds limit',
};

const SERIES_A = 'var(--color-series-a)';
const SERIES_B = 'var(--color-series-b)';
const INK = 'var(--color-ink)';
const LINE = 'var(--color-line)';
const percent = (value: number) => `${Math.round(value * 100)} %`;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function ChartFrame({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return <figure className="min-w-0 border-t border-line pt-3">
    <h3 className="text-base font-semibold">{title}</h3>
    {children}
    <figcaption className="mt-2 text-sm text-muted">{summary}</figcaption>
  </figure>;
}

function SeriesKey() {
  return <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
    <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 bg-series-a" />{COPY.engine}</span>
    <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 bg-series-b" />{COPY.b1}</span>
  </div>;
}

function PairedBarChart({ title, engineValue, b1Value, max, unit, axis, summary }: {
  title: string; engineValue: number; b1Value: number; max: number; unit: 'percent' | 'minutes' | 'count'; axis: string; summary: string;
}) {
  const x0 = 112;
  const width = 204;
  const barWidth = (value: number) => Math.max(0, Math.min(max, value) / max * width);
  const display = (value: number) => unit === 'percent' ? percent(value) : unit === 'minutes' ? `${Math.round(value)} min` : Math.round(value).toLocaleString('en-US');
  const ticks = unit === 'percent' ? [0, 25, 50, 75, 100] : unit === 'minutes' ? [0, 15, 30, 45, 60] : [0, 25, 50, 75, 100];
  return <ChartFrame title={title} summary={`${summary} ${COPY.engine}: ${display(engineValue)}. ${COPY.b1}: ${display(b1Value)}.`}>
    <SeriesKey />
    <svg role="img" viewBox="0 0 360 126" className="mt-2 w-full" aria-label={`${title}. ${COPY.engine}: ${display(engineValue)}; ${COPY.b1}: ${display(b1Value)}.`}>
      <title>{title}</title>
      <desc>{`${COPY.engine} ${display(engineValue)} compared with ${COPY.b1} ${display(b1Value)}. Horizontal axis: ${axis}.`}</desc>
      {ticks.map((tick) => { const tx = x0 + (unit === 'percent' ? tick / 100 : tick / max) * width; return <g key={tick}>
        <line x1={tx} y1="12" x2={tx} y2="91" stroke={LINE} strokeWidth="1" />
        <text x={tx} y="109" textAnchor="middle" fill={INK} fontSize="11">{tick}</text>
      </g>; })}
      <text x="4" y="36" fill={INK} fontSize="12">{COPY.engine}</text>
      <text x="4" y="70" fill={INK} fontSize="12">{COPY.b1}</text>
      <rect x={x0} y="22" width={barWidth(engineValue)} height="18" fill={SERIES_A} />
      <rect x={x0} y="56" width={barWidth(b1Value)} height="18" fill={SERIES_B} />
      <text x={Math.min(350, x0 + barWidth(engineValue) + 5)} y="36" fill={INK} fontSize="12">{display(engineValue)}</text>
      <text x={Math.min(350, x0 + barWidth(b1Value) + 5)} y="70" fill={INK} fontSize="12">{display(b1Value)}</text>
      <text x="214" y="124" textAnchor="middle" fill={INK} fontSize="11">{axis}</text>
    </svg>
  </ChartFrame>;
}

function FairnessChart({ result }: { result: FairnessResult }) {
  const points = result.cells;
  const mean = points.length ? points.reduce((sum, cell) => sum + cell.engine.sensitivity, 0) / points.length : 0;
  const scaleX = (value: number) => 48 + clamp(value, 0, 1) * 280;
  const yStep = 30;
  const height = Math.max(126, points.length * yStep + 68);
  const bandLow = scaleX(mean - 0.1);
  const bandHigh = scaleX(mean + 0.1);
  const patternId = `fairness-hatch-${result.group}`;
  const meanLabel = `${Math.round(mean * 100)} %`;
  return <figure className={`min-w-0 border-t border-line pt-3 ${result.pass ? '' : 'border-s-4 border-s-l3 ps-3'}`}>
    <h3 className="text-base font-semibold">{COPY.groups[result.group]}</h3>
    <p className="text-sm text-muted">{COPY.meanBand} · {COPY.groupMean}: {meanLabel}</p>
    <svg role="img" viewBox={`0 0 360 ${height}`} className="mt-2 w-full" aria-label={`${COPY.groups[result.group]} sensitivity dot plot. Group mean ${meanLabel}; band plus or minus 10 percentage points.`}>
      <title>{`${COPY.groups[result.group]} sensitivity`}</title>
      <desc>{`${points.map((cell) => `${cell.value} ${percent(cell.engine.sensitivity)}${cell.insufficient ? `, ${COPY.insufficient}` : ''}`).join('; ')}. ${COPY.meanBand}.`}</desc>
      <defs><pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke={INK} strokeWidth="2" /></pattern></defs>
      <rect x={bandLow} y="10" width={Math.max(0, bandHigh - bandLow)} height={points.length * yStep + 4} fill={LINE} />
      <line x1={scaleX(mean)} y1="8" x2={scaleX(mean)} y2={points.length * yStep + 20} stroke={INK} strokeDasharray="4 3" />
      {points.map((cell, index) => {
        const y = 28 + index * yStep;
        const x = scaleX(cell.engine.sensitivity);
        return <g key={`${cell.group}-${cell.value}`}>
          {cell.insufficient && <rect x="0" y={y - 12} width="358" height="24" fill={`url(#${patternId})`} opacity="0.24" />}
          <text x="4" y={y + 4} fill={INK} fontSize="11">{cell.value}</text>
          <circle cx={x} cy={y} r="6" fill={cell.insufficient ? 'var(--color-paper)' : SERIES_A} stroke={INK} strokeWidth="1.5" />
          <text x={Math.min(x + 9, 322)} y={y + 4} fill={INK} fontSize="11">{percent(cell.engine.sensitivity)}</text>
          {cell.insufficient && <text x="4" y={y + 24} fill={INK} fontSize="10">{COPY.insufficient}</text>}
        </g>;
      })}
      {[0, 25, 50, 75, 100].map((tick) => <g key={tick}><line x1={scaleX(tick / 100)} y1={points.length * yStep + 22} x2={scaleX(tick / 100)} y2={points.length * yStep + 27} stroke={INK} /><text x={scaleX(tick / 100)} y={points.length * yStep + 42} textAnchor="middle" fill={INK} fontSize="10">{tick}</text></g>)}
      <text x="188" y={height - 4} textAnchor="middle" fill={INK} fontSize="10">{COPY.sensitivityAxis}</text>
    </svg>
    {!result.pass && <p className="mt-2 text-sm font-semibold text-l3">{result.fixNote}</p>}
    <figcaption className="sr-only">{result.pass ? COPY.pass : COPY.fail}</figcaption>
  </figure>;
}

function RobustnessChart({ report }: { report: EvidenceReport }) {
  const points = report.robustness;
  const x = (value: number) => 48 + clamp(value / 2, 0, 1) * 280;
  const y = (value: number) => 128 - clamp(value, 0, 1) * 100;
  const path = (key: 'engineSensitivity' | 'b1Sensitivity') => points.map((point, index) => `${index ? 'L' : 'M'} ${x(point.acclimEffect)} ${y(point[key])}`).join(' ');
  const nearest = points.reduce((best, point) => Math.abs(point.acclimEffect - 1) < Math.abs(best.acclimEffect - 1) ? point : best, points[0]);
  return <ChartFrame title={COPY.robustness} summary={`Sensitivity from 0 to 100 percent as the acclimatisation effect changes from 0 to 2. The vertical marker at 1.0 is the ${COPY.niosh.toLowerCase()}.`}>
    <SeriesKey />
    <svg role="img" viewBox="0 0 360 182" className="mt-2 w-full max-w-3xl" aria-label={`${COPY.robustness}: engine and B1 sensitivities across acclimatisation effect.`}>
      <title>{COPY.robustness}</title>
      <desc>{`${COPY.engine} and ${COPY.b1} sensitivity lines. ${COPY.niosh} at 1.0.`}</desc>
      {[0, 25, 50, 75, 100].map((tick) => <g key={tick}><line x1="48" y1={y(tick / 100)} x2="328" y2={y(tick / 100)} stroke={LINE} /><text x="40" y={y(tick / 100) + 4} textAnchor="end" fill={INK} fontSize="10">{tick}</text></g>)}
      {[0, 0.5, 1, 1.5, 2].map((tick) => <g key={tick}><line x1={x(tick)} y1="28" x2={x(tick)} y2="130" stroke={tick === 1 ? INK : LINE} strokeDasharray={tick === 1 ? '4 3' : undefined} /><text x={x(tick)} y="147" textAnchor="middle" fill={INK} fontSize="10">{tick.toFixed(tick % 1 ? 1 : 0)}</text></g>)}
      <path d={path('engineSensitivity')} fill="none" stroke={SERIES_A} strokeWidth="3" />
      <path d={path('b1Sensitivity')} fill="none" stroke={SERIES_B} strokeWidth="3" />
      {points.map((point) => <g key={point.acclimEffect}><circle cx={x(point.acclimEffect)} cy={y(point.engineSensitivity)} r="3" fill={SERIES_A} /><circle cx={x(point.acclimEffect)} cy={y(point.b1Sensitivity)} r="3" fill={SERIES_B} /></g>)}
      <text x={x(1) + 4} y="20" fill={INK} fontSize="10">{COPY.niosh}</text>
      <text x="188" y="169" textAnchor="middle" fill={INK} fontSize="10">{COPY.acclimEffect}</text>
      <text x="8" y="79" transform="rotate(-90 8 79)" textAnchor="middle" fill={INK} fontSize="10">{COPY.sensitivityAxis}</text>
      <text x={x(1)} y={y(nearest.engineSensitivity) - 8} textAnchor="middle" fill={INK} fontSize="10">{percent(nearest.engineSensitivity)}</text>
      <text x={x(1)} y={y(nearest.b1Sensitivity) + 14} textAnchor="middle" fill={INK} fontSize="10">{percent(nearest.b1Sensitivity)}</text>
    </svg>
  </ChartFrame>;
}

function PlannerCharts({ report }: { report: EvidenceReport }) {
  const metrics: Array<{ key: keyof MetricSet | 'tasksCompleted' | 'level2PlusEvents' | 'truthEvents'; label: string; on: number; off: number }> = [
    { key: 'tasksCompleted', label: COPY.tasksCompleted, on: report.planner.on.tasksCompleted, off: report.planner.off.tasksCompleted },
    { key: 'level2PlusEvents', label: COPY.level2PlusEvents, on: report.planner.on.level2PlusEvents, off: report.planner.off.level2PlusEvents },
    { key: 'truthEvents', label: COPY.truthEvents, on: report.planner.on.truthEvents, off: report.planner.off.truthEvents },
  ];
  return <div className="grid grid-cols-1 gap-x-8 md:grid-cols-3">
    {metrics.map((metric) => {
      const max = Math.max(1, metric.on, metric.off);
      const scale = (value: number) => 176 * value / max;
      return <ChartFrame key={metric.key} title={metric.label} summary={`${COPY.on}: ${metric.on.toLocaleString('en-US')}. ${COPY.off}: ${metric.off.toLocaleString('en-US')}. ${COPY.countAxis}.`}>
        <div className="flex gap-4 text-xs"><span className="text-series-a">{COPY.on}</span><span className="text-series-b">{COPY.off}</span></div>
        <svg role="img" viewBox="0 0 320 118" className="mt-2 w-full" aria-label={`${metric.label}. ${COPY.on}: ${metric.on}; ${COPY.off}: ${metric.off}.`}>
          <title>{metric.label}</title><desc>{`${COPY.on} ${metric.on}; ${COPY.off} ${metric.off}. Horizontal axis: ${COPY.countAxis}.`}</desc>
          {[0, 0.5, 1].map((ratio) => <g key={ratio}><line x1={102 + 176 * ratio} y1="10" x2={102 + 176 * ratio} y2="86" stroke={LINE} /><text x={102 + 176 * ratio} y="103" textAnchor="middle" fill={INK} fontSize="10">{Math.round(max * ratio)}</text></g>)}
          <text x="2" y="32" fill={INK} fontSize="11">{COPY.on}</text><text x="2" y="64" fill={INK} fontSize="11">{COPY.off}</text>
          <rect x="102" y="18" width={scale(metric.on)} height="18" fill={SERIES_A} /><rect x="102" y="50" width={scale(metric.off)} height="18" fill={SERIES_B} />
          <text x={Math.min(306, 106 + scale(metric.on))} y="32" fill={INK} fontSize="11">{metric.on.toLocaleString('en-US')}</text><text x={Math.min(306, 106 + scale(metric.off))} y="64" fill={INK} fontSize="11">{metric.off.toLocaleString('en-US')}</text>
          <text x="190" y="117" textAnchor="middle" fill={INK} fontSize="10">{COPY.countAxis}</text>
        </svg>
      </ChartFrame>;
    })}
  </div>;
}

export default function EvidenceReportView({ report, formatDate }: { report: EvidenceReport; formatDate: (ms: EpochMs) => string }) {
  const limits = report.limitations.map((key) => COPY.limits[key] ?? key);
  const { on, off } = report.planner;
  const change = (a: number, b: number) => (b === 0 ? 0 : (a - b) / b);
  const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v * 100))} %`;
  const amount = (v: number, noun: string) => `${Math.abs(Math.round(v * 100))} % ${v <= 0 ? COPY.fewer : COPY.more} ${noun}`;
  const figures = [
    { label: COPY.truthFigure, on: on.truthEvents, off: off.truthEvents, change: change(on.truthEvents, off.truthEvents) },
    { label: COPY.alertFigure, on: on.level2PlusEvents, off: off.level2PlusEvents, change: change(on.level2PlusEvents, off.level2PlusEvents) },
    { label: COPY.workFigure, on: on.tasksCompleted, off: off.tasksCompleted, change: change(on.tasksCompleted, off.tasksCompleted) },
  ];
  const claim = `${amount(figures[0].change, 'overheating events')} ${COPY.and} ${amount(figures[2].change, 'work done')} ${COPY.claimEnd}`;
  const j = (m: { sensitivity: number; falseAlarmRate: number }) => m.sensitivity - m.falseAlarmRate;
  const verdict = Math.max(j(report.engine), j(report.b1)) <= 0
    ? COPY.noBetterThanChance(percent(report.engine.falseAlarmRate), percent(report.engine.sensitivity))
    : COPY.scores(j(report.engine).toFixed(2), j(report.b1).toFixed(2));
  const sens = report.robustness.map((r) => r.engineSensitivity);
  const [lo, hi] = [Math.min(...sens), Math.max(...sens)];
  const sweep = sens.length === 0 ? '' : hi - lo < 0.1 ? COPY.flat(percent(lo), percent(hi)) : COPY.sweepRange(percent(lo), percent(hi));
  return <main className="min-h-dvh bg-paper text-ink">
    {report.paramsHash === 'MOCK' && <div role="alert" className="w-full bg-ink px-5 py-4 text-center text-lg font-semibold text-paper sm:text-xl">{COPY.mock}</div>}
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 lg:px-12">
      <header className="border-b border-line pb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.12em]">{COPY.title}</p>
        <h1 className="mt-4 max-w-5xl text-3xl font-semibold leading-tight sm:text-5xl">{claim}</h1>
        <p className="mt-3 max-w-3xl text-base">{COPY.caveat}</p>
        <dl className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {figures.map((f) => <div key={f.label} className="border-t-4 border-series-a pt-3">
            <dt className="text-base font-semibold">{f.label}</dt>
            <dd className="mt-1 text-5xl font-semibold tabular-nums text-series-a sm:text-6xl">{signed(f.change)}</dd>
            <dd className="mt-1 text-sm tabular-nums text-muted">{f.on.toLocaleString('en-US')} {COPY.withPlan} · {f.off.toLocaleString('en-US')} {COPY.without}</dd>
          </div>)}
        </dl>
      </header>

      <section aria-labelledby="planner-title" className="py-6">
        <h2 id="planner-title" className="mb-1 text-2xl font-semibold">{COPY.planner}</h2>
        <p className="mb-3 text-sm text-muted">{COPY.closedLoop}</p>
        <PlannerCharts report={report} />
      </section>

      <section aria-labelledby="comparison-title" className="py-6">
        <h2 id="comparison-title" className="mb-1 text-2xl font-semibold">{COPY.warning}</h2>
        <p className="mb-3 max-w-4xl text-base">{verdict}</p>
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-3">
          <PairedBarChart title={COPY.sensitivity} engineValue={report.engine.sensitivity} b1Value={report.b1.sensitivity} max={1} unit="percent" axis={COPY.sensitivityAxis} summary={`${COPY.engine} and B1 sensitivity.`} />
          <PairedBarChart title={COPY.falseAlarm} engineValue={report.engine.falseAlarmRate} b1Value={report.b1.falseAlarmRate} max={1} unit="percent" axis={COPY.rateAxis} summary={`${COPY.engine} and B1 false-alarm rates.`} />
          <PairedBarChart title={COPY.leadTime} engineValue={report.engine.leadTimeMedianMin} b1Value={report.b1.leadTimeMedianMin} max={60} unit="minutes" axis={COPY.minutesAxis} summary={`${COPY.engine} and B1 median lead times.`} />
        </div>
        <p className="mt-4 border-s-4 border-line ps-3 text-sm">B1 = one WBGT threshold ({report.b1.thresholdC} °C), tuned on the same calibration seed.</p>
      </section>

      <section aria-labelledby="fairness-title" className="py-5">
        <h2 id="fairness-title" className="mb-3 text-2xl font-semibold">{COPY.fairness}</h2>
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">{report.fairness.map((result) => <FairnessChart key={result.group} result={result} />)}</div>
      </section>

      <section aria-labelledby="robustness-title" className="py-5">
        <h2 id="robustness-title" className="mb-3 text-2xl font-semibold">{COPY.robustness}</h2>
        <p className="mb-2 max-w-4xl text-base">{sweep}</p>
        <RobustnessChart report={report} />
      </section>

      <section aria-labelledby="limitations-title" className="border-t border-line py-5">
        <h2 id="limitations-title" className="mb-2 text-2xl font-semibold">{COPY.limitations}</h2>
        <ul className="list-disc space-y-1 ps-6">{limits.map((limit) => <li key={limit}>{limit}</li>)}</ul>
      </section>

      <footer className="border-t border-line pt-4 text-sm">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="font-semibold">{COPY.seed}</dt><dd className="tabular-nums">{report.seed}</dd></div>
          <div><dt className="font-semibold">{COPY.calibration}</dt><dd className="tabular-nums">{report.calibrationSeed}</dd></div>
          <div><dt className="font-semibold">{COPY.workers}</dt><dd className="tabular-nums">{report.workers} × {report.days}</dd></div>
          <div className="sm:col-span-2"><dt className="font-semibold">{COPY.weather}</dt><dd>{report.weatherWindows.join(' · ')}</dd></div>
          <div><dt className="font-semibold">{COPY.params}</dt><dd className="break-all">{report.paramsHash}</dd></div>
          <div><dt className="font-semibold">{COPY.generated}</dt><dd>{formatDate(report.generatedAt)}</dd></div>
        </dl>
      </footer>
    </div>
  </main>;
}
