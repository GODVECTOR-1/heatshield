<!-- Moved verbatim from PLAN.md lines 591-1230 on 2026-11-14. -->
> Phase 1, CEO review (autoplan, SELECTIVE EXPANSION): premises, scope decisions, spec-review loop, sections 1–11.

## Review record

### Phase 1 — CEO review (autoplan, SELECTIVE EXPANSION)
Run `-20261114-013317`. Methodology read 1–2223/2223 (EOF). Codex: `not_authed` (outside voice unavailable). Repo state: greenfield, no git, no code yet (`ls -A` → `.claude .env.local .gitignore .gstack .mcp.json CLAUDE.md PLAN.md`). Learnings: none. Brain context: empty.

**Landscape (reused from research done 13 Nov in this session):**
- [Layer 1] Tried and true: WBGT plus NIOSH work/rest tables (OSHA/NIOSH, AIHA apps) and core-temperature wearables (Kenzen, SlateSafety).
- [Layer 2] Current: the AIHA app has an offline mode. Vendors sell per-worker SaaS. Independent validation is thin.
- [Layer 3] First principles: risk is a cumulative dose that depends on acclimatisation, not an instantaneous threshold. Nobody models leave-return de-acclimatisation for migrant workers. That is the eureka.

**0A Premise table**
| # | Premise | Receipt | Verdict |
|---|---|---|---|
| P1 | Simulated data is acceptable evidence | challenge PDF p4 + p6 ("05, 07 and 09 are the easiest to demo with simulated data") | verified |
| P2 | Must work offline and fall back safely | challenge PDF p4 ("dust, weak networks, low battery") | verified |
| P3 | Heat budget beats generic thresholds | no receipt; this is the hypothesis the simulator must test | unverified (by design) |
| P4 | Ramadan overlaps peak heat | Ramadan 2027 expected 8 Feb–9 Mar (Khaleej Times / Gulf News); Ramadan moves ~11 days earlier each year, so it falls outside Jun–Sep until the 2040s | **challenged** |
| P5 | Open-Meteo gives every WBGT input | live probe 14 Nov: HTTP 200 with temperature, RH, dew point, wind, shortwave/direct/diffuse radiation, pressure, wet_bulb_temperature_2m | verified |
| P6 | A live November demo shows heat risk | probe: 14 Nov 2026 Abu Dhabi max 28.3 °C (wet-bulb 20.7) vs 15 Jul 2026 archive max 43.6 °C, SW 927 W/m² | **challenged: demo would be all green** |
| P7 | v0 account reachable for frontend generation | `GET api.v0.dev/v1/user` → HTTP 200 (this session) | verified |
| P8 | Midday ban 12:30–15:00, 15 Jun–15 Sep | Khaleej Times 2026 midday-break article | verified |
unverified=1

**0B Existing leverage:** No repo code. External reuse: Open-Meteo forecast and archive APIs; NIOSH RAL/REL formulas; Liljegren WBGT (port from the R `HeatStress::wbgt.Liljegren` source); ECTemp (Buller 2013 / Looney 2018); shadcn/21st.dev components through v0; `ui-ux-pro-max` skill for design rules.

REALITY: premise-table finding 8 premises, 2 challenged (P4 Ramadan timing, P6 November demo), unverified=1 PLAN.md:12
REALITY: already-done pass no git history; repo holds only plan/config files (ls -A, 14 Nov) PLAN.md:1
REALITY: surface-check finding v0 MCP URL https://v0.app/api/mcp (v0 docs) and Open-Meteo endpoints probed OK; the five /api routes are new, and two duplicate client-side engine functions PLAN.md:56
REALITY: binding-decisions pass gstack-decision-search empty; plan binding decision = "Build split (decided 14 Nov)" honoured PLAN.md:44
REALITY: numbers finding 12:30–15:00 [measured: Khaleej Times]; 7–14 day ramp [measured: NIOSH]; 10 s poll [estimated]; 43.6 °C / 28.3 °C [measured: Open-Meteo 14 Nov] PLAN.md:13
REALITY: deferred-asks pass no linked issue PLAN.md:1
REALITY: pr-count pass no .gstack/ship-policy.json; default one PR per wave PLAN.md:68

**0C Dream state**
```
CURRENT STATE                 THIS PLAN (by 20 Nov)                 12-MONTH IDEAL
supervisors use one     --->  per-worker heat budget, acclim,  --->  DoH-piloted engine on real
temperature + midday ban      fasting-aware, offline PWA, shift      crews: real wearables, SMS/
rule; no personal risk        planner, simulator with fairness       WhatsApp alerts, validated vs
                              metrics, demo on replayed July day     clinic heat-illness records,
                                                                     aggregate feed into DoH PHI
```

**0G HOLD checks (inside SELECTIVE)**
- Complexity: about 8 engine files, 3 pages, 5 API routes, a service worker and i18n, which is more than 8 files for one person in 6 days. `POST /api/plan` and `GET /api/sim` call pure engine functions the client already imports, so they duplicate them (DRY).
- Minimum change: keep only the shared-state routes on the server.

**Expansion candidates (cherry-pick, auto-decided)**
| ID | Proposal | Effort | Risk | Decision | Principle |
|---|---|---|---|---|---|
| E1 | Heat-day replay: pick "Live" or "Replay 15 Jul 2026" (Open-Meteo archive) | S | low | ACCEPTED | P2 blast radius, <1d; fixes P6 |
| E2 | Shift time-lapse: run an 8 h shift in ~2 min on the worker + supervisor screens | S | low | ACCEPTED | P2; makes the demo watchable |
| E7 | 30-second pre-shift check-in (sleep, urine-colour chart tap, feeling unwell) feeding Tier 1 | S | low | ACCEPTED | P1; Tier 1 was implied but unbuilt |
| E11 | `navigator.vibrate` pattern per alert level | S | low | ACCEPTED | P2, native API |
| E6 | Escalation: level ≥3 not acknowledged by supervisor in 5 min → safety officer flag | M | med | TASTE (accept) | P1 vs P5; adds a state machine |
| E9 | Deploy on Azure Static Web Apps instead of Vercel (Microsoft is a challenge partner) | M | med | TASTE (Vercel) | P3 pragmatic |
| E3 | SMS / WhatsApp fallback channel | L | med | DEFERRED | P3, new infra |
| E4 | Real BLE heart-rate strap via Web Bluetooth | M | high | DEFERRED | P3, hardware |
| E10 | Anonymised aggregate near-miss feed for DoH Population Health Intelligence | M | low | DEFERRED | P3, outside blast radius |
| R1 | Cut `POST /api/plan` and `GET /api/sim`; call the engine directly | S | low | TASTE (cut) | P4 DRY, P5 |

**0H outcome:** CEO plan at `~/.gstack/projects/MIcrosoft/ceo-plans/2026-11-14-heatshield.md`.
- The spec review loop ran 3 times: 5/10, then 5/10, then 6/10.
- The pass-3 blocking fixes are applied as S40–S45 but were **not re-verified**: 6 fixes are unconfirmed.
- Document approval was auto-decided as A.

