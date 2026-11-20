// Dev-only gallery: every mocks/worker/card-*.json through WorkerCard, in en and ar.
import { readdirSync, readFileSync } from 'node:fs';
import type { CardView } from '@/lib/types';
import PreviewClient from './PreviewClient';

// Direct links: /worker/preview?mock=l4-latched&lang=ar
export default async function WorkerPreviewPage({ searchParams }: { searchParams: Promise<{ mock?: string; lang?: string }> }) {
  const cards: Record<string, CardView> = {};
  for (const f of readdirSync('mocks/worker').filter((n) => n.startsWith('card-')).sort()) {
    cards[f.replace(/^card-|\.json$/g, '')] = JSON.parse(readFileSync(`mocks/worker/${f}`, 'utf8')).card;
  }
  const { mock, lang } = await searchParams;
  return <PreviewClient cards={cards} initialName={mock && mock in cards ? mock : undefined} initialLang={lang === 'ar' ? 'ar' : 'en'} />;
}
