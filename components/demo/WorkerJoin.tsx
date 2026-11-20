'use client';

// /worker (spec 05, "No session"): scan prompt + typed code + 998 until the URL carries a crew code (#c=CODE).
// The code lives in the fragment, so it never reaches a server log.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import DemoClient from '@/components/demo/DemoClient';
import { makeT } from '@/components/worker/t';
import ar from '@/data/i18n/ar.json';
import en from '@/data/i18n/en.json';
import { CODE_RE, cleanCode } from '@/lib/client/link';

const tap = 'min-h-tap rounded-ui px-5 text-lg font-semibold shadow-press active:translate-y-[2px] active:shadow-none';

export default function WorkerJoin() {
  const [code, setCode] = useState<string | null | undefined>(undefined);
  const [bad, setBad] = useState(false);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  useEffect(() => {
    const read = () => {
      const c = cleanCode(new URLSearchParams(window.location.hash.slice(1)).get('c') ?? '');
      setCode(CODE_RE.test(c) ? c : null);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  if (code === undefined) return null;
  if (code) return <DemoClient key={code} layout="phone" code={code} />;

  const t = makeT(lang === 'ar' ? ar : en);
  return (
    <main lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 bg-paper p-6 text-ink">
      <div className="flex items-center justify-between">
        <Link href="/start" className="text-lg font-semibold">HeatShield</Link>
        <button type="button" onClick={() => setLang((v) => (v === 'en' ? 'ar' : 'en'))} className="min-h-11 rounded-ui border-2 border-ink px-3 text-base font-semibold">
          {lang === 'en' ? 'العربية' : 'English'}
        </button>
      </div>
      <h1 className="text-[32px] font-semibold leading-tight">{t('join.title')}</h1>
      <p className="text-xl">{t('join.scan')}</p>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const c = cleanCode(String(new FormData(e.currentTarget).get('code') ?? ''));
          setBad(!CODE_RE.test(c));
          if (CODE_RE.test(c)) window.location.hash = `c=${c}`;
        }}
      >
        <label htmlFor="code" className="text-base font-semibold">{t('join.typeCode')}</label>
        <div className="flex gap-2">
          <input
            id="code" name="code" required autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={8} dir="ltr"
            aria-invalid={bad} aria-describedby={bad ? 'code-bad' : undefined}
            className="min-h-tap min-w-0 flex-1 rounded-ui border-2 border-ink bg-paper px-3 font-mono text-xl uppercase tracking-[0.2em]"
          />
          <button type="submit" className={`${tap} bg-ink text-paper`}>{t('join.go')}</button>
        </div>
        {bad && <p id="code-bad" role="alert" className="text-base font-semibold">{t('join.bad')}</p>}
      </form>
      <a href="tel:998" className={`${tap} flex items-center bg-ink text-paper`}>{t('action.call998')}</a>
      <Link href="/demo" className="inline-flex min-h-11 items-center text-base font-semibold underline underline-offset-4">{t('join.demo')}</Link>
    </main>
  );
}