**0I Temporal interrogation** (human ~6 days / CC+gstack ~1.5 days)
```
HOUR 1 (foundations):   lib/types.ts shapes: SessionFragment{siteToken,sessionId,scenario,wallStart,simStart,multiplier,fastingCrews}, StatusHash{level,simTs,receivedAt,levelSince,ackTs,sessionId}, Site, Crew{shiftStart,shiftEnd}, Worker{id,displayName,age,acclimDays,daysAway,clothing}, Task, ForecastRow{tsUtc,T,RH,u10,SW,direct,P,wbgt?}; toSiteTime helper; fixtures
HOUR 2-3 (core logic):  Liljegren iteration (globe + natural wet-bulb solve, converge tol 0.02 °C); NIOSH RAL = 59.9 − 14.1·log10(M), REL = 56.7 − 11.5·log10(M) [verify vs NIOSH 2016]; hysteresis + latch order inside risk.ts
HOUR 4-5 (integration): v0 output lands as shadcn components + app routes → must import lib/types + lib/engine, not copy them; Upstash env vars via Vercel Marketplace; SW + App Router chunk names
HOUR 6+ (polish/tests): calibration of k on seed 7, fairness charts, RTL pass, offline test on deployed URL
```
Feasibility blockers:
- GitHub repo + Vercel project + Upstash must exist on Sat. Creating them needs the user's go-ahead: they are outward-facing accounts.
- v0 MCP is not yet authorised (needs `/mcp`); the v0 Platform API key works.

**Decision ledger (CEO)**
| ID and owner | Contract and evidence | Current | Proposed | Status | Exact approval and scope |
|---|---|---|---|---|---|
| CEO-E1 (worker+supervisor UI, engine) | demo must show risk in November (P6 probe) | live forecast only | add a "Replay 15 Jul 2026" scenario from the Open-Meteo archive | approved | autoplan auto-decision P2, scope: scenario picker + archive fetch |
| CEO-E2 (engine clock, UI) | judges watch a few-minute demo | real time | time-lapse multiplier (1x / 240x) | approved | autoplan P2, scope: shared sim clock |
| CEO-E7 (worker UI, risk.ts) | Tier 1 self-checks named in the 13 Nov design | not built | pre-shift check-in, 3 taps | approved | autoplan P1 |
| CEO-E11 (worker UI) | low-literacy, noisy site | visual + voice | add vibration pattern per level | approved | autoplan P2 |
| CEO-E6 (API, supervisor UI) | challenge: action per level | no ack | ack + 5 min escalation | approved (taste) | autoplan P1, surfaced at gate |
| CEO-E9 (deploy) | Microsoft partner | Vercel | Azure SWA | declined (taste) | autoplan P3, surfaced at gate |
| CEO-R1 (API) | engine is client-runnable (PLAN.md:48) | 5 routes | 3 routes (drop plan, sim) | approved (taste) | autoplan P4/P5, surfaced at gate |
| CEO-E3/E4/E10 | new infra or hardware | — | — | deferred | autoplan P3 → TODOS.md |
| CEO-UC1 (pitch) | P4 receipt: Ramadan 2027 = Feb–Mar | "Ramadan fasting mode" as a core pitch pillar | reframe as "fasting-aware" (any fast, incl. Ramadan); don't claim a summer overlap | unresolved → User Challenge | needs the user at the Phase 4 gate |

<!-- autoplan-accepted:ceo -->
- E1: The supervisor screen sets one scenario per site session (S8): "Live (Open-Meteo forecast)" or "Replay 15 Jul 2026" (bundled JSON taken from the Open-Meteo archive, S12). Workers inherit it. Replay feeds the same engine path as live. Verify: the engine test on the replay fixture reaches level ≥2 for an unacclimatised heavy-work worker by 11:00, and the live November fixture stays at level ≤1.
- E2: One shared simulation clock with a 1x / 240x multiplier drives worker, supervisor and engine time steps. Verify: an injected-step engine test where the 240x and 1x step sequences give identical budgets (S8), plus a manual check that an 8 h shift takes ~2 min at 240x.
- E7: Pre-shift check-in of 3 taps (slept well y/n, urine colour 1–8 chart, feeling unwell y/n) feeds Tier 1. A skipped check-in counts as the worst answers (S5). Verify: an engine test where "unwell = yes" gives locked level 4 (S4), and a skipped check-in scores strictly worse than "all fine".
- E11: Each alert level has a distinct `navigator.vibrate` pattern, and the call is skipped silently where unsupported. Verify: a manual check on an Android phone.
- E6 (taste, reduced by spec review 4.1): This is a badge on the supervisor board only. A level ≥3 status not acknowledged within the ack window shows "ack overdue" on the board. The ack window is wall-clock time, so it stays usable in time-lapse: 5 min live, 30 s in time-lapse. The badge is computed in the browser. The ack is stored in that worker's status key (`ackTs`) through `POST /api/ack`. The badge flags the missing supervisor ack, not the worker. There is no safety-officer role and no per-worker history. The worker's action never waits on the ack. Verify: a unit test where a level-3 status unacked past the window yields `ackOverdue=true`, and an acked one yields false.
- R1 (taste): Shift planner and simulator run client-side from `lib/engine`. The API is `GET /api/site/:id`, `POST /api/status`, `GET /api/crew/:id/status` and `POST /api/ack` (E6). Verify: evidence and planner pages work offline after the service worker install.
- S1 Consent and data (spec 1.1, 1.3): Before the first check-in, one icon+voice consent screen explains the rules:
  - Check-in answers, heart rate and budget stay on the device.
  - The phone only posts `{workerId, level, action, unwell, simTs}`.
  - Server status keys expire after 24 h, with no history kept.
  - A "Delete my data" button clears local storage.

  Verify: a test asserts the status POST body has exactly these keys, and a manual check confirms delete empties storage.
- S2 Fasting privacy (spec 1.2, 3.3): Fasting is a toggle the worker sets on the phone and is never sent per worker. The planner gets only `fastingMembers: number` per crew, which the worker app reports as a count increment with no identity. If `fastingMembers > 0`, the planner applies fasting windows to the whole crew. The windows come from a bundled Fajr/Maghrib table for Abu Dhabi on the demo days. The toggle is manual, not tied to the calendar. Verify: `GET /api/site/:id` has no per-worker fasting field.
- S3 Weak network (spec 1.4, 1.6): Statuses are queued locally and retried on the `online` event. The phone posts only when the level changes, plus a 5 min heartbeat; there is no worker-side polling and no geolocation. The board shows "last seen X min ago" and greys out a worker after 2 heartbeats are missed: grey means unknown and is never shown as green. Verify: a test where a queued status is posted after going back online, and a stale worker renders grey.
- S4 Level 4 and unwell (spec 1.5, 2.5): Unwell, tapped at any time including pre-shift, means level 4, locked. Only the worker can clear it, after a medic or buddy check; the supervisor cannot. Level 4 shows a `tel:` button for the site medic number (from site data) and 998. Verify: an engine test where unwell forces level 4 whatever the budget, and the supervisor UI has no clear control.
- S5 Fallback rule (spec 1.7, 3.6): Any missing input falls back to its worst plausible value:
  - No or stale forecast (>6 h) → bundled July climatology.
  - Skipped check-in → the worst answers. This is strictly worse than "all fine" and replaces the E7 "never lower" wording.
  - Heart-rate data older than 2 min → drop to Tier 0 and compute limits as if unacclimatised.

  Tiers: Tier 0 is forecast + task + profile. Tier 1 adds the check-in and symptom taps. Tier 2 adds a simulated HR stream, with a "watch: on / off / drop" demo toggle. "Confidence" is the set of tiers present, shown as chips on the worker card. Verify: engine tests for each fallback.
