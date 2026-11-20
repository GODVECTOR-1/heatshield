# 03 · API and storage (`app/api/*`, `lib/{store,status,auth,problem}.ts`)

## Auth (Supabase Auth)
- **Supervisor:** signs in with Supabase Auth (email magic link). Table `supervisors(user_id, site_id)` maps the user to a site. Routes verify the Supabase JWT server-side (`auth.getUser`); the site comes from that row.
- **Worker:** no account. Scanning the QR gives the site's worker join token; the phone then calls `signInAnonymously()`. The anonymous user id replaces `X-Device-Key` as the device binding (first status binds `user_id` to `{session, workerId}`; a different user later gets 403 `device-mismatch`). A new QR/session clears bindings.
- **Demo site:** keeps the public seeded tokens below so the one-click demo needs no sign-in.
- Both identities travel as `Authorization: Bearer <Supabase JWT>`; the worker also sends `X-Join: <join token>`. The rules below still apply.

### Token rules (demo + join tokens)
- **Two tokens per site: worker and supervisor.** Every route calls one `auth(req, role)` helper, which compares tokens in constant time.
- Tokens travel only in `Authorization: Bearer <token>`. They never go in a query string and are never logged.
- The site comes from the token, so routes have no `:siteId`.
- **Demo site:** both tokens sit in the committed `data/seed.json` and are public by design, which is stated in the README. **Live sites:** tokens come from env vars.
- **Session-scoped calls** send `X-Session: <sessionId>`.
- **Device binding:** the anonymous Supabase user id (see above); the server stores its hash in that worker's status row.

## Routes
| Route | Role | Request | Response |
|---|---|---|---|
| `GET /api/site` | worker | — | `{now, crews[{id, shiftStart, shiftEnd}], roster[{workerId, displayName, crewId}], medicTel}` |
| `GET /api/site` | supervisor | — | the worker view plus `profiles[]`, `tasks[]` |
| `GET /api/profile/:workerId` | worker | anon Supabase JWT | `{now, profile{age, acclimDays, daysAway, clothing}}` |
| `POST /api/session` | supervisor | `{crewId, scenario, multiplier, fastingSafe, wallStart, simStart, shift, wbgtHourly{sun[],shade[]}, schedule}` | `{now, sessionId}`. The server generates `sessionId` with `crypto.randomUUID()` |
| `GET /api/session/:sessionId` | either | — | `{now, record}` |
| `POST /api/status` | worker | headers `X-Session`, `X-Join`; body **exactly** `{workerId, level, simTs, lowBattery}` | `200 {now, storedSimTs}` |
| `DELETE /api/status/:sessionId/:workerId` | worker | anon Supabase JWT | `204`. A 404 also counts as done |
| `GET /api/crew/:crewId/status` | supervisor | `X-Session` | `{now, statuses[{workerId, level, simTs, lowBattery, receivedAt, levelSince, ack?{level, ackTs}}]}`, from one MGET |
| `POST /api/ack` | supervisor | `X-Session`; body `{workerId, level}` | `200 {now}` |

Every response sends `Cache-Control: no-store`.

## Status rules (`lib/status.ts`, pure `applyStatus(prev, input, now)` and `applyAck(status, body, now)`)
Inputs and outcomes are `StatusInput`, `StatusOutcome` and `AckOutcome` in `lib/types.ts`. The checks run in this order: body (400), device (403), future (409), superseded (409). The cases are in `tests/status.test.ts`.
- **Validate** before any work:
  - `level` is an integer 0–4
  - `workerId` is in the roster
  - `simTs` is finite
  - `lowBattery` is a boolean
  - the body is ≤ 1 KB, read with `req.text()` before parsing
- The session record must exist and the simTs must not be in the future. A `simTs` more than simNow + 2 sim-min returns 409 `simts-in-future`.
- `simTs` older than the stored one returns 409 `status-superseded` `{storedSimTs}`. The client drops that queued item.
- An equal `simTs` with the same body returns 200 with nothing written, so retries are idempotent.
- An equal `simTs` with a **different** body is stored (the later write wins), so an L4 in the same sim-minute is never dropped.
- Otherwise the server stores `{level, simTs, lowBattery, receivedAt, levelSince, deviceKeyHash}`.
  - `receivedAt` and `levelSince` are server wall time.
  - `levelSince` changes only when the level changes.

## Ack rules (separate key, no compare-and-set)
- `POST /api/ack` writes `ack:{site}:{session}:{worker} = {level, ackTs}`.
- It returns 404 `no-status` if there is no status. If the current level is above the acked level, it returns 409 `ack-level-stale` `{ackedLevel, currentLevel}` and writes nothing.
- The board derives **acked** = `ack.level >= status.level && ack.ackTs >= status.levelSince`. A level rise after the ack un-acks automatically.

## Tables (Supabase Postgres)
| Table | Primary key | Writer | Expiry |
|---|---|---|---|
| `session` | `(site_id, session_id)` | supervisor | `expires_at = now() + 24 h` |
| `status` | `(site_id, session_id, worker_id)` | worker | same |
| `ack` | `(site_id, session_id, worker_id)` | supervisor | same |
| `supervisors` | `user_id` | admin (seed) | — |

