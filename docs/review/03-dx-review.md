<!-- Moved verbatim from PLAN.md lines 1477-1715 on 2026-11-14. -->
> Phase 2.5, DX review: persona, TTHW, error-path matrix, obligations X1–X14.

### Phase 2.5 — DX review (autoplan, DX POLISH)
- Methodology read in full: lines 1–1870/1870 (EOF).
- Product type: internal API/Service plus a demo platform. Scope was triggered by terms (API ×8).
- Mode: DX POLISH (override).
- Research: reference benchmarks only, no web search (P1 allows it).
- Native voice: completed on input `9b18ed3f…`. Codex: unavailable (`not_authed`), so this phase is `[single-model]`.

```
TARGET DEVELOPER PERSONA
========================
Who:       AI coding agents (v0 for UI, Antigravity for backend) building against SPEC.md + lib/types.ts; the solo builder integrates; a judge may clone the repo
Context:   Mon–Wed 16–18 Nov, generating pages/routes from a written contract with no chance to ask questions
Tolerance: zero ambiguity; an agent implements whichever version of a rule it reads first and retries blindly on silent failure
Expects:   one contract file, typed state unions, mocks per state, named env vars, `npm run dev` that works with no accounts
```

**Developer empathy narrative (Antigravity agent, first person, predicted):** I'm told to build `app/api/*` and `lib/engine/*`. PLAN.md gives me 53 S-items, 15 D-items and an API table that the S-items later override. I can't tell whether `POST /api/status` carries `action` and `unwell` (the table) or 4 keys (S17), so I build the table version first. There is no `.env.example`, so I guess `UPSTASH_REDIS_REST_URL`. `npm run dev` throws a bare 500 on the first request. When a status is older I return 200 and drop it, because nothing told me otherwise. The phone then shows "Supervisor sees: orange" for a write that never happened. Open-Meteo hands me a `null` temperature, the WBGT comes out low, and the card turns green. Nothing errors, so no one notices until the demo. *(Predicted from the plan; there is no code yet.)*

**Competitive DX benchmark (reference, not measured)**
| Tool | Start → result | Time + evidence type | DX choice | Source |
|---|---|---|---|---|
| create-next-app + Vercel template | clone → page at localhost | ~1–2 min, reported | zero env for first run | Next.js docs (reference) |
| Open-Meteo API | curl → JSON | <1 min, observed 14 Nov | no key | probe in CEO 0A |
| OSHA-NIOSH Heat Safety Tool | install → heat index | ~2 min, estimated | location only | app store (reference) |
| **HeatShield (planned, before fixes)** | clone → one-click demo | 20+ min, estimated | needs Upstash + token | this plan |
| **HeatShield (after X-fixes)** | clone → one-click demo | <3 min, estimated (3 steps) | in-memory fallback, seed demo token | this plan |

**TTHW target** is auto-decided as **Competitive (<5 min)** with a goal of 3 min (P5). The clock runs from a fresh clone (`git clone && npm i && npm run dev`) to `/` "Run the 15 July demo" showing a live card. The deployed-site judge path is about 15 s.

**Magical moment (0D):** the one-click Replay split view (S51/D6) is kept. Within 30 s the judge watches an unacclimatised worker's card turn orange while the board shows "Needs you", with no setup. It is the lowest-effort vehicle (P5) and needs no new capability.

**Developer journey map (0F)**
```
STAGE           | DEVELOPER DOES                                 | FRICTION POINTS                         | STATUS
1. Discover     | reads README → SPEC.md                         | no README; contract spread over 70 items | fixed (X8 README, S48/X7 SPEC)
2. Install      | npm i                                          | none                                    | ok
3. Hello World  | npm run dev → / → demo                         | Upstash creds + token undefined          | fixed (X4 in-memory fallback, X8 seed token)
4. Real Usage   | builds routes/pages from types + mocks         | no types list, no per-state mocks        | fixed (X6 types, X10 mocks)
5. Debug        | reads error bodies / logs                      | silent 2xx drops, bare 500s, no ids      | fixed (X1–X3, X5)
6. Upgrade      | redeploys; phones refresh                      | SW stale on v=undefined; fragment unversioned | fixed (X12 SW fallback id, fragment `v`)
```