- S6 Languages (spec 1.8, 5.4): Text and icons in en, ar, hi, ur, bn, ml; ar and ur render with `dir="rtl"`. Voice uses `speechSynthesis` where a voice exists, and otherwise a level-specific tone pattern. Missing voices are recorded as a known limitation. Verify: a manual pass in each language, and the RTL layout checked in ar.
- S7 Evidence spec (spec 1.9, 1.10, 5.2):
  - Baselines: B0 = midday ban only; B1 = one generic WBGT limit for everyone (the acclimatised REL at moderate work).
  - Truth: a separate heat-storage model with per-worker random sweat capacity. A truth event is core temperature ≥ 38.5 °C.
  - Lead time = truth-event time minus the first level ≥2 alert.
  - Population: 200 synthetic workers × 5 days, seed 42.
  - Groups: age band, acclimatised or not, fasting, PPE, phone OS.
  - Fairness pass: sensitivity gap between groups ≤ 10 percentage points.
  - Planner metric: planner on vs off, tasks completed and level ≥2 events.

  Verify: the sim test is deterministic for seed 42, and the engine and truth modules share no code.
- S8 Time and clock (spec 2.3, 2.8, 3.9): The site session holds one scenario plus clock `{startEpoch, multiplier}`, set on the supervisor screen; workers inherit it through the site URL. `simTs` is simulation time. The engine takes an injected time step, so tests run in milliseconds. The board polls every 10 s live and every 1 s in time-lapse. Verify: E2 is checked by injected-step equality, not by running a real 8 h shift.
- S9 Engine constants (spec 3.1, 3.2): All values sit in `lib/engine/constants.ts`, marked `[estimated]` calibration knobs.
  - Budget starts at 100 and drains per minute by k·max(0, r − 0.8), where r = effective WBGT ÷ the NIOSH limit (RAL if unacclimatised, else REL).
  - Rest in shade recovers +2 per minute.
  - Levels: >75 → 0, 50–75 → 1, 30–50 → 2, 15–30 → 3, <15 → 4.
  - The next day starts at 100 − 0.3 × yesterday's deficit, plus a further 10 off if the worker reports poor sleep.
  - Acclimatisation follows NIOSH 2016: a new worker ramps 20 % a day over 5 days. A returning worker away ≥ 7 days ramps 50/60/80/100 % over 4 days.
- S10 Midday ban (spec 3.4): From 15 Jun to 15 Sep, the planner schedules no sun-exposed tasks of any kind between 12:30 and 15:00.
- S11 Task model (spec 3.5): `Task {id, crewId, name, durationMin, metabolicClass: 'light'|'moderate'|'heavy'|'veryHeavy', sun: boolean, earliest, latest}`. Budget is per worker; the planner schedules against the crew's lowest-budget member (spec 2.6).
- S12 Offline shell and replay data (spec 2.9, 3.11, 5.5):
  - The 15 Jul 2026 replay day is bundled as static JSON (it is also the test fixture), so replay works offline.
  - The service worker precaches /worker, /supervisor and /evidence on install, and runtime-caches `/_next/static/*` cache-first.
  - Offline behaviour is tested on the deployed build.
- S13 Screen-off alerts (spec 5.3, 5.7): A "Start shift" tap unlocks audio and vibration and offers an opt-in Screen Wake Lock. The limits are stated honestly in the UI and the pitch: alerts are unreliable with the screen off, and iOS has no vibration. The buddy system covers that gap. Phone OS is a fairness group in S7.
- S14 Storage (spec 2.1): Upstash Redis via the Vercel Marketplace. Each worker has one key `status:{siteId}:{workerId}` with a 24 h TTL. The supervisor GET reads that crew's keys. This replaces "add shared storage only if needed". Verify: API tests use an in-memory adapter with the same interface.
- S15 Contract ownership (spec 3.12): Only the builder edits `lib/types.ts`. v0 and Antigravity treat it as read-only input.
- S16 Day plan (spec 5.1), replacing the Implementation plan's day table:
  - Sat 14: repo, `lib/types.ts`, fixtures (15 Jul replay, Nov live), `constants.ts`.
  - Sun 15: engine (wbgt, limits, budget, acclim, risk with fallbacks) and its tests.
  - Mon 16: worker PWA via v0, with E7 check-in, E11 vibration, S1 consent, S6 languages, S13.
  - Tue 17: supervisor board via v0, with planner, E1/E2/S8 clock and scenario, API, S14, reduced E6.
  - Wed 18: simulator and evidence page (S7).
  - Thu 19: service worker and offline test on the deployed build (S12), polish, demo script.
  - Fri 20: deck and video, submit. If late, cut first S6 voice for bn/ml, then E11.
- E1 verify profiles (spec 3.10): Replay uses an unacclimatised day-1 worker on heavy work in coveralls, who must reach ≥2 by 11:00. The November live fixture uses an acclimatised worker on moderate work in standard clothing, who must stay ≤1. If the physics disagrees, change the claim, not the constants.
- S17 Status payload, replacing S1's key list (spec2 2.2, 2.3, 1.1): The phone posts `{workerId, level, simTs, lowBattery}` only. There is no `action` and no `unwell`; the board renders a generic action from the level. The S1 key test asserts exactly these 4 keys.
- S18 Activity input (spec2 1.2, 1.3): The worker card has 4 big activity icons: Rest-in-shade, Light, Moderate, Heavy. The default is the class of the scheduled task, which the phone gets by re-running the planner deterministically from session data. Rest-in-shade is the only state that recovers budget.
- S19 Level stability (spec2 1.3, 2.9):
  - Bands are half-open: [75,100] → 0, [50,75) → 1, [30,50) → 2, [15,30) → 3, [0,15) → 4.
  - A level rises at once. It falls only after 5 sim-min in the lower band, and only once the budget is 3 points past the boundary.
  - A budget-driven level 4 stays latched until the worker taps "I'm OK, buddy checked" after resting.
  - The phone posts and vibrates only on a level change.
- S20 Unwell clearing (spec2 3.7, 2.9): Unwell cannot be overridden by the supervisor or the engine. "I'm OK, buddy checked" returns the worker to the computed level, but not below 2 for 15 sim-min. Unwell is the only symptom tap. Fasting text for level 0 is "pace yourself, take shade breaks".
- S21 Consent flow, extending S1 (spec2 1.5): The sequence is language picker → consent → check-in. The consent text includes "never used for discipline, never shared with your employer". If the worker declines, alerts run locally and nothing is posted. "Delete my data" clears local storage and calls `DELETE /api/status`, which removes that worker's key.
- S22 Missing carry-over (spec2 1.6): With no carry-over record (new install or after delete), the day starts at budget 70, not 100.
- S23 Planner rules, extending S11 (spec2 1.7, 2.1):
  - `Crew {id, shiftStart, shiftEnd}`.
  - The planner simulates the crew's most vulnerable profile from site data (fewest acclimatisation days, highest clothing adjustment); it never uses live budgets.
  - Tasks it cannot place are listed as "unscheduled".
  - "Planner off" means tasks in their given order from shift start, with the midday ban still enforced.
- S24 Queue rules, extending S3 (spec2 1.8): The queue keeps only the latest status per worker. The server drops any status whose `simTs` is older than the stored one. Retries run on `online` and on every heartbeat.
- S25 Catch-up (spec2 1.9): On `visibilitychange` or resume, the engine steps from the last `simTs` to now in 1 sim-minute steps before rendering.
- S26 Access (spec2 1.10):
  - Every route needs an unguessable site token from the session URL.
  - Worker IDs are pseudonymous (e.g. `W-7F3A`). Display names live only in token-protected site data.
  - Production hosting would be in the UAE (e.g. Azure UAE North). The demo stores no health data: level only, pseudonymous.