- Rows are JSON in a `body jsonb` column plus the key columns. Reads always filter `expires_at > now()`; a daily `pg_cron` job deletes expired rows.
- **RLS on, no policies:** the browser never touches tables. Only server routes, with the service-role key, read/write.
- Crew status is one `select ... where session_id = $1 and worker_id = any($2)`.

The store holds only a pseudonymous derived risk level. It keeps no health data and no history.

## Store selection (`lib/store.ts`)
- **Supabase** when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.
- **In-memory** only when `!process.env.VERCEL`. It is pinned on `globalThis` so dev hot reload keeps the data, and logs one warning naming the vars.
- **Production with missing vars** returns 503 `store-unavailable`. Only one var set fails at boot, naming the missing one.
- `/api/status` rate limit: reject a post for the same `(session, worker)` arriving < 2 s after the stored `receivedAt` with 429 (no extra service) `[estimated]`.

## Gemini (optional, text only)
**As built (20 Nov):** `GET /api/plan-summary?mode=on|off`. The browser sends only the planner mode. The server builds the anonymous facts itself with `planFacts(mode)` in `lib/demo/summary.ts` (task names, work class, sun or shade, times, the ban and unscheduled reasons), so no caller text ever reaches Gemini.
- It calls the Gemini REST `generateContent` endpoint with `GEMINI_MODEL` and `GEMINI_API_KEY`, a 20 s timeout (`maxDuration` 30) and temperature 0.2. The output is capped at 700 characters. The limit was 8 s until 20 Nov, when Gemini was overloaded: Flash models took 10–15 s or more, and the page never waits on the answer anyway.
- There is one cached answer per mode per server instance.
- If the key is missing or anything fails, it returns `200 {text: null}`, and the box keeps the `planSummary(mode)` template.
- The box sits under the heat timeline on `/demo` and `/supervisor`. Its caption says who wrote the text and that it never sets alert levels.

The original design follows.
- `POST /api/plan-summary` (supervisor, `X-Session`): sends the stored schedule (task names, class, times, predicted levels, unscheduled reasons; **no names, no worker ids, no profiles**) to Gemini and returns 3–4 plain sentences, e.g. "Heavy lifting moved to 06:00–08:30; two rests added before the ban."
- Model from `GEMINI_MODEL` (a current Flash model), key `GEMINI_API_KEY`, server only. 8 s timeout. On missing key or any error, return a template summary built from the schedule. The board never waits on it.
- Build-time `scripts/translate.ts` drafts `data/i18n/*.json` from `en.json`; Arabic and Urdu still get a native check.
- Not used for: levels, alerts, planning, QR codes, or reading ID cards.

## Errors (`lib/problem.ts`)
`problem(status, code, detail, fix)` returns `application/problem+json`. Each route has one try/catch. It logs `{route, code, requestId (x-vercel-id), cause.message}`, never headers, and returns 5xx with the `requestId`.

| Code | Status | Meaning / fix |
|---|---|---|
| `bad-status-body` | 400 | the body failed validation; the field is named |
| `bad-token` | 401 | missing or invalid token; rescan the QR |
| `wrong-role` | 403 | the token's role can't use this route |
| `device-mismatch` | 403 | the name is in use on another phone; ask for a new QR |
| `unknown-session` | 404 | the session expired or doesn't exist |
| `no-status` | 404 | ack on a worker with no status |
| `status-superseded` | 409 | an older `simTs`; drop the queued item |
| `simts-in-future` | 409 | the phone clock is skewed; resync with `now` |
| `ack-level-stale` | 409 | the level rose since the board rendered; re-render |
| `rate-limited` | 429 | back off |
| `store-unavailable` | 503 | store env missing or down; the demo switches to its in-page store |

## Contract types (`lib/types.ts`, every timestamp is JSDoc "epoch ms")
**[`lib/types.ts`](../../lib/types.ts) is the source of truth;** this list is only a map. `lib/types.check.ts` holds compile-time checks that must keep failing where they say they do.
- Site and roster: `Crew`, `RosterEntry`, `Profile`, `Task`, `SiteWorkerView`, `SiteSupervisorView`, `ProfileResponse`
- Session:
  - `ScenarioClock` (Live is always 1×)
  - `SessionCreate`, `SessionRecord`, `SessionCreated`, `SessionResponse`
  - `SessionFragment {v, siteId, token, sessionId}`
  - `WeatherHour`, `WbgtHour`, `ScheduleSlot`, `Unscheduled`
- Status and ack: `StatusPost`, `StatusRecord`, `StatusAccepted`, `StatusInput`, `StatusOutcome`, `AckPost`, `AckRecord`, `AckOutcome`, `CrewStatusEntry`, `CrewStatusResponse`
- Errors: `ProblemCode`, `Problem`
- Engine boundary ([02](02-engine.md)): `CheckIn`, `EngineParams`, `EngineContext`, `EngineEvent`, `EngineState`, `EngineResult`, `EngineApi`
- UI states:
  - worker: `WorkerViewState` and `CardView`, covering the states in [05](05-worker-app.md)
  - board: `BoardTileState` and `BoardView`, from [06](06-supervisor-board.md)
- Evidence: `EvidenceReport`, covering [08](08-evidence-simulator.md)
