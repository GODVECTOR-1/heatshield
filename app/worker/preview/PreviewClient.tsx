'use client';

import { useEffect, useState } from 'react';
import WorkerCard from '@/components/worker/WorkerCard';
import { makeT } from '@/components/worker/t';
import en from '@/data/i18n/en.json';
import ar from '@/data/i18n/ar.json';
import type { CardView } from '@/lib/types';

const SIM_NOW = 1784095200000;
const noop = () => {};

export default function PreviewClient({ cards, initialName, initialLang }: { cards: Record<string, CardView>; initialName?: string; initialLang: 'en' | 'ar' }) {
  const names = Object.keys(cards);
  const [name, setName] = useState(initialName ?? names[0]);
  const [lang, setLang] = useState<'en' | 'ar'>(initialLang);
  const [playing, setPlaying] = useState(false);
  const sequence = ['l0', 'l1', 'l2', 'l2-resting', 'l3', 'l4-latched'];
  const t = makeT(lang === 'ar' ? ar : en);
  const card = cards[name];

  useEffect(() => {
    if (!playing) return;
    let index = 0;
    setName(sequence[index]);
    const timer = window.setInterval(() => {
      index = (index + 1) % sequence.length;
      setName(sequence[index]);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [playing]);

  const updateQuery = (key: string, value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState({}, '', url);
  };
  const readings = { wbgtC: 31.4, heartRate: name === 'reason-watch-lost' ? null : 112 };

  return <main className="min-h-dvh p-4">
    <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 pb-4">
      <label className="flex min-w-0 flex-1 items-center gap-2 font-semibold">Mock<select value={name} onChange={(event) => { setName(event.target.value); updateQuery('mock', event.target.value); }} className="min-h-tap min-w-0 flex-1 rounded-ui border-2 border-line bg-paper px-2">{names.map((mock) => <option key={mock} value={mock}>{mock}</option>)}</select></label>
      <div role="group" aria-label="Language" className="flex gap-1">{(['en', 'ar'] as const).map((language) => <button key={language} type="button" aria-pressed={lang === language} onClick={() => { setLang(language); updateQuery('lang', language); }} className={`min-h-tap min-w-16 rounded-ui border-2 px-3 font-semibold ${lang === language ? 'border-ink bg-ink text-paper' : 'border-line'}`}>{language.toUpperCase()}</button>)}</div>
      <button type="button" onClick={() => setPlaying((value) => !value)} className="min-h-tap rounded-ui border-2 border-ink px-3 font-semibold">{playing ? 'Stop level changes' : 'Play level changes'}</button>
    </div>
    <div className="mx-auto h-[640px] w-[360px] max-w-full overflow-hidden border-2 border-line">
      <WorkerCard card={card} readings={readings} t={t} dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} simNow={SIM_NOW} clockLabel="10:00" lateJoinLabel={card.lateJoinAt === null ? null : '08:40'} onMainAction={noop} onCall={noop} onActivity={noop} onUnwell={noop} onClearL4={noop} onOpenMenu={noop} />
    </div>
  </main>;
}
