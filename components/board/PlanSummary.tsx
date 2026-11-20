'use client';

// The plan in plain words (spec 03): the template summary right away, replaced by Gemini's when it answers.
import { useEffect, useMemo, useState } from 'react';
import { planSummary } from '@/lib/demo/summary';
import type { PlanMode } from '@/lib/demo/scenario';

const COPY = {
  title: "Today's plan in plain words",
  gemini: 'Written by Gemini from the anonymous plan (task names and times only). It never sets alert levels.',
  template: 'Built from the plan.',
};

export default function PlanSummary({ mode }: { mode: PlanMode }) {
  const fallback = useMemo(() => planSummary(mode), [mode]);
  const [ai, setAi] = useState<{ mode: PlanMode; text: string } | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/plan-summary?mode=${mode}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { text?: string } | null) => { if (live && j?.text) setAi({ mode, text: j.text }); })
      .catch(() => {});
    return () => { live = false; };
  }, [mode]);
  const fromAi = ai?.mode === mode;
  return (
    <section aria-label={COPY.title} className="border-t border-line py-3">
      <h2 className="text-lg font-semibold">{COPY.title}</h2>
      <p className="mt-1 max-w-4xl text-base">{fromAi ? ai.text : fallback}</p>
      <p className="mt-1 text-sm text-muted">{fromAi ? COPY.gemini : COPY.template}</p>
    </section>
  );
}
