<!-- Moved verbatim from PLAN.md lines 1-590 on 2026-11-14. -->
> Original plan (14 Nov) with every accepted amendment block (E*, R1, S1–S53, D1–D15, X1–X14, Y1–Y20, Z1–Z17). Superseded by docs/spec/; kept as the audit source.

<!-- /autoplan restore point: "E:\\MIcrosoft\\.gstack\\tmp\\autoplan\\-autoplan-restore-20261114-013317.md" -->
## Implementation plan
# HeatShield — Challenge 07: Climate-Resilient Worker Health

Solo build · submission **Fri 20 Nov 2026** · Next.js + TypeScript · wearable data simulated

## Pitch in one line
A personal **heat budget** for every outdoor worker. It tracks acclimatisation and handles **Ramadan fasting**. It runs offline on a cheap phone. A **shift planner** moves heavy work into cooler hours, and a built-in **simulator** shows it beats generic temperature thresholds.

## Core features (pitch focus)
1. **Heat budget + acclimatisation.** Strain builds up over the shift and carries over to the next day. Returning from home leave resets a worker to "new arrival" with a 7–14 day ramp.
2. **Ramadan fasting mode.** In daylight, "drink water" becomes shade, cooling and a slower pace. The budget drains faster. Heavy tasks move toward Suhoor or after Iftar.
3. **Shift planner.** Uses the forecast WBGT and the task list. Heavy tasks go into the coolest windows, around the midday ban (12:30–15:00, Jun 15–Sep 15) and fasting hours.
4. **Simulator / evidence.** Synthetic crews, our engine vs a generic threshold. Reports lead time, sensitivity, false-alarm rate, and fairness by group (age, acclimatisation, fasting, PPE).

Baseline (required by the rules, not pitch focus):
- Supervisors see actions only, never health data.
- The "I feel unwell" tap cannot be overridden.
- Multilingual, icon-first alerts with voice.
- Offline PWA.
- When a sensor fails, the app assumes worse risk.

## Architecture
```
lib/engine/        pure TS, no deps, runs on phone (offline) AND server
  wbgt.ts          Liljegren outdoor WBGT from forecast (T, RH, wind, solar, pressure, sun angle)
  limits.ts        NIOSH RAL/REL from metabolic rate + PPE clothing adjustment
  budget.ts        heat budget accumulate/recover → level 0–4 → action
  acclim.ts        days-exposed, decay after absence, leave-return reset
  ectemp.ts        Kalman core-temp estimate from heart rate (Buller/Looney) — Tier 2
  risk.ts          combines tiers, confidence, sensor-dropout fallback, Ramadan rules
  planner.ts       greedy: heavy tasks → coolest allowed windows
  sim.ts           synthetic crews + separate "truth" physiology model + metrics
app/worker         PWA: one big colour/icon card, budget bar, voice, unwell button
app/supervisor     crew board (actions only) + shift planner
app/evidence       simulator results, fairness charts
public/sw.js       hand-written service worker: cache shell + today's forecast
```
- Weather: Open-Meteo hourly forecast (free, no key). Cached at shift start.
- Voice: `speechSynthesis` (native). i18n: plain JSON dictionaries.
- Charts: Recharts.
- Data: seeded JSON crews; shared status in Upstash Redis (24 h TTL).

## Build split (decided 14 Nov)
One Next.js + TS repo. Two tools build into it, and they share **one contract file**, `lib/types.ts`, which is written first.
- **v0 → frontend.** Pages and components for `app/worker`, `app/supervisor`, `app/evidence`. v0 builds against `lib/types.ts` and mock JSON, so it never waits on the backend.
- **Antigravity → backend.** `lib/engine/*`, `app/api/*` route handlers, seed data, the Open-Meteo fetch.
- **Engine stays client-runnable.** The worker app imports `lib/engine` directly for offline use. The API only handles shared state.