- S27 Acclimatisation and limits, replacing core feature 1's "7–14 day ramp" and S9's binary RAL/REL (spec2 2.4, 2.5): limit = RAL + ramp% × (REL − RAL). The ramp% is NIOSH's 20 %/day for new workers, or 50/60/80/100 % for workers returning after ≥ 7 days away.
- S28 Skipped check-in, replacing S5's skip rule (spec2 2.6): A skipped check-in counts as poor sleep plus urine colour 8. Unwell stays "unknown", never "yes".
- S29 Session URL, replacing S8's storage of scenario and clock (spec2 2.7, 3.2, 4.2): scenario, clock `{wallStart, simStart, multiplier}`, site token and the per-crew "fasting-safe windows" toggle travel in the session URL. The supervisor screen shows it as a QR code. `GET /api/site/:id` drops scenario, clock and fasting.
  - The multiplier is fixed per session, and the engine step is 1 sim-minute.
  - Heartbeat and staleness run on wall-clock time: 5 min live, 15 s in time-lapse. Heart-rate age is measured in sim time.
  - S2's `fastingMembers` count is removed. The worker's own fasting toggle stays on the phone.
- S30 HR rule replacing ECTemp, cutting `ectemp.ts` to TODOS (spec2 3.5, 4.1, 2.8):
  - Tier 2: HR > 0.85 × (220 − age) sustained for 5 sim-min → level at least 2.
  - "Watch: off" means no Tier 2 and no penalty.
  - "Watch: drop" means a sensor failure. Drop Tier 2 and apply the unacclimatised limit until the watch returns.
  - Stale HR never discards Tier 1.
- S31 Constants, extending S9 (spec2 3.1), all `[estimated]`:
  - k = 5.
  - Fasting drain ×1.25.
  - Metabolic rate: light 180, moderate 300, heavy 415, veryHeavy 520 W.
  - Clothing adjustment (ACGIH): work clothes 0, cloth coveralls 0, double-layer woven +3, polyolefin coveralls +1, hood +1.
  - Urine colour: 1–3 → 0; 4–5 → −5 start budget; 6–8 → −15 start budget and level at least 1.
  - Deficit = 100 − end-of-shift budget.
  - Wind: u2 = 0.75 × u10.
  - The E1 replay profile wears double-layer woven coveralls (+3).
- S32 Ack, extending E6 (spec2 3.3): The status is a Redis hash with fields `level`, `simTs`, `receivedAt` (stamped by the server), `ackTs` and `levelSince`. The ack window runs from `receivedAt` of the ≥3 transition. A level increase clears `ackTs`. A worker POST updates fields and never erases `ackTs` except by that rule.
- S33 Stale display, replacing S3's grey (spec2 1.4, 1.1): A stale worker shows the last level, faded, with a "stale" badge. Stale at level ≥2 also raises "ack overdue". `lowBattery` shows a "buddy check" prompt.
- S34 Low battery (spec2 1.1, 4.4): Where `navigator.getBattery` exists, below 20 % the app releases the Wake Lock and posts a final status with `lowBattery: true`. Where it doesn't exist, this is stated as a limitation.
- S35 Evidence metrics, extending S7 (spec2 3.4, 4.3):
  - Unit: worker-day.
  - Sensitivity = truth-event days with a level ≥2 alert at or before the event, divided by all truth-event days.
  - False-alarm rate = alerted days with no truth event, divided by all non-event days.
  - Detection runs open-loop: alerts don't change the truth model. The planner metric runs closed-loop.
  - B0 has no alerts and is reported as a reference.
  - Truth model:
    - sweat capacity ~ N(1.0, 0.15)
    - −0.5 % per year of age over 40
    - fasting −10 % fluid
    - +2.5 % per acclimatisation day, up to +25 %
    - PPE adds its clothing adjustment
  - Weather: 13–17 Jul 2026 from the Open-Meteo archive, bundled.
  - A group with fewer than 30 events is reported as "insufficient".
  - The ≤ 10 pp gap applies to both sensitivity and false alarms.
  - The phone-OS group is dropped; alert delivery is a stated limitation.
- S36 Weather fetch (spec2 3.6): The client fetches Open-Meteo directly at session start. Supervisor and workers use the same hourly snapshot. Antigravity owns `lib/weather.ts`, which fetches and parses; no API route is needed. "Stale" means there is no forecast row for the current hour. Replay is exempt.
- S37 Service worker, replacing S12's precache detail (spec2 5.4):
  - Page loads are network-first with a cache fallback.
  - On install it warms /worker, /supervisor and /evidence, plus the chunks referenced in their HTML.
  - The cache is versioned per build, and offline navigation uses full-page links.
- S38 Demo crew (spec2 5.8): The supervisor page runs simulated crew-mates client-side and posts their statuses with `demo: true`, so the board is never empty.
- S39 Day plan, replacing S16 (spec2 5.1–5.3, 5.5–5.7):
  - Sat 14:
    - GitHub repo and Vercel skeleton deploy
    - Upstash
    - `lib/types.ts`
    - fixtures (5 July days + Nov live)
    - `constants.ts`
  - Sun 15:
    - engine: `wbgt` with reference test vectors, `limits`, `budget`, `acclim`, `risk`, `planner`
    - API routes with the in-memory adapter
    - tests
  - Mon 16: worker PWA via v0, built from the GitHub repo or pasted types, with `t(key)` strings and logical CSS for RTL. Covers S21, E7, S18, S19, S24, S25, S34, S13, E11 and S6.
  - Tue 17: supervisor board via v0, covering S29 QR session, S33, S32 ack badge, S23 planner view and S38 demo crew.
  - Wed 18: simulator and evidence page (S35).
  - Thu 19: S37 service worker, offline test on the deployed build, polish, demo script.
  - Fri 20: deck and video, submit.
  - Cut order if late: S30 HR rule, then planner fasting windows, then the E6 badge.
- S40 Worker identity (spec3 C1.1): After the language picker, the worker picks their name from the site roster. The pseudonymous ID is stored on the phone, and "Delete my data" clears it. The QR code holds only the site token and session.
- S41 Rest safety (spec3 C1.2):
  - Rest-in-shade reverts to the scheduled task class after 15 sim-min.
  - S25 catch-up always uses the scheduled class, never Rest.
  - No engine steps run outside the crew's shift window.
  - Budget is capped at 100.
- S42 Offline cold start (spec3 C1.3):
  - Each session's site data and forecast snapshot are saved in localStorage, and the app boots from them when offline.
  - If nothing is stored, it runs Tier 0 at worst values: July climatology, unacclimatised. It shows the 998 call button.
  - Session parameters go in the URL `#fragment`, so the cached /worker page matches.
- S43 Session isolation (spec3 Co2.1):
  - `sessionId` (= `wallStart`) travels in the fragment and in an `X-Session` header, so the S17 body stays at 4 keys.
  - The Redis hash stores `sessionId`. A new session ID overwrites the hash and clears `ackTs`.
  - The board shows only its own session.
  - The phone resets engine state per session. Carry-over applies only to consecutive Live sessions.
  - Replay always starts at budget 100, so rehearsals repeat exactly.
