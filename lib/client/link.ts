// Phone ↔ board link for the QR join (spec 04, "QR join (as built)"). Supabase Realtime broadcast when the
// keys are set (phones over the internet, nothing stored); otherwise BroadcastChannel (tabs in one browser).
import { createClient } from '@supabase/supabase-js';
import { CREW } from '../demo/scenario';
import type { Level } from '../types';

export type LinkMsg =
  | { type: 'hello' }
  | { type: 'session'; wallStart: number; boardNow: number; endSim: number | null }
  | { type: 'status'; workerId: string; level: Level; simTs: number; lowBattery: boolean };

export interface Link {
  kind: 'internet' | 'this-browser';
  send: (m: LinkMsg) => Promise<boolean>;
  close: () => void;
}

/** The phone re-sends its status this often; the board marks it stale after 2 missed beats. */
export const HEARTBEAT_MS = 5000;
export const STALE_MS = 2.5 * HEARTBEAT_MS;

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I, L, O, 0, 1
export const CODE_RE = /^[A-HJKMNP-Z2-9]{6}$/;
export const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ALPHABET[b % ALPHABET.length]).join('');
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

const IDS = new Set(CREW.map((c) => c.profile.workerId));
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Anyone holding the crew code can send, so anything malformed is dropped and extra fields never pass through. */
export function parseMsg(raw: unknown): LinkMsg | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.type === 'hello') return { type: 'hello' };
  if (o.type === 'session' && num(o.wallStart) && num(o.boardNow)) {
    return { type: 'session', wallStart: o.wallStart, boardNow: o.boardNow, endSim: num(o.endSim) ? o.endSim : null };
  }
  if (o.type === 'status' && typeof o.workerId === 'string' && IDS.has(o.workerId) && Number.isInteger(o.level)
    && (o.level as number) >= 0 && (o.level as number) <= 4 && num(o.simTs) && typeof o.lowBattery === 'boolean') {
    return { type: 'status', workerId: o.workerId, level: o.level as Level, simTs: o.simTs, lowBattery: o.lowBattery };
  }
  return null;
}

export function openLink(code: string, onMsg: (m: LinkMsg) => void): Link {
  const deliver = (raw: unknown) => { const m = parseMsg(raw); if (m) onMsg(m); };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const topic = `heatshield-${code}`;
  if (!url || !key) {
    const bc = new BroadcastChannel(topic);
    bc.onmessage = (e) => deliver(e.data);
    return { kind: 'this-browser', send: async (m) => { bc.postMessage(m); return true; }, close: () => bc.close() };
  }
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const ch = sb.channel(topic, { config: { broadcast: { self: false, ack: true } } });
  ch.on('broadcast', { event: 'msg' }, ({ payload }) => deliver(payload)).subscribe();
  return {
    kind: 'internet',
    send: async (m) => { try { return (await ch.send({ type: 'broadcast', event: 'msg', payload: m })) === 'ok'; } catch { return false; } },
    close: () => { void sb.removeChannel(ch); },
  };
}