API (minimal):
| Route | Purpose |
|---|---|
| `GET /api/site/:id` | crews, workers (profile, acclim days), per-crew `fastingMembers` count, tasks, scenario + clock, medic number |
| `POST /api/status` | worker posts `{workerId, level, action, unwell, simTs}`. Actions only, no vitals |
| `GET /api/crew/:id/status` | supervisor board polls every 10 s |
| `POST /api/ack` | supervisor acks a level ≥3 status (`ackTs` on the worker's key) |

## Alert levels
| Level | Colour | Action |
|---|---|---|
| 0 | green | normal, hydrate on schedule |
| 1 | yellow | drink water now (fasting: shade + cooling towel) |
| 2 | orange | rest 15 min in shade |
| 3 | red | cool down + rotate to light task |
| 4 | purple | stop, call medic / buddy |

## Day plan
| Day | Work |
|---|---|
| Fri 13–Sat 14 | Scaffold. `wbgt`, `limits`, `budget` + self-check test |
| Sun 15 | `acclim`, Ramadan rules, `ectemp`, fallback, `risk` |
| Mon 16 | Worker PWA: alert card, languages, voice, offline SW |
| Tue 17 | Supervisor board + shift planner |
| Wed 18 | Simulator + evidence page |
| Thu 19 | Polish, deploy (Vercel), demo script |
| Fri 20 | Pitch deck/video, buffer, **submit** |

## Risks / honesty notes
- The simulator's "truth" model must differ from the engine's model, or the evidence is circular. Say this in the pitch.
- Check ECTemp and WBGT constants against the original papers (Buller 2013, Looney 2018, Liljegren 2008).
- Screening, not diagnosis: level 4 sends the worker to a human medic.

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

<!-- autoplan-accepted:design -->
- D1 Delivery truth (design C1): The worker card always shows one delivery line:
  - "Supervisor sees: <colour> · <n> min ago" once a POST succeeds.
  - "Not sent, no signal" while queued. At level ≥3 the medic and 998 buttons then become the main action.
  - "Not shared (you chose this)" if consent was declined.

  The worker never sees supervisor acks. Verify: a unit test of the line for each of the 3 queue/consent states.
- D2 SCREENS spec (design C2): Add a SCREENS section to `SPEC.md` for / landing, /worker, /supervisor and /evidence. Each screen lists element order, state matrix (Pass 2 table), copy keys (`t(key)`) and token references. v0 prompts use SCREENS and never generate layout on their own. Verify: every v0 prompt cites a SCREENS section, and the review checklist compares the built screen with its element order.
- D3 Level tokens (design H9; exact hex values are taste T-palette): Each level has a full-bleed background with a paired text colour, all at contrast ≥7:1.
  - L0 #0B5E2E with white text
  - L1 #FFD400 with black text
  - L2 #FF8A00 with black text
  - L3 #9E1116 with white text
  - L4 #4A1470 with white text, a diagonal stripe and the word "STOP"

  Each level also has its own number and icon shape: L0 circle, L1 drop, L2 triangle, L3 square, L4 octagon. The same tokens are used on the card, the board and the planner. Alert colours are never used for chart series. Stale shows a hatch pattern, not transparency. Spacing uses a 4 px scale and radius is 8 px everywhere. Verify: a contrast check script on the token pairs.
- D4 Action-first card (design H1, H2): The main button carries out the instruction:
  - L2 "I'm in the shade": sets Rest and shows a countdown ring.
  - L3 "Switched to light task": sets Light.
  - L4: see D7.

  The activity row is secondary. The budget bar shows the 5 level bands with no number. When a floor or fallback sets the level, one reason chip says why: "heart rate high", "after unwell: 12 min", "dark urine", "watch lost: playing safe", "no forecast: worst case". A "recovering" chip shows while resting.
- D5 Board layout (design H4, H5):
  - The "Needs you" strip (overdue, L4, L3, stale at ≥L2, low battery) is sorted by severity then `levelSince`. Below it, the crew grid is sorted by name and never re-sorts live.
  - Tile: name, level colour + number + icon, the supervisor's action ("Send buddy", "Allow shade break", "Move to light task"), last seen, and one badge (overdue > stale > battery).
  - The ack button reads "Help sent". "Ack due 0:22" shows before a tile goes overdue.
  - When a poll fails, a banner says "Board offline since HH:MM, statuses frozen". Stale and overdue calculation pauses until a poll succeeds, using the server `now`.
- D6 Demo preset (design H3, H6, M5, M6, M9):
  - The S51 one-click demo pre-fills English, W-DEMO and consent ("Accept (demo)" shown once), and uses a 3 s countdown.
  - An "auto-follow advice" toggle on the demo worker reuses the S46 compliance rule. Only "I feel unwell" is tapped by hand.
  - `speechSynthesis.cancel()` runs before each utterance.
  - Simulated crew-mates appear only in Replay sessions, with a SIM tag and a dashed border; never in Live.
  - A permanent "REPLAY · 15 Jul 2026 · 240×" banner and a site-time clock appear on both views.
  - Watch, battery and demo toggles live in a demo drawer in the harness, not on the worker card. Confidence chips move to the menu.
  - In demo sessions, `tel:` shows a "Would dial 998" toast, and numbers are always shown as text.
- D7 Level-4 behaviour (design C3): At L4:
  - Activity is forced to Rest, the activity row is disabled, and Rest never reverts.
  - The call buttons (site medic, 998) are the main action.
  - "I'm OK, buddy checked" is a secondary control placed below the call buttons. It is enabled only after ≥15 sim-min of Rest and a budget ≥18.

  Verify: an engine test where the budget does not drain while latched at L4.
- D8 Worker lifecycle states (design H8):
  - No session or fragment: "Scan your supervisor's QR" with a large 998 button and no invented level.
  - Before the shift: a countdown.
  - After the shift: an end-of-shift summary.
  - Next day below 100: "Yesterday was hard: starting lower".
  - Late join: "Joined HH:MM".
  - Forecast loading, or climatology in use: shown as the reason chip.
  - Low battery: "Battery low, stay with your buddy".
  - Invalid or replaced session: "Rescan QR".
  - Delete pending offline: "Deleting when back online".

  Each state has one copy key.
- D9 Planner view and RTL (design H7, M8):
  - The planner is a read-only timeline across shift hours: a WBGT heat strip, the hatched 12:30–15:00 ban, task blocks coloured by metabolic class (not alert colours), inserted rests, the vulnerable profile's predicted-level line, and an Unscheduled tray with one reason per task.
  - "Planner off" is a comparison overlay with counters (level ≥2 events, tasks completed). It is never sent to phones.
  - Scenario, multiplier and the fasting-safe toggle lock when the session starts. Any change means a new session and a new QR.
  - RTL: the worker card and activity row mirror, and the bar fills from the start edge. The planner timeline and charts stay left-to-right. The supervisor and evidence pages are English only.
- D10 Check-in (design M3, M4): Urine is 3 large swatches: pale, medium, dark (mapping to S31 colours 1–3, 4–5 and 6–8). The Skip button states "counts as dehydrated". Fasting copy is written for all 5 levels, and the L3–L4 wording gets a native-speaker check. The fasting toggle lives in the menu and asks for confirmation if changed mid-shift.
- D11 Onboarding (design M2, M7):
  - The language list shows names in native script with voice samples, no flags.
  - The name picker goes crew → name → "You are Ravi K. (W-7F3A)?" confirmation.
  - Consent gives Accept and Decline equal visual weight. A declined worker keeps a banner.
  - "Delete my data" is in the menu, asks for confirmation, is queued if offline, and then returns to the language picker.
- D12 Evidence page (design M1):
  - Precompute the simulation to JSON at build time (deterministic) and load it instantly offline.
  - Order:
    1. S50 headline claim with its qualifier
    2. engine vs B1: sensitivity, false alarms, lead time
    3. fairness with a ±10 pp band
    4. robustness sweep
    5. planner metric
    6. limitations
  - "Insufficient" cells are hatched. A failed fairness test gets a red outline and the fix text.
- D13 Type (taste T-type): The Noto Sans family (Latin, Arabic, Devanagari, Bengali, Malayalam) self-hosted and cached by the service worker. Action text uses 600 weight; level numbers use tabular figures.
- D14 Accessibility minimums (design H9):
  - Tap targets ≥64 px and action text ≥28 px.
  - Vibration pulse count = level, triggered only on a level rise.
  - Level changes announce through an `aria-live="assertive"` region.
  - The board is fully keyboard operable in tile order ("Needs you" first), with visible focus rings themed from the tokens.
- D15 Landing (Pass 7): / is a single composition: the product name, one sentence ("A returning worker is a new worker. HeatShield plans the shift around them." unless UC2 is rejected, then the core pitch line), one button "Run the 15 July demo", and a footer link to /evidence. No cards and no hero image.
<!-- /autoplan-accepted:design -->

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

<!-- autoplan-accepted:eng -->
- Y1 Calibrated drain (eng H1):
  - Budget drains only when r = effective WBGT ÷ limit exceeds 1.0 (the NIOSH limit), at k·(r − 1.0) per minute.
  - When r < 0.9 and not in heavy work, passive recovery is +0.5/min.
  - On Sat, run k and the thresholds through a spreadsheet over the fixture rows, then calibrate on seed 7 with 18 Jul weather (S46 wins over E1's "change the claim").
  - E1 tests assert windows: Replay (unacclimatised day-1 heavy, +3) reaches L2 between 08:00 and 11:00 and not before 08:00. November live (acclimatised moderate) stays ≤ L1 all shift.
- Y2 Storage shape (eng H2): status is a JSON string `SET status:{site}:{sessionId}:{workerId} <json> EX 86400`, read with MGET. All status rules live in pure `applyStatus(prev, input, now)` and `applyAck(prev, input, now)` functions, unit-tested independently of the store. This replaces S32's hash fields.
- Y3 Store safety (eng H3): the memory adapter is used only when `!process.env.VERCEL`. In production, missing store vars return `503 store-unavailable` (problem+json). This replaces X4's silent fallback in production.
- Y4 Persisted engine state (eng H4):
  - `{budget, latch, unwell, timers, lastSimTs}` is saved to localStorage on every step, and `unwell` is written synchronously on the tap.
  - Live state is keyed by worker + site-date, not sessionId, so a new Live session or a page reload keeps unwell, latch and budget. Replay has its own namespace.
  - "Delete my data" while unwell needs the same buddy-check confirmation.
  - This replaces S43's "phone resets engine state per session" for Live.
- Y5 Session keys (eng H5):
  - `sessionId = crypto.randomUUID()`, with `wallStart` a separate field.
  - The key includes sessionId.
  - Each one-click demo gets a random demo worker ID and a random session.
  - This deletes S43's overwrite rule, X1's `session-replaced` 409 and D8's "replaced session" state.
- Y6 Supervisor-owned snapshot (eng H6): the supervisor fetches Open-Meteo once (`timeformat=unixtime`), computes hourly WBGT for sun and shade (0.1 °C) and the schedule, and puts both in the fragment. The phone never fetches weather or runs the planner. This deletes the phone side of S36/X12's weather retry and S18's phone planner re-run; the phone reads the schedule from the fragment.
- Y7 Idempotent, atomic writes (eng M4, M5):
  - An equal `simTs` with the same body returns 200.
  - `session.ts` has a single-flight queue.
  - All store writes (status and ack) go through one Lua compare-and-set (`if GET == expected then SET … EX`) with ≤3 retries.
  - Test: both orders of ack vs level rise; the level never reverts.
- Y8 Clamp and derived NaN (eng M2): budget is clamped to [0, 100]. Any non-finite derived value (limit, r) counts as missing and gets the worst value.
- Y9 Gaps and catch-up (eng M1): time between tasks and during the midday ban counts as Rest-in-shade. Catch-up follows the schedule including gaps, unless latched at L4 or unwell, in which case it stays at Rest (D7).
- Y10 Start-of-day rules (eng M3): with no carry-over the start budget is 80, which is L0. A skipped check-in applies only the urine −15 (start 65 → L1), and poor sleep −10 applies only when reported. SPEC.md states both.
- Y11 Validation (eng M6, M7):
  - Status body: level an integer 0–4, workerId in the roster, `simTs` finite and inside the session window, `lowBattery` boolean, body ≤ 1 KB.
  - Trust on first use: the phone sends a device key, the server stores its hash, and later POST/DELETE for that worker must match.
  - Tokens are compared in constant time.
  - Fragment: multiplier ∈ {1, 240}, Live ⇒ 1×, scenario from a known set, `v` checked. Anything invalid shows D8's "Scan your supervisor's QR".
- Y12 WBGT method and time parsing (eng M8, M9, M10, L2):
  - All Open-Meteo calls use `timeformat=unixtime`, and fixtures store epoch values.
  - WBGT = 0.7·Tnwb + 0.2·Tg + 0.1·Ta with the Dimiceli (2011) closed-form globe model. Tnwb is derived from psychrometric wet bulb (Stull from T/RH when the field is missing), so live, replay and climatology share one path. Three published reference vectors are used for tests.
  - Evidence counts an alert only if it was active within 60 min before the truth event, and B1 sensitivity must be < 100% as a sanity test.
  - Climatology is 12 monthly p95 rows, not July only.
- Y13 Single clock loop (eng L1, L3, L7): catch-up is the only loop: `advanceTo(simNow)` on every tick and on `visibilitychange`. The app posts and vibrates once after catch-up finishes. Voices are probed at "Start shift" after `voiceschanged`. Android tab freezing (stale crew) is stated next to S13.
- Y14 Smoke and SW (eng M11, M13):
  - `npm run smoke` adds one POST + GET round trip on a throwaway session against the deployed store.
  - The SW never intercepts `/api/*`.
  - /worker, /supervisor and /evidence must build static (○ in `next build`).
  - The build id is `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`, mapped in `next.config` env, falling back to a build timestamp.
  - SW precache: allSettled per URL. The implementation (Serwist or hand-written) is taste decision T-sw.
- Y15 Small rules (eng M12, L4, L5, L8, L9, L10, L11, L12):
  - `GET /api/site` returns `now`, and clients apply the offset before their first tick.
  - A lint rule bans local `Date` getters and `toLocale*` in `lib/`. One TZ test is kept.
  - Routes drop `:id` because the site comes from the token.
  - The truth model lives in `lib/sim/`, with a lint import ban from `lib/engine`.
  - `medicTel` is stripped to digits.
  - Demo seed names are synthetic.
  - v0 output is copied into `components/` by hand and never synced to main.
  - `check:contrast` becomes a vitest.
- Y16 Monday scope (eng scope note): Monday ends with one working worker card (en + ar) wired to `session.ts`. S34, E11, S13 Wake Lock and the remaining languages move to Thursday.
- Y17 Simplifications (eng delete list): X11's `pendingDelete` queue and D8's "Deleting when back online" are removed. Offline delete clears local data and shows "expires within 24 h". L6 is accepted and stated: the latest-only queue drops an offline status that was cleared before reconnect.
- Y18 Fasting mode (gate uc1a, user-approved 14 Nov): "Ramadan fasting mode" is renamed **"Fasting mode"**. It covers any daylight fast, including Ramadan, and is a supporting point rather than a pitch pillar. UI copy, copy keys, SPEC.md and the deck use "Fasting mode". The optional pitch line is "Ramadan returns to the hottest months just as summers get hotter". The engine rules are unchanged: the ×1.25 drain, the shade/cooling actions in place of "drink water", and the crew fasting-safe planner rule (S46). Verify: no "Ramadan" string appears in `t(key)` dictionaries except the optional pitch copy.
- Y19 Pitch wedge (gate uc2a, user-approved 14 Nov): the one-line pitch becomes "A returning worker is a new worker. HeatShield knows the difference and plans the shift around them."
  - The story is acclimatisation (new arrivals and leave-return re-acclimatisation ramp) plus the shift planner.
  - The phone alerts are presented as the safety net.
  - Fasting mode, offline use and languages are supporting points.
  - The evidence headline is sensitivity for the unacclimatised group (S50 qualifier kept).
  - D15 landing copy and the S49 demo script follow this order.
  - The judging format is video + live link (gate c1a), so S51/D6 one-click demo polish and the 3-min video are top priority on Thu/Fri.
  - The name HeatShield stays, with HEAT-SHIELD cited as prior work (gate uc3a, S53).

  Verify: demo script and deck order match.
- Y20 Gate taste choices (gate rev 1, `rec`, 14 Nov):
  - D3 palette kept (d1a).
  - Noto Sans subset to 2 weights, cached by the SW (d2a).
  - speechSynthesis + tone fallback (d3a).
  - **Serwist** for the service worker (d4a), replacing the hand-written `public/sw.js` in the architecture. Y14's rules still apply: no `/api/*` interception, static routes, build-id cache name.
  - E6 badge kept (d5a).
  - Vercel hosting (d6a).
  - Planner and sim client-side/build-time (d7a).
- Z1 Weather windows and E1 goldens (eng-rerun H1), replacing Y1's preset 08:00–11:00 window:
  - Sat go/no-go: a spreadsheet of hourly r and Δ per profile across candidate weeks.
  - The evidence runs on shoulder windows from the Open-Meteo archive (late May 2026 and early Oct 2026), where the baseline crosses its threshold during the day. 15 Jul stays as the dramatic replay.
  - k comes only from the seed-7 calibration.
  - E1 expectations are golden values regenerated from the calibrated engine, and the claim text follows the goldens.
- Z2 Fair baseline (eng-rerun H2): B1's single threshold is chosen on seed 7 with the same objective as the engine, then both are frozen before seed 42. Lead time = event time − onset of the alert episode, capped at 60 min. This replaces S7's and Y12's lead-time wording.
- Z3 Gaps, replacing Y9 (eng-rerun H3, safety): Rest applies only to planner-inserted rests, the midday ban (sun tasks) and worker taps. Every other gap uses the last task's class, or moderate in sun when there is none. Test: an empty task list never produces recovery.
- Z4 Demo identity (eng-rerun H4), replacing Y5's random demo worker:
  - The demo uses a fixed W-DEMO, and the random sessionId in the key isolates concurrent demos.
  - The device-key hash (Y11 TOFU) is stored inside the status JSON under the session key, so it expires with the session.
- Z5 Serwist rules (eng-rerun H5):
  - Don't spread defaultCache. Use exactly two runtime rules: NetworkFirst for pages (networkTimeoutSeconds 3) and CacheFirst for /_next/static/*.
  - Every API response sends Cache-Control: no-store, and a test asserts no runtime rule matches /api/.
  - On Sat, check the Next major version: Next 16 needs next build --webpack or the Serwist CLI path.
- Z6 Open-Meteo and WBGT math (eng-rerun H6):
  - Request wind_speed_unit=ms and assert hourly_units.
  - Use the *_instant radiation variables.
  - Inside wbgt.ts, clamp u2 ≥ 0.5 m/s and cos z ≥ 0.01, with direct = 0 below the horizon.
  - Tnwb from the psychrometric wet bulb gets a stated tolerance (±1.5 °C) instead of exact reference vectors.
  - Bundled fixtures are tested to contain zero nulls.
- Z7 SPEC.md single rules (eng-rerun H7), the checklist for compiling SPEC.md:
  - Start budget: no carry-over 80 (Y10 wins over S22/X7). Replay starts at 100, then check-in deductions apply.
  - Recovery: Rest in shade +2/min fixed, plus passive +0.5/min when r < 0.9 and not heavy.
  - Skipped check-in: urine −15 only (Y10 wins over S28).
  - Board poll: 10 s live, 1 s time-lapse (S8).
  - X1's "Replay after Live overwrites" verify and D8's "replaced session" are dead (Y5/Z4).
  - S46 wins over S38.
  - npm run sim writes the committed public/evidence.json (D12 = X9).
  - Fixtures: 13–18 Jul plus the Z1 shoulder windows.
  - Lead time per Z2.
  - D7's forced Rest lives in the session/UI layer, not the engine.
- Z8 Session record (eng-rerun M1, M2), replacing Y6's fragment payload:
  - At session start the supervisor writes session:{site}:{sessionId} with {wallStart, simStart, multiplier, shift bounds, scenario, hourly WBGT sun/shade, schedule}, EX 86400.
  - The fragment carries only {v, siteId, token, sessionId} (< 200 chars).
  - The phone fetches the record once at join and caches it (S42).
  - The status route rejects simTs > simNow + 2 sim-min.
  - Test: session-record round trip and a fragment length cap.
- Z9 Roles (eng-rerun M3): two tokens, worker and supervisor, checked by one auth(req, role) helper.
  - The worker role gets status POST/DELETE, roster names and IDs, and its own profile.
  - The supervisor role gets crew status, ack and the full site data.
- Z10 Ack key, replacing Y7's Lua CAS (eng-rerun M4): ack:{site}:{session}:{worker} = {level, ackTs}. The board derives acked as ack.level >= status.level && ackTs >= levelSince. One writer per key, so no CAS and no retries. Y7's idempotent equal-simTs 200 and the single-flight queue stay.
- Z11 Delete, device binding and medic number (eng-rerun M5, M6, M8):
  - The phone keeps the sessionIds it posted to that day, and DELETE removes all of them.
  - 403 copy: "Name in use on another phone, ask for a new QR".
  - medicTel is validated with ^\+?\d{3,15}$, keeping the plus.
- Z12 Unwell outside shift (eng-rerun M7, safety): unwell and latch timers run on the sim clock regardless of the shift window. The board polls from session start until shiftEnd + 30 min. Test: a pre-shift unwell shows on the board and can be cleared.
- Z13 Demo resilience (eng-rerun M9): on store-unavailable the one-click demo switches to an in-page store, with a banner. /api/status is rate-limited with @upstash/ratelimit.
- Z14 Scheduler (eng-rerun M10), replacing S23/S46 placement wording: one chronological scheduler on 15-min slots. At each slot it picks the heaviest remaining feasible task whose predicted level stays < 2, else a lighter one, else Rest. Leftovers go to Unscheduled with a reason code, and the fasting rule falls out of this.
- Z15 Testable client and drift guards (eng-rerun M11, M12, M13):
  - advanceTo, the queue reducer (state, event) → {state, effects} and fragment parsing are pure functions with node tests.
  - Persisted state carries v. On mismatch, keep unwell and latch and drop the rest.
  - evidence.json stores hash(DEFAULTS), and a vitest fails on mismatch.
  - Climatology is a 12×24 month-by-hour p95 table for sun and shade.
- Z16 Small rules (eng-rerun Low):
  - Drain = k·max(0, Δ) where Δ = effective WBGT − limit in °C, replacing Y1's ratio form.
  - End-of-day budget = the last persisted budget for that site-date.
  - The phone posts immediately on joining.
  - The in-memory Map is pinned on globalThis.
  - Phones are tested only on the HTTPS Vercel URL.
  - Pages read location.hash in an effect.
  - Fonts use next/font with Noto per script (d2a mechanism).
  - Ack and DELETE are validated like status, with a 1 KB cap via req.text().
  - Seeded acclimatisation days are static, and absences of 1–6 days don't reset acclimatisation.
  - Open-Meteo CC BY 4.0 attribution is shown.
  - The Vercel function region and Upstash region are co-located.
- Z17 Hand-written expectations (eng-rerun): before Antigravity writes the engine, the builder (with Claude) writes the E1 goldens, the WBGT tolerance cases and the applyStatus/ack cases as tests, so agent code and agent tests can't simply agree with each other.
<!-- /autoplan-accepted:eng -->
