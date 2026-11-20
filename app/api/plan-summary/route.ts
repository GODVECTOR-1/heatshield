// GET with only ?mode=on|off: the server builds the anonymous facts itself,
// so nobody can push their own text through the Gemini key (spec 03). Text only: it never sets a level.
import { planFacts } from '@/lib/demo/summary';

const SYSTEM = [
  'You write for a construction site supervisor in Abu Dhabi.',
  'Summarise the shift plan below in 3 or 4 short, plain sentences.',
  'Use only the tasks, times and reasons given. Do not invent anything.',
  'Do not give medical advice and do not mention alert levels. No lists, no markdown.',
].join(' ');

// ponytail: one cached answer per mode per server instance; the demo plan never changes between requests.
const cache = new Map<string, Promise<string | null>>();

async function ask(key: string, model: string, facts: string[]): Promise<string | null> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: facts.join('\n') }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 700) : null;
}

export async function GET(req: Request) {
  const mode = new URL(req.url).searchParams.get('mode') === 'off' ? 'off' : 'on';
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  // 200 with no text: the box keeps its template summary, without an error in the console.
  if (!key || !model) return Response.json({ text: null, reason: 'not-configured' });
  let answer = cache.get(mode);
  if (!answer) {
    answer = ask(key, model, planFacts(mode)).catch(() => null);
    cache.set(mode, answer);
  }
  const text = await answer;
  if (!text) {
    cache.delete(mode);
    return Response.json({ text: null, reason: 'unavailable' });
  }
  return Response.json({ text });
}
