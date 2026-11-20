// Pure status and ack rules (spec 03, "Status rules" and "Ack rules"). Routes add auth and storage around these.
import type { AckOutcome, AckPost, EpochMs, StatusInput, StatusOutcome, StatusPost, StatusRecord } from './types';

const MAX_BYTES = 1024;
const KEYS = ['workerId', 'level', 'simTs', 'lowBattery'] as const;
const FUTURE_MS = 2 * 60_000;

/** Parse and validate the raw body. Returns the post, or the name of the failing field ("body" for size/JSON/shape). */
function parse(bodyText: string, roster: string[]): StatusPost | string {
  if (new TextEncoder().encode(bodyText).length > MAX_BYTES) return 'body';
  let b: unknown;
  try { b = JSON.parse(bodyText); } catch { return 'body'; }
  if (typeof b !== 'object' || b === null || Array.isArray(b)) return 'body';
  const o = b as Record<string, unknown>;
  const extra = Object.keys(o).find((k) => !(KEYS as readonly string[]).includes(k));
  if (extra !== undefined) return extra;
  if (typeof o.workerId !== 'string' || !roster.includes(o.workerId)) return 'workerId';
  if (!Number.isInteger(o.level) || (o.level as number) < 0 || (o.level as number) > 4) return 'level';
  if (typeof o.simTs !== 'number' || !Number.isFinite(o.simTs)) return 'simTs';
  if (typeof o.lowBattery !== 'boolean') return 'lowBattery';
  return { workerId: o.workerId, level: o.level as StatusPost['level'], simTs: o.simTs, lowBattery: o.lowBattery };
}

/** Checks in order: body (400), device (403), future (409), superseded (409). */
export function applyStatus(prev: StatusRecord | null, input: StatusInput, now: EpochMs): StatusOutcome {
  const post = parse(input.bodyText, input.roster);
  if (typeof post === 'string') return { ok: false, status: 400, code: 'bad-status-body', field: post };
  if (prev && prev.deviceKeyHash !== input.deviceKeyHash) return { ok: false, status: 403, code: 'device-mismatch' };
  if (post.simTs > input.simNow + FUTURE_MS) return { ok: false, status: 409, code: 'simts-in-future' };
  if (prev && post.simTs < prev.simTs) return { ok: false, status: 409, code: 'status-superseded', storedSimTs: prev.simTs };
  if (prev && KEYS.every((k) => prev[k] === post[k])) return { ok: true, record: prev, write: false }; // idempotent retry
  return {
    ok: true,
    write: true,
    record: {
      ...post,
      receivedAt: now,
      levelSince: prev && prev.level === post.level ? prev.levelSince : now,
      deviceKeyHash: input.deviceKeyHash,
    },
  };
}

/** 404 without a status; 409 if the level rose above the acked one (nothing written). */
export function applyAck(status: StatusRecord | null, body: AckPost, now: EpochMs): AckOutcome {
  if (!status) return { ok: false, status: 404, code: 'no-status' };
  if (status.level > body.level) return { ok: false, status: 409, code: 'ack-level-stale', ackedLevel: body.level, currentLevel: status.level };
  return { ok: true, ack: { level: body.level, ackTs: now } };
}