- S44 Forecast staleness (spec3 Co2.2): S36's rule replaces S5's ">6 h" forecast rule. S5's stale-HR clause now reads "drop Tier 2", matching S30.
- S45 Site time (spec3 Cl3.1): Site time is Asia/Dubai, fixed UTC+4, no DST. `simTs` is epoch ms. Open-Meteo is fetched with `timezone=GMT`. One `toSiteTime` (+4 h) helper in `lib/engine` handles every local-time rule, and nothing uses device-local `Date` getters. Verify: tests pass with `TZ=UTC` and `TZ=America/New_York`.
- S46 Polish from spec pass 3 (minor items):
  - No status key (not started, declined consent or deleted) shows one neutral "no data" state on the board.
  - After low battery, the phone keeps posting level changes and only releases the Wake Lock.
  - S38's demo crew-mates are drawn on the board client-side with no POST. This replaces S38's `demo: true` posting.
  - Ack:
    - Any overdue badge can be acked.
    - `POST /api/ack` carries the acked level and is ignored if the level has since risen.
    - `levelSince` = server wall time of the POST that changed the level, and the ack window runs from `levelSince`.
    - The GET response returns the server's `now`.
  - Board staleness = 2 missed heartbeats (10 min live, 30 s time-lapse). The board polls only while the tab is visible and inside the shift, with one pipelined MGET per poll.
  - Effect of the crew fasting toggle on the planner: the vulnerable profile gets ×1.25 drain, heavy tasks go earliest after `shiftStart`, and any task predicted at level ≥3 goes to unscheduled. There is no Fajr/Maghrib table: fasting is assumed for the whole daylight shift.
  - Planner behaviour (replaces S11's "lowest-budget member" wording):
    - It simulates a composite vulnerable profile (lowest ramp %, highest clothing adjustment) and runs the crew's tasks one at a time.
    - It inserts a 15-min shade rest when the predicted level reaches 2.
  - Level composition in `risk.ts`: `unwell ? 4 : max(hysteresis(budget), latch4, urineFloor, hrFloor, postUnwellFloor)`.
  - Sun-free tasks (`sun:false`) use WBGT with solar = 0. `veryHeavy` maps to the Heavy icon.
  - Session start: the supervisor sets `wallStart = now + 30 s` countdown. A phone joining after `simStart` starts its budget at join time.
  - Simulator:
    - Compliance rule: rest 15 min at level ≥2, light task at level 3, stop at level 4.
    - The engine sees Tier 0+1, with the check-in sampled from truth hydration and no HR.
    - Open-loop runs use the planner-off schedule.
    - Report truth events with the planner on and off.
    - A false-alarm rate needs ≥30 non-event days.
    - Hourly WBGT is precomputed into the bundled weather as shared input. "No shared code" applies to physiology code.
    - The pitch says the evidence does not validate the WBGT model itself.
    - Calibrate k and the thresholds on seed 7 with 18 Jul weather, then freeze the truth model before running seed 42.
  - Service worker: registered as `/sw.js?v=<VERCEL_GIT_COMMIT_SHA>` with that as the cache name. Runtime cache-first for `/_next/static/*` is kept.
  - WBGT reference vectors come from the HeatStress R `wbgt.Liljegren` run on the fixture rows. If WBGT isn't validated by Sunday night, fall back to Open-Meteo `wet_bulb_temperature_2m` plus the Bernard globe approximation, as a `ponytail:` comment.
  - Honesty wording:
    - S27's mapping is marked `[estimated]`, as a HeatShield assumption.
    - Storage is described as "only a pseudonymous derived risk level, 24 h TTL".
    - Consent copy says "your answers never leave this phone; your supervisor sees only your alert colour, to send help".
    - Pitch copy says leave-return starts "a re-acclimatisation ramp".
    - Translations are machine-made and unreviewed, with a native-speaker check for ar and ur.
  - Cut order if late, replacing S39's: bn/ml voice, E11, S34, S30, fasting planner rule, E6 badge.
- Retained source requirements: every core feature, baseline rule, architecture module, alert level and honesty note in the Implementation plan is unchanged except where S16/S39 replace the day table, R1/S17/S21 the route list and payload, S27 the acclimatisation ramp, S29 the scenario/clock storage, S30 removes `ectemp.ts`, and S44/S46 replace the S5/S11/S38 wording noted there.
- S47 Go/no-go checkpoints (voice C1): Deploy to Vercel daily. Each check is at 22:00:
  - Sun: if engine tests are not green, use the WBGT approximation.
  - Mon: if the worker card does not work on a real phone at the deployed URL, cut to en+ar+hi and drop S13 Wake Lock, S34 and E11.
  - Tue: if the phone→board sync fails, demo with the client-side crew only.
  - Wed: if fairness results are unstable, ship sensitivity, lead time and the planner metric only.
- S48 Effective spec and client glue (voice C2):
  - After the gate, `SPEC.md` is compiled: current rules only, one section per module, superseded text deleted. It is the only handoff to v0 and Antigravity, together with `lib/types.ts`.
  - The builder owns `lib/client/session.ts`: clock loop, S25 catch-up, S24 queue and heartbeat, S42 localStorage boot, S29/S43 fragment and `X-Session`, Wake Lock, battery, service-worker registration. It is written Monday morning, before v0 UI is wired.
- S49 Demo-first (voice H1): Today, write a 3-minute demo script and tag every S-item as on-camera, rule/security, or invisible. Invisible items are built only if a rule or security needs them; S26 tokens stay.
- S50 Evidence honesty (voice H2):
  - The headline claim becomes "illustrates how much a generic threshold misses if acclimatisation matters as much as NIOSH says".
  - Add one robustness chart that sweeps the truth-model acclimatisation and fasting effect sizes from 0 to 2× and shows where the advantage disappears.
  - If seed 7 gives fewer than 30 events per group, raise the population (e.g. 2000 × 5).
  - A failed fairness test is shown openly, together with its fix.
- S51 One-click demo (voice H5): A `/` landing page has one button, "Run the 15 July demo". It creates a Replay session at 240x and opens the worker and supervisor views side by side in one window, with no phone or QR. Replay is the default scenario.
- S52 WBGT order (voice M2): Ship Open-Meteo `wet_bulb_temperature_2m` plus the Bernard globe approximation first. Liljegren is a Wednesday stretch goal, which removes it from Sunday's critical path.
- S53 Pitch content (voice H6, M1, M5): The deck maps each pillar to the judging rubric and includes:
  - a comparison slide (OSHA-NIOSH Heat Safety Tool, Kenzen, SlateSafety, prior work from the EU HEAT-SHIELD project)
  - who pays (contractor HSE teams under the MoHRE midday rule)
  - why supervisors adopt it (fewer stoppages)
  - why a deterministic, explainable engine suits safety alerts
  - Web Push on the roadmap.
<!-- /autoplan-accepted:ceo -->


**Step 0.5 dual voices.**
- Claude CEO subagent: completed on snapshot `f2ca0d13…`. It reported 2 Critical, 6 High and 5 Medium findings.
- Codex: unavailable (`not_authed`), so the review is tagged `[subagent-only]`.

Disposition of the voice findings:
- C1 → S47.
- C2 → S48.
- H1 → S49.
- H2 → S50.
- H5 → S51.
- M2 → S52.
- H6, M1 and M5 → S53, as pitch content.
- M4 Web Push → TODOS.
- H3 (fasting reframe) → User Challenge UC1, which it confirms.
- H4 (lead with returning worker + planner) → User Challenge UC2.
- M1 rename → User Challenge UC3.
- M3 (bundled voice clips) → taste decision T-voice. It disagrees with decision 13.
- H6 also adds a NEEDS_CONTEXT question for the gate: judging format/rubric and whether phones are allowed on site.

```
CEO DUAL VOICES — CONSENSUS TABLE: [subagent-only]
  Dimension                             Claude                     Codex  Consensus
  1. Premises valid?                    no: Ramadan, rubric, phones N/A    N/A
  2. Right problem to solve?            yes, but lead w/ new-arrival N/A   N/A
  3. Scope calibration correct?         no: too much for 6 days    N/A    N/A
  4. Alternatives sufficiently explored?no: approx WBGT, clips, push N/A  N/A
  5. Competitive/market risks covered?  no: competitors, name clash N/A   N/A
  6. 6-month trajectory sound?          risk: demo stutters        N/A    N/A
Outside voice unavailable: all Consensus cells N/A, never CONFIRMED.
Single-voice criticals flagged: C1 (schedule), C2 (spec chain).
```

**Current scope (for Sections 1–11):**
- Mode: SELECTIVE EXPANSION.
- Accepted: E1, E2, E7, E11, E6-reduced, R1, S1–S53.
- Deferred: E3, E4, E10, ECTemp, Web Push.
- Skipped: E9.
- Pending at the gate: UC1, UC2, UC3, T-voice, NEEDS_CONTEXT-rubric.

#### Section 1: Architecture Review
```
 [Worker phone PWA]                                   [Supervisor screen]
  app/worker (v0 UI)                                  app/supervisor (v0 UI)
    └─ lib/client/session.ts  (builder-owned, S48) ◄── QR / #fragment (S29,S43) ──┐
         ├─ lib/engine/* (pure TS: wbgt, limits,          ├─ lib/engine/planner (vulnerable profile, S23/S46)
         │   budget, acclim, risk, planner, siteTime)     ├─ demo crew-mates drawn client-side (S46)
         ├─ lib/weather.ts → Open-Meteo (S36, GMT)        └─ poll GET /api/crew/:id/status (MGET, visible+in-shift)
         ├─ localStorage: site, forecast, carry-over, workerId (S42)
         └─ latest-only queue → POST / DELETE /api/status ─┐        POST /api/ack ─┐
                                                           ▼                       ▼
                                   app/api/* (Antigravity) ── token check (S26) ── Upstash Redis
                                                               hash status:{site}:{worker}, 24 h TTL (S14/S32/S43)
 [/ landing] one-click Replay demo, side-by-side views (S51)
 [Evidence]  app/evidence → lib/engine/sim (open-loop detect, closed-loop planner) ← bundled 13–17 Jul weather + precomputed WBGT
```
**Data flow: worker status (4 paths)**
- Happy: level change → queue → POST with `X-Session`. The server stamps `receivedAt` and `levelSince`, and the board's MGET shows it.
- Nil: there is no session or consent was declined. Nothing is posted, alerts run locally only, and the board shows "no data" (S21/S46).
- Empty: no forecast row → S42/S36 worst-case July climatology → level computed conservatively.
- Error: network or 5xx → kept in the queue as the latest only, retried on `online` and on the heartbeat. A board-side stale badge appears after 2 missed heartbeats (S24/S33).

**State machine: worker level (engine)**
```
            budget band rises            unwell tap
  L0 ⇄ L1 ⇄ L2 ⇄ L3 ──budget<15──► L4(latched) ◄──────── any level
     falls only after 5 sim-min + 3-pt hysteresis      │
  L4(latched) ──"I'm OK, buddy checked" after rest──► computed level, floor 2 for 15 sim-min
  INVALID: supervisor → any clear (no control exists); engine → clear unwell (only worker tap)
```

**Findings**
- WARNING A1: the site token in the QR lets anyone holding it post a status for any worker ID, so statuses can be spoofed.
  - Accepted risk for the demo: the data is pseudonymous and there is no discipline path.
  - Production needs per-worker tokens. Logged in NOT in scope.
- WARNING A2: `lib/client/session.ts` is the single point of integration failure; S48 assigns it an owner.

Coupling: v0 UI ↔ `lib/types.ts` + `session.ts` only. Antigravity ↔ `lib/engine` + `app/api` only. Rollback: Vercel "promote previous deployment" takes under 1 min. The service worker is versioned per commit (S46), so a rollback also rolls back the cache. No status or meta artifact without a consumer was added.

#### Section 2: Error & Rescue Map
```
  METHOD/CODEPATH              | WHAT CAN GO WRONG                  | CLASS
  -----------------------------|------------------------------------|----------------
  weather.fetchForecast        | offline / timeout / 429            | FetchError
                               | missing hour row                   | StaleForecast
  session.bootFromFragment     | bad/missing fragment               | SessionParseError
  session.queue.flush          | offline / 5xx / 401 bad token      | PostError
  api POST /status             | stale simTs / wrong session        | RejectedStale
                               | invalid workerId format            | ValidationError
  api GET /crew/:id/status     | Redis down / quota hit             | StoreError
  engine.wbgt                  | NaN from bad input (RH>100, SW<0)  | InputRangeError
  sim.run                      | <30 events in group                | InsufficientData

  CLASS             | RESCUED? | RESCUE ACTION                              | USER SEES
  ------------------|----------|--------------------------------------------|------------------------------
  FetchError        | Y        | use stored snapshot, else climatology (S42)| chip "offline forecast"
  StaleForecast     | Y        | climatology for missing hours (S36)        | chip "estimated weather"
  SessionParseError | Y        | redirect to / landing (S51)                | "Join with the QR from your supervisor"
  PostError (net)   | Y        | keep latest in queue, retry (S24)          | small "not synced" dot
  PostError (401)   | Y        | stop posting, keep local alerts            | "session expired: rescan QR"
  RejectedStale     | Y        | 409, client drops queued item              | nothing (expected)
  ValidationError   | Y        | 400 with field name, logged                | nothing (bug path)
  StoreError        | Y        | board shows "server unavailable" banner, last data faded | banner
  InputRangeError   | Y        | clamp inputs, log once; worst value if clamping fails     | nothing
  InsufficientData  | Y        | cell rendered "insufficient (n<30)" (S35)  | evidence page label
```
No catch-alls. Each rescue is visible: a chip, a dot, a banner or a label. There are no GAPs after S36, S42 and S46.

#### Section 3: Security & Threat Model
| Threat | Likelihood | Impact | Mitigated? |
|---|---|---|---|
| Spoofed status posts with a leaked QR token | Med | Low (pseudonymous, no discipline) | Partly; per-worker token deferred |
| Roster names exposed via GET site | Low | Med | Yes: token required (S26) |
| Redis key injection through workerId | Low | Med | Yes: validate `^W-[0-9A-F]{4}$` and siteId format before building keys |
| XSS via display names | Low | Med | Yes: React escapes; no `dangerouslySetInnerHTML` |
| Free-tier quota exhaustion (poll storm) | Med | Med | Yes: visible-only polling + MGET (S46) |
| Health data offshore (UAE Law 2/2019) | Low | High | Yes: only a derived level is stored, 24 h TTL (S17/S26) |
| v0 key leak | Low | Med | Yes: `.env.local` gitignored; never sent to the client bundle |

There are two new secrets, the Upstash URL/token and the v0 key, both in env vars and rotatable. There are no new npm packages beyond Next, Recharts and `@upstash/redis`. **WARNING S1:** validate every route input at the boundary, with explicit 400s. This is added to the eng-phase scope.

#### Section 4: Data Flow & Interaction Edge Cases
```
INPUT(level change) → VALIDATE(id, level 0–4, simTs int) → TRANSFORM(stamp receivedAt/levelSince) → PERSIST(HSET + EXPIRE 24h) → OUTPUT(board MGET)
 shadow: nil body→400 | level 7→400 | Redis timeout→503, client keeps queue | older simTs→409 | other sessionId→overwrite (S43)
```
**Async ordering:** a worker POST and a supervisor ACK race on the same hash. The invariant is that an ack never clears a newer, higher level.
- Order A: ACK(level 3) is applied, then POST(level 4) → `levelSince` is updated and `ackTs` cleared (S32). OK.
- Order B: POST(level 4) is applied, then ACK(level 3) → ignored, because the acked level < the current level (S46). OK.
- Mechanism: a server-side compare in one Lua/`WATCH` transaction, or an `HGET` + `HSET` check. That leaves a small window, so the **eng phase must choose an atomic option**. Regression proof: a test with both orders using a controlled adapter.

| Interaction | Edge case | Handled? | How |
|---|---|---|---|
| Unwell tap | double tap | Y | idempotent: already L4 |
| Ack button | double click / stale board | Y | level compare (S46) |
| Join session | late joiner | Y | budget starts at join (S46) |
| Navigate away / screen off | timers paused | Y | catch-up (S25/S41) |
| Delete my data | offline | **GAP→fix** | queue the DELETE like a status; local wipe is immediate |
| Language switch mid-shift | RTL flip | Y | `dir` on `<html>`, logical CSS (S39) |
| Crew with 0 workers | empty board | Y | demo crew (S46) or "no data" |

The DELETE-offline gap is fixed by queueing the DELETE (recorded as an S-polish item in the eng phase).

#### Section 5: Code Quality Review
`risk.ts` level composition is the highest-branching function. S46 fixes its form as a `max()` of floors, which keeps it under 5 branches. The file count is about 16 source files: engine 7, client 2, api 4, pages 4 (incl. landing). Each file has one purpose, and no abstraction has a single implementation except the Redis/in-memory adapter interface, which tests need. Risk of over-engineering: the 46-item amendment chain itself. S48's effective spec removes it before any code exists. Duplicated behaviour: none planned; the planner is shared by phone and board (R1). All constants sit in one file (S9/S31).

#### Section 6: Test Review
```
NEW THING                         | TYPE        | HAPPY                          | FAILURE                         | EDGE
----------------------------------|-------------|--------------------------------|---------------------------------|------------------------------
wbgt (approx, then Liljegren)     | unit        | fixture row → expected ±0.5 °C | NaN input → clamped             | night (SW=0), sun:false
limits (RAL/REL + ramp)           | unit        | M=415 → NIOSH values           | unknown clothing → worst CAF    | day 0 / day 5 / away 7d
budget + hysteresis + latch       | unit        | drain/recover per minute       | level flaps → held 5 sim-min    | band edges 75/50/30/15
risk composition                  | unit        | max of floors                  | unwell → 4 regardless           | skip check-in ≠ unwell
planner                           | unit        | heavy → coolest allowed slot   | unplaceable → unscheduled       | midday ban, fasting crew
siteTime                          | unit        | 06:00 site = 02:00Z            | TZ=UTC and TZ=America/New_York  | date rollover at midnight
session queue                     | unit        | latest-only flush              | 401 → stop posting              | offline → online replay
api status/ack (in-memory adapter)| integration | POST→GET round trip            | 400 / 409 / 503 paths           | ack vs post both orders
sim                               | unit        | seed 42 deterministic          | <30 events → insufficient       | robustness sweep 0–2×
SW offline                        | manual E2E  | deployed build offline boot    | redeploy → new cache            | no stored session → Tier 0
one-click demo (S51)              | manual E2E  | 2-min replay shows L0→L3       | —                               | 240x clock drift
```
- 2am-Friday test: replay 15 Jul at 240x on the deployed URL in airplane mode after first load.
- Hostile QA: post a level 4, then an ack for level 3, then a level 2, and check the board ordering.
- Chaos: kill Redis mid-demo; the board must show the banner while phones keep alerting.

Flakiness: wall-clock tests use an injected clock, and the sim uses a seeded PRNG. The pyramid is unit-heavy. No LLM or prompt code is involved.

#### Section 7: Performance Review
- Sim: 200 workers × 5 days × 480 min ≈ 480k engine steps, under 1 s in the browser. At 2000 workers that is about 5 s, so it runs in a Web Worker or with a progress bar.
- Board: one MGET per poll for about 10 keys. At 1 s polling over a 2-min demo that is about 120 Redis commands, well inside the free tier [estimated; check the current Upstash free-tier quota on Sat].
- No N+1: one GET per crew.
- Memory: the forecast is 48 hourly rows and the bundled weather is 5 × 24 rows.
- Slowest paths: the sim run, ~1–5 s; Liljegren per row if adopted (iterative, ~0.1 ms × 120 rows); first offline boot, which is SW cache-bound.

#### Section 8: Observability & Debuggability Review
- API routes log one structured line per request: `{route, siteId, workerIdHash, status, ms}`. There is no PII and no level history beyond the 24 h key.
- Debug aid on the board: "last seen", the stale badge and a "server unavailable" banner.
- Debug aid on the phone: a hidden `?debug` panel showing tiers, budget, queue length and forecast age, to reconstruct a bug report.
- Vercel runtime logs are the only server telemetry, with no dashboard and no alerts. That is acceptable for a 6-day demo, and its absence is listed in NOT in scope.
- Runbook for the main demo failure (Redis down): the board shows the banner, so switch to the one-click demo (S51), which needs no server.

#### Section 9: Deployment & Rollout Review
- There are no DB migrations. Redis keys are self-describing with a 24 h TTL.
- Rollout: a Vercel preview per push and a production promote each evening (S47).
- Rollback: promote the previous deployment. The versioned SW (S46) refetches.
- Deploy-window risk: an old SW serving new HTML. Mitigation: page loads are network-first (S37).
- Post-deploy checks:
  1. `/` one-click demo reaches L3 at 240x.
  2. `GET /api/crew/x/status` without a token → 401.
  3. Airplane-mode reload of /worker works.
- No feature flags beyond the session scenario.

#### Section 10: Long-Term Trajectory Review
- Reversibility 4/5. Everything is a pure engine plus thin storage, and the riskiest choices (Upstash, the approximate WBGT) are swappable behind one module each.
- Debt:
  - the amendment chain (fixed by S48)
  - machine translations (stated)
  - the estimated constants (marked as knobs)
  - per-worker tokens (deferred).
- Path to the 12-month ideal: TODOS E3 (SMS) → E4 (real straps) → ECTemp → E10 (DoH feed) builds on the same engine and status contract.
- Platform potential: the engine and planner could serve a DoH-facing aggregate API.
- Cherry-pick retrospective: E1 (replay) and S51 (one-click demo) are essential to the demo. E6 is the first cut.

#### Section 11: Design & UX Review
Information architecture for the worker:
1. A single colour card showing level and action icon.
2. A budget bar.
3. Activity icons.
4. An unwell button, always visible.

For the supervisor: a crew grid of colour tiles with badges, the planner timeline, and the session QR.
```
FEATURE        | LOADING            | EMPTY                 | ERROR                    | SUCCESS        | PARTIAL
worker card    | skeleton w/ last L | "Join with QR"        | offline chip, still runs | colour + icon  | tier chips missing
board tile     | spinner 1st poll   | "no data" (neutral)   | banner, faded last data  | colour + badge | stale badge
planner        | —                  | "no tasks"            | unscheduled list         | timeline       | some unscheduled
evidence       | progress bar       | —                     | "insufficient (n<30)"    | charts         | sweep only
```
```
/ landing ─► [Run 15 Jul demo] ─► split view (worker | supervisor) at 240x
QR ─► language ─► consent ─(decline)─► local-only card
                       └─(accept)─► pick name ─► check-in ─► Start shift (unlock audio) ─► live card ⇄ activity icons
live card ─► unwell ─► L4 lock + 998/medic ─► "I'm OK, buddy checked" ─► card (floor 2)
```
AI-slop risk: v0 defaults (gradient hero, generic cards). The `ui-ux-pro-max` rules plus the design phase must set high-contrast safety colours, large touch targets (≥48 px), and icons over text. Accessibility: colour is never the only signal (icon + vibration + voice). Mobile-first. **Phase 2 design review runs next.**

**NOT in scope**
- Deferred to TODOS.md:
  - E3 SMS/WhatsApp
  - E4 BLE straps
  - E10 DoH feed
  - ECTemp Kalman
  - Web Push (voice M4)
- Rejected:
  - E9 Azure hosting (Vercel simpler)
  - per-worker auth tokens (demo risk accepted, A1)
  - server dashboards and alerting (Vercel logs suffice for a demo)
  - pre-recorded voice clips (pending the T-voice gate)

**What already exists**
- No repo code.
- Reused: Open-Meteo forecast + archive (probed); NIOSH formulas; HeatStress R Liljegren as a reference only; shadcn/21st.dev components via v0; the `ui-ux-pro-max` skill; Vercel and Upstash managed services.

**Dream state delta**
After 20 Nov the plan delivers a credible, privacy-first demo of personal heat budgeting with leave-return acclimatisation, a planner and honest simulated evidence. The gap to the 12-month ideal is real-world validation: real straps, a clinic-outcome comparison, SMS delivery, the DoH aggregate feed and per-worker auth.

**Failure Modes Registry**
```
  CODEPATH            | FAILURE MODE                 | RESCUED? | TEST? | USER SEES?            | LOGGED?
  --------------------|------------------------------|----------|-------|-----------------------|--------
  weather fetch       | offline at cold start        | Y        | Y     | offline chip          | N (client)
  session boot        | no fragment                  | Y        | Y     | landing redirect      | N
  status POST         | network down                 | Y        | Y     | not-synced dot        | N
  status/ack race     | ack clears newer level       | Y*       | Y     | correct badge         | Y
  Redis               | down / quota                 | Y        | Y(chaos)| banner              | Y
  SW                  | stale cache after deploy     | Y        | manual| fresh page            | N
  timers              | screen off                   | Y        | Y     | caught-up card        | N
  delete my data      | offline                      | Y (fix)  | Y     | local wiped instantly | N
  sim                 | thin groups                  | Y        | Y     | "insufficient" label  | N
```
*Needs an atomic implementation (eng phase). **CRITICAL GAPS: 0.** No row is unrescued, untested and silent.

**Implementation Tasks (CEO)**
- [ ] **T1 (P1, human ~2h / CC ~15min)**: spec. Compile `SPEC.md`, the effective spec (S48).
  - Surfaced by: voice C2.
  - Files: SPEC.md.
  - Verify: no "replacing" chains remain, and each module has one section.
- [ ] **T2 (P1, human ~1h / CC ~10min)**: demo. Write the 3-minute demo script and tag the S-items (S49).
  - Surfaced by: voice H1.
  - Files: DEMO.md.
  - Verify: every S-item is tagged.
- [ ] **T3 (P1, human ~3h / CC ~30min)**: infra. GitHub repo, Vercel skeleton deploy and Upstash (S39), with the user's go-ahead.
  - Surfaced by: spec2 5.3.
  - Files: to be determined.
  - Verify: the deployed URL returns 200.
- [ ] **T4 (P1, human ~4h / CC ~40min)**: engine. WBGT approximation first, Liljegren as stretch (S52).
  - Surfaced by: voice M2.
  - Files: lib/engine/wbgt.ts.
  - Verify: fixture rows within ±0.5 °C of Open-Meteo wet-bulb-derived values.
- [ ] **T5 (P1, human ~4h / CC ~30min)**: api. Atomic status/ack compare.
  - Surfaced by: Section 4.
  - Files: app/api/status, app/api/ack.
  - Verify: both-orders race test.
- [ ] **T6 (P2, human ~1h / CC ~10min)**: client. Queue `DELETE /api/status` while offline.
  - Surfaced by: Section 4.
  - Files: lib/client/session.ts.
  - Verify: offline delete flushes on reconnect.
- [ ] **T7 (P1, human ~3h / CC ~30min)**: landing. One-click Replay split-view demo (S51).
  - Surfaced by: voice H5.
  - Files: app/page.tsx.
  - Verify: reaches L3 within 2 min.
- [ ] **T8 (P2, human ~2h / CC ~20min)**: evidence. Robustness sweep chart (S50).
  - Surfaced by: voice H2.
  - Files: lib/engine/sim.ts, app/evidence.
  - Verify: the chart renders 0–2× effects.

**MEGA PLAN REVIEW: COMPLETION SUMMARY (CEO via /autoplan)**
```
| Mode selected        | SELECTIVE EXPANSION
| System Audit         | greenfield, no git; Open-Meteo + v0 probed OK; Nov demo would be all green
| Step 0               | 8 premises (2 challenged); 10 proposals → 6 accepted, 3 deferred, 1 skipped; spec loop 3×
| Section 1  (Arch)    | 2 warnings (A1 token spoofing accepted, A2 session.ts owner)
| Section 2  (Errors)  | 10 error paths mapped, 0 GAPS
| Section 3  (Security)| 7 threats, 0 High unmitigated; 1 warning (input validation → eng)
| Section 4  (Data/UX) | 7 edge cases, 1 unhandled → fixed (T6); 1 race → eng atomic (T5)
| Section 5  (Quality) | 1 issue (amendment chain → S48)
| Section 6  (Tests)   | diagram produced, 0 gaps
| Section 7  (Perf)    | 1 note (sim in Web Worker at 2000×)
| Section 8  (Observ)  | 1 gap accepted (no alerts; demo scope)
| Section 9  (Deploy)  | 1 risk (stale SW) mitigated
| Section 10 (Future)  | Reversibility 4/5, debt items 4
| Section 11 (Design)  | 1 issue (v0 AI-slop risk → Phase 2)
| NOT in scope         | written (9 items)
| What already exists  | written
| Dream state delta    | written
| Error/rescue registry| 10 rows, 0 CRITICAL GAPS
| Failure modes        | 9 total, 0 CRITICAL GAPS
| TODOS.md updates     | 5 items (E3, E4, E10, ECTemp, Web Push)
| Scope proposals      | 10 proposed, 6 accepted (EXP + SEL)
| CEO plan             | written ~/.gstack/projects/MIcrosoft/ceo-plans/2026-11-14-heatshield.md
| Outside voice        | codex unavailable (not_authed); Claude subagent completed
| Lake Score           | N/A (no coverage-scored questions asked)
| Diagrams produced    | 6 (architecture, data flow, state machine, error flow, user flow, test map)
| Stale diagrams found | 0
| Unresolved decisions | 5 (UC1, UC2, UC3, T-voice, NEEDS_CONTEXT rubric) → Phase 4 gate
| Reality rows         | 7/7 rows, 1 unverified
```