**First-time developer confusion report (0G, predicted)**
```
T+0:00  clones repo, no README → opens PLAN.md (900+ lines)                → X8 README
T+0:30  `npm run dev`, hits / → 500 "missing env"                            → X4 fallback + named vars
T+1:00  POST /api/status with old simTs → 200, nothing on board               → X1 409 status-superseded
T+2:00  `npm test` in PowerShell → vitest watch hangs the agent terminal      → X9 `vitest run`
T+3:00  ack after level rose → 200, button gone, no ackTs                     → X2 409 ack-level-stale
```

```
DX DUAL VOICES — CONSENSUS TABLE: [single-model]
  Dimension                           Claude          Codex  Consensus
  1. Getting started < 5 min?          no→yes (X4,X8)  N/A    N/A
  2. API/CLI naming guessable?         partial (X6,X11) N/A   N/A
  3. Error messages actionable?        no, 3×CAP4      N/A    N/A
  4. Docs findable & complete?         no (X7,X8)      N/A    N/A
  5. Upgrade path safe?                partial (X12)   N/A    N/A
  6. Dev environment friction-free?    no (X9)         N/A    N/A
Single-voice criticals flagged: CAP4 ×3 (status drop, ack ignore, null input).
```

**Passes (initial → after accepted fixes)**
- **Pass 1 Getting Started: 5 → 8.** Judges reach the demo in about 15 s, but developers had no local path. After X4 and X8 it takes 3 steps and under 3 min. It is not 10 because nothing measures it automatically beyond X13's smoke check.
- **Pass 2 API design: 4 → 8.** Problems found:
  - the route identity is inconsistent (POST has no siteId)
  - no response schemas
  - the token transport is unnamed
  - DELETE has no id

  Fixed by X6 (types), X11 (siteId from the token, `Authorization: Bearer`, `DELETE /api/status/:workerId`) and epoch-ms JSDoc.
- **Pass 3 Error messages (agent-ready-v1): 3 → 8.** The matrix:
  ```
  ERROR PATH MATRIX (agent-ready-v1, after fixes)
  Path                    | Class      | what | fix | recovery | code | context | trace | redaction | channel | Cap
  POST status 400         | usage      | pass | pass| N/A      | pass | N/A     | N/A   | pass      | pass    | —
  POST status stale/sess  | conflict   | pass | pass| pass     | pass | pass    | N/A   | pass      | pass(409)| was CAP4 → fixed X1
  POST ack stale          | conflict   | pass | pass| pass     | pass | pass    | N/A   | pass      | pass(409)| was CAP4 → fixed X2
  engine null input       | data       | pass | pass| pass     | pass | pass    | N/A   | pass      | pass(chip)| was CAP4 → fixed X3
  API 5xx (Redis)         | unexpected | pass | pass| pass     | pass | pass    | pass(x-vercel-id) | pass | pass | was CAP6 → fixed X5
  ```
  Before the fixes, an agent hitting a stale POST saw `200 {}`. After them it gets `409 application/problem+json {type:"/errors#status-superseded", code:"status-superseded", detail:"simTs 1752570000000 older than stored 1752570060000", fix:"drop this queued status; send the latest only"}`. Debug mode: the phone has the hidden `?debug` panel (CEO Section 8). It is not 10 because the i18n missing-key path is only a warning (X10).
- **Pass 4 Documentation: 4 → 7.** Fixed by X7 (SPEC.md scheduled Sat/Sun with the conflict list resolved), X8 (README, curl examples, `.env.example`) and X10 (mocks per state). It is not 10 because docs are hand-maintained with no search; acceptable for a hackathon.
- **Pass 5 Upgrade path: 3 → 6.** A versioned session fragment (`v`) and the SW build-id fallback with a `#nosw` kill switch (X12). There is no migration story beyond "rescan QR" (D8), which is acceptable because data has a 24 h TTL.
- **Pass 6 Dev environment: 4 → 8.** Problems found: watch-mode hangs, TZ tests that are POSIX-only on Windows, and constants that can't be injected. Fixed by X9 (`vitest run`, TZ via vitest config, `npm run sim` / `check:contrast` / `smoke`) and X9 params injection.
- **Pass 7 Community: 2 → 5.** Public repo with MIT licence and README (X8). There is no channel, by design: a solo hackathon.
- **Pass 8 DX measurement: 2 → 6.** X13 adds an `npm run smoke` check against the deployed URL. It covers `/` returning 200, the Replay engine path reaching L≥2 in a headless run, and a tokenless GET returning 401, all within 3 min. It doubles as the post-deploy check (CEO Section 9).

