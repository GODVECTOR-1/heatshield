'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import WorkerCard from '@/components/worker/WorkerCard';
import type { WorkerCardProps } from '@/components/worker/WorkerCard';
import type { CardView, Level } from '@/lib/types';
import en from '@/data/i18n/en.json';
import { makeT } from '@/components/worker/t';
import l0 from '@/mocks/worker/card-l0.json';
import l1 from '@/mocks/worker/card-l1.json';
import l2 from '@/mocks/worker/card-l2.json';
import l2Resting from '@/mocks/worker/card-l2-resting.json';
import l3 from '@/mocks/worker/card-l3.json';
import l4 from '@/mocks/worker/card-l4-latched.json';

const cards = [l0.card, l1.card, l2.card, l2Resting.card, l3.card, l4.card] as CardView[];
const levels: Level[] = [0, 1, 2, 2, 3, 4];
const clocks = ['07:00', '08:24', '09:48', '11:12', '12:36', '14:00'];
const colors = ['bg-l0', 'bg-l1', 'bg-l2', 'bg-l3', 'bg-l4'];
const noop = () => {};
const t = makeT(en);

export default function Landing({ demoHref, evidenceHref }: { demoHref: string; evidenceHref: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) {
      setStep(2);
      return;
    }
    const timer = window.setInterval(() => setStep((current) => (current + 1) % cards.length), 2500);
    const onPreferenceChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        window.clearInterval(timer);
        setStep(2);
      }
    };
    preference.addEventListener('change', onPreferenceChange);
    return () => {
      window.clearInterval(timer);
      preference.removeEventListener('change', onPreferenceChange);
    };
  }, []);

  const current = cards[step];
  const cardProps: WorkerCardProps = {
    card: current, t, dir: 'ltr', lang: 'en', simNow: 1784095200000, clockLabel: clocks[step], lateJoinLabel: null,
    readings: { wbgtC: 31.4, heartRate: 112 }, onMainAction: noop, onCall: noop, onActivity: noop,
    onUnwell: noop, onClearL4: noop, onOpenMenu: noop,
  };

  return <main className="relative isolate min-h-dvh overflow-hidden bg-paper text-ink">
    <div key={`desktop-${step}`} aria-hidden="true" className={`pointer-events-none absolute inset-y-0 end-0 hidden w-[38%] md:block ${colors[levels[step]]} animate-level-sweep`} />
    <div key={`mobile-${step}`} aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-0 h-[42%] md:hidden ${colors[levels[step]]} animate-level-sweep`} />
    <div className="relative mx-auto flex min-h-dvh max-w-[1440px] flex-col px-6 py-5 sm:px-10 md:px-14 md:py-6">
      <div className="grid flex-1 items-center gap-5 md:grid-cols-[1fr_0.9fr] md:gap-10">
        <section className="max-w-[620px] py-4 md:py-0">
          <p className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">HeatShield</p>
          <h1 className="mt-6 max-w-[590px] text-[clamp(2rem,4vw,3.6rem)] font-semibold leading-[1.08] tracking-[-0.045em]">A returning worker is a new worker. HeatShield plans the shift around them.</h1>
          <div className="mt-7 flex flex-col items-start gap-4">
            <div className="flex flex-wrap gap-3">
              <Link href={demoHref} className="flex min-h-tap items-center rounded-ui bg-ink px-6 text-lg font-semibold text-paper shadow-press active:translate-y-[2px] active:shadow-none">Run the 15 July demo</Link>
              <Link href="/start" className="flex min-h-tap items-center rounded-ui border-2 border-ink bg-paper px-6 text-lg font-semibold text-ink shadow-press active:translate-y-[2px] active:shadow-none">Supervisor or worker? Start here</Link>
            </div>
            <p className="text-base text-muted">Demo: real Abu Dhabi weather · 15 Jul 2026 · 240× speed · no phone needed. Start here: the crew QR, with a real phone.</p>
            <Link href={evidenceHref} className="inline-flex min-h-11 items-center text-base font-semibold underline underline-offset-4">See the evidence</Link>
          </div>
        </section>
        <section aria-label="Live worker card preview" className="flex min-h-[520px] items-center justify-center md:min-h-0">
          <div className="flex h-[492px] w-[280px] items-center justify-center overflow-hidden rounded-[44px] bg-ink p-2 shadow-lift md:h-[504px] md:w-[292px]">
            <div className="h-[640px] w-[360px] shrink-0 overflow-hidden rounded-[36px] bg-paper" style={{ zoom: 0.72 }}>
              <WorkerCard {...cardProps} />
            </div>
          </div>
        </section>
      </div>
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-3 text-sm md:text-base">
        <p>Weather data by <a href="https://open-meteo.com" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">Open-Meteo.com</a> (CC BY 4.0)</p>
        <Link href={evidenceHref} className="font-semibold underline underline-offset-4">See the evidence</Link>
      </footer>
    </div>
  </main>;
}