<!-- autoplan-accepted:dx -->
- X1 Status write outcomes (DX CAP4 #1):
  1. `POST /api/status` checks `sessionId` first. A newer session overwrites the hash. An older one returns `409 problem+json` with code `session-replaced`, which shows D8 "Rescan QR".
  2. It then checks `simTs`. An older one returns `409 status-superseded` with `storedSimTs`.
  3. On 409 the client discards the queued item and never shows "Supervisor sees".
  4. Success returns `200 {now, storedSimTs}`, and the phone keeps the clock offset from `now` (DX #24).

  Verify: an older-simTs POST returns 409, a Replay POST after a Live session overwrites (new session), and the D1 line is not "Supervisor sees" after a 409.
- X2 Ack outcomes (DX CAP4 #2): `POST /api/ack {workerId, level}` returns `409 ack-level-stale {ackedLevel, currentLevel}` when the level has risen, and `404 no-status` when the key is missing. On 409 the board keeps the "Help sent" button and re-renders. Verify: ack at level 3 after the level rises to 4 returns 409, and `ackTs` stays unset.
- X3 Finite-input guard (DX CAP4 #3): the engine entry treats any null, undefined, NaN or Infinity input as missing and applies the S5 worst value plus a reason chip. Verify: a fixture row with `temperature_2m: null` gives a level ≥ the climatology level, never L0 from that row.
- X4 Store selection (DX #4):
  - `lib/store.ts` uses Upstash when both URL and token vars are set. It accepts both `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` and `KV_REST_API_URL`/`KV_REST_API_TOKEN`.
  - Otherwise it uses the in-memory adapter and logs one `console.warn` naming the vars.
  - If only one var is set, it fails at boot naming the missing one.
  - `.env.example` lists the vars.
- X5 Errors and tracing (DX #5, #6, #7):
  - One `problem(status, code, detail, fix)` helper returns `application/problem+json`. Codes are anchored in SPEC.md#errors: `bad-status-body`, `bad-token`, `unknown-site`, `session-replaced`, `status-superseded`, `ack-level-stale`, `no-status`, `store-unavailable`.
  - Each route has one try/catch. It logs `{route, code, requestId (x-vercel-id), cause.message}`, never headers, and returns 5xx problem+json with `requestId`.
  - Board: on 401/403 it stops polling and shows "Session not valid: start a new session". On network or 5xx errors it backs off 1 → 2 → 4 s, capped at 30 s, and resets on success.
- X6 Types list (DX #12, #19), written today in `lib/types.ts`:
  - `Site{id, lat, lon, medicTel, crews, roster}`
  - `Crew`, `Task`, `StatusPost`, `StatusRecord`
  - `CrewStatusResponse{now, statuses}`
  - `AckPost{workerId, level}`
  - `SessionFragment{v, siteId, token, scenario, wallStart, simStart, multiplier, fastingSafe}`
  - `Problem`
  - `WorkerViewState`, a discriminated union covering the D1/D4/D8 states
  - `BoardTileState`

  Every timestamp field has the JSDoc "epoch ms".
- X7 SPEC.md schedule and conflict resolutions (DX #13): SPEC.md (modules + SCREENS + TOKENS + ERRORS) is compiled Sat 14–Sun 15, before Monday's v0 work. Resolutions baked in:
  - stale shows a hatch (D3 wins over S33's "faded")
  - L4 Rest never reverts (D7 wins over S41)
  - Liljegren is a Wednesday stretch goal only; Sunday validates the Bernard approximation against Open-Meteo wet-bulb (S52 wins over S39/S46/S47)
  - the ack anchors on `levelSince` (S46 wins over S32)
  - the phone-OS group is dropped (S35 wins over S13)
  - start-budget precedence: Replay 100, then carry-over, then 70, then late join from join time
  - poll intervals come from S29/S46, and `fastingMembers` is dead (S29)
  - cut order: S47's checkpoints decide, then S46's list
- X8 README and seed (DX #14, #17):
  - README has `npm i` / `npm run dev` / `npm test`, one example session URL, and curl examples for all 5 routes.
  - The demo site's token lives in a committed seed file and is public by design (stated). Live-site tokens come from an env var.
  - The token goes only in `Authorization: Bearer`, never in a query parameter, never logged.
  - MIT licence.
- X9 Dev scripts and params (DX #15, #16):
  - `"test": "vitest run"`. The S45 TZ matrix runs through `vitest.config.ts` projects with `test.env.TZ`, so it works on Windows.
  - Scripts: `npm run sim` (writes committed `public/evidence.json`; golden comparisons use a tolerance), `npm run check:contrast`, `npm run smoke`.
  - Engine and truth functions take `params = DEFAULTS` from `constants.ts`, and `WBGT_METHOD` is a constant.
- X10 Mocks and i18n (DX #20, #21): one `mocks/*.json` per `WorkerViewState` and `BoardTileState`, typed. A missing i18n key falls back to `en` with a dev warning. One key-parity test runs across the 6 dictionaries.
- X11 Route identity (DX #8, #18):
  - siteId comes from the token. A path id that doesn't match returns 403.
  - The crew-to-workers mapping comes from the roster.
  - `DELETE /api/status/:workerId` replaces the bodiless `DELETE /api/status`.
  - Before the wipe, "Delete my data" writes a `pendingDelete {workerId, token}` key that the wipe leaves alone. It is retried on `online` and on each heartbeat, and cleared on 2xx or 404. On 401/403 the app shows "Will expire within 24 h".
- X12 Client recoveries (DX #9, #10, #11, #22):
  - `lib/weather.ts` returns `{ok:true, rows, fetchedAt} | {ok:false, code:'forecast_unavailable'|'forecast_bad_response', status?, reason?}`. It retries on `online` and every 15 wall-min until a current-hour row exists. The planner shows `fetchedAt`.
  - The SW logs any failing precache URL and posts `sw-ready`. The menu shows "Offline ready" only after that.
  - Wake Lock is re-requested on `visibilitychange`. The toggle reads `!sentinel.released`. On rejection the app shows "Screen may turn off: stay with your buddy".
  - The SW registers only in production and falls back to Next's build id when `VERCEL_GIT_COMMIT_SHA` is undefined. `#nosw` unregisters it.
  - The session fragment carries `v`.
- X13 Smoke check (DX Pass 8): `npm run smoke <url>` asserts `/` returns 200, a headless Replay engine run reaches L≥2 by 11:00, and a tokenless `GET /api/crew/x/status` returns 401. It runs after every production deploy.
- X14 Escape hatches stated (DX #25): planner overrides are data-only, via task `earliest`/`latest`. The missing supervisor override of worker levels is deliberate (S4/S20). Unscheduled tasks carry stable reason codes. UTC+4 and the midday-ban dates are hardcoded, each with a `ponytail:` comment.
<!-- /autoplan-accepted:dx -->

**NOT in scope (DX):**
- A public SDK or OpenAPI spec (internal API).
- Docs search.
- A community channel.
- Codemods.
- Automated TTHW telemetry beyond X13.

**What already exists (DX):**
- The in-memory adapter (S14).
- Injected time steps (S8).
- The one-click Replay demo (S51).
- D1 and D8 state copy keys.
- The planner's unscheduled + reason output.
- The S5/S42 fallbacks.

**DX Review Scorecard**
```
| Dimension            | Score  | Prior  | Trend  |
| Getting Started      | 8/10   | 5/10   | ↑      |
| API/CLI/SDK          | 8/10   | 4/10   | ↑      |
| Error Messages       | 8/10   | 3/10   | ↑      |
| Documentation        | 7/10   | 4/10   | ↑      |
| Upgrade Path         | 6/10   | 3/10   | ↑      |
| Dev Environment      | 8/10   | 4/10   | ↑      |
| Community            | 5/10   | 2/10   | ↑      |
| DX Measurement       | 6/10   | 2/10   | ↑      |
| TTHW                 | <3 min (est.) | 20+ min (est.) | ↑ |
| Competitive Rank     | Competitive                              |
| Magical Moment       | designed via one-click Replay split view |
| Product Type         | internal API/Service + demo platform     |
| Mode                 | POLISH                                   |
| Overall DX           | 7/10   | 4/10   | ↑      |
| Zero Friction  covered | Learn by Doing covered (mocks) | Fight Uncertainty covered (X1–X5) |
| Opinionated + Escape Hatches covered (X14) | Code in Context covered (curl) | Magical Moments covered | Agents Are Users covered (vitest run, problem+json) |
```
Community (5) and Upgrade (6) stay below 8 on purpose: this is a hackathon scope, not DX debt that blocks adoption.

```
DX IMPLEMENTATION CHECKLIST
[ ] Time to hello world < 3 min (clone → one-click demo)
[ ] Installation is one command (npm i)
[ ] First run produces meaningful output (/ demo, no env needed)
[ ] Magical moment delivered via one-click Replay split view
[ ] Every error message meets the agent-ready error contract (X1–X5)
[ ] API naming guessable; siteId from token; Bearer auth
[ ] Every parameter has a sensible default (params = DEFAULTS)
[ ] README curl examples work as-is
[ ] Mocks per WorkerViewState / BoardTileState
[ ] Upgrade: fragment `v`, SW build id, #nosw
[ ] TypeScript types in lib/types.ts with epoch-ms JSDoc
[ ] `npm test` = vitest run; TZ matrix via config (Windows-safe)
[ ] Free tier: Vercel + Upstash free, Open-Meteo no key
[ ] Smoke check after each deploy (X13)
```

**Implementation Tasks (DX)**
- [ ] **T16 (P1, human ~2h / CC ~15min)**: api. problem+json helper, 409 status/ack outcomes and error codes (X1/X2/X5).
  - Surfaced by: DX CAP4 #1/#2.
  - Files: lib/problem.ts, app/api/status/route.ts, app/api/ack/route.ts.
  - Verify: 409 tests.
- [ ] **T17 (P1, human ~1h / CC ~10min)**: engine. Finite-input guard (X3).
  - Surfaced by: DX CAP4 #3.
  - Files: lib/engine/risk.ts.
  - Verify: null-temperature fixture test.
- [ ] **T18 (P1, human ~1h / CC ~10min)**: store. Env selection with in-memory fallback, plus `.env.example` (X4).
  - Surfaced by: DX #4.
  - Files: lib/store.ts, .env.example.
  - Verify: `npm run dev` works on a fresh clone with no env.
- [ ] **T19 (P1, human ~1h / CC ~10min)**: types. The X6 types list in `lib/types.ts`.
  - Surfaced by: DX #12.
  - Files: lib/types.ts.
  - Verify: `tsc --noEmit`.
- [ ] **T20 (P1, human ~1h / CC ~10min)**: dx. README, seed token, scripts, vitest config (X8/X9).
  - Surfaced by: DX #14/#16.
  - Files: README.md, package.json, vitest.config.ts, data/seed.json.
  - Verify: `npm test` exits.
- [ ] **T21 (P2, human ~2h / CC ~20min)**: client. Weather result type with retry, SW ready signal, Wake Lock re-request, pendingDelete (X11/X12).
  - Surfaced by: DX #8–#11.
  - Files: lib/weather.ts, lib/client/session.ts, public/sw.js.
  - Verify: unit tests plus a manual offline check.
- [ ] **T22 (P2, human ~1h / CC ~10min)**: smoke. `npm run smoke` (X13).
  - Surfaced by: DX Pass 8.
  - Files: scripts/smoke.ts.
  - Verify: run against the deployed URL.
