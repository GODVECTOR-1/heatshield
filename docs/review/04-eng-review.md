<!-- Moved verbatim from PLAN.md lines 1716-2066 on 2026-11-14. -->
> Phase 3, eng review + rerun: architecture, tests, failure modes, obligations Y1–Y20, Z1–Z17.

### Phase 3 — Eng review (autoplan, always last)
- Methodology read in full: lines 1–2109/2109 (EOF).
- Target: E:\MIcrosoft\PLAN.md (plan target, no code yet). Scope gate: user-named target.
- Native eng voice: completed on input `dcb3ff82…` with 6 High, 13 Medium and 12 Low findings.
- Codex: unavailable (`not_authed`), so this phase is `[single-model]`.
- No test framework exists yet. The proposed one is Vitest (X9), which needs no new framework decision because DX already approved it.

**Step 0 Scope Challenge**
- **A. What already solves each sub-problem:**
  - Open-Meteo forecast and archive (probed).
  - NIOSH RAL/REL formulas, re-derived: REL(300 W) = 28.2, RAL(415 W) = 23.0, REL(415 W) = 26.6 [measured: computed 14 Nov].
  - Next.js App Router and Vercel.
  - Upstash `@upstash/redis`.
  - Serwist (`@serwist/next`), which builds the SW after prerender and precaches prerendered routes ([Layer 2], Serwist docs).
  - Recharts.
  - No repo code exists to reuse.
- **Complexity:** about 27 planned files (engine 6, sim 2, client 2, lib 3, api 5, pages 4, sw 1, scripts 3, tests ~6) and 5 new modules or services (engine, sim, store, session, SW). The gate trips (≥8 files, ≥2 services). There are no feature cuts: P2 means scope is never reduced.
  - Structure question `plan-eng-review-structure`, auto-decided as **Smaller arrangement** (P5):
    - `lib/engine/{wbgt, physiology (limits+acclim+budget), risk, planner, time, constants}.ts`
    - `lib/sim/{truth, run}.ts`
    - `lib/client/session.ts`
    - `lib/store.ts`
    - `lib/problem.ts`
    - `lib/weather.ts` (supervisor only, per Y6)

    The original 8 engine files become 6 plus 2 sim files. The features, contracts and approved fixes are the same. Pending remedies not decided here: none.
  - Scope record: feature answers: none (no cuts proposed); structure: B, Smaller arrangement (autoplan auto-decision); accepted scope: all CEO/Design/DX obligations; pending remedies: none.
- **Search check:** [Layer 2] Serwist for the App Router SW versus [Layer 1] hand-written SW. The voice's M11 shows the hand-written route has to scan flight data for chunks, so this is taste decision T-sw.
- **TODOS cross-reference:** E3/E4/E10/ECTemp/Web Push/DESIGN.md are all deferred and none blocks this plan.
- **Distribution:** a Vercel deploy and a public GitHub repo, with no other artifacts.
- **Scope Challenge result:** scope accepted as-is (smaller arrangement, no reduction).

REALITY: premise-table finding 3 eng premises: NIOSH constants re-derived [measured]; E1 November ≤1 claim false at r>0.8 threshold (0.64 pts/min drain) PLAN.md:94
REALITY: already-done pass no git repo, no code; nothing previously built PLAN.md:1
REALITY: surface-check finding Redis MGET on hash keys returns nil (Redis semantics) contradicts S32/S46 storage; Serwist API from docs; `timeformat=unixtime` Open-Meteo param PLAN.md:193
REALITY: binding-decisions pass gstack-decision-search empty; build split + CEO/Design/DX obligations honoured PLAN.md:55
REALITY: numbers finding k=5 and r>0.8 threshold [estimated] fail E1 Nov fixture; day-1 heavy limit 23.7 [measured: computed]; 240× → 1 s skew = 4 sim-min [measured: arithmetic] PLAN.md:184
REALITY: deferred-asks pass no linked issue PLAN.md:1
REALITY: pr-count pass no ship-policy; one PR per wave PLAN.md:78

```
ENG DUAL VOICES — CONSENSUS TABLE: [single-model]
  Dimension                           Claude            Codex  Consensus
  1. Architecture sound?               yes, 6 spec bugs  N/A    N/A
  2. Test coverage sufficient?         no: 10 missing    N/A    N/A
  3. Perf risks + budget/bench named?  low risk; budgets added (Y16) N/A N/A
  4. Security threats covered?         partial (M6/M7)   N/A    N/A
  5. Error paths handled?              partial (M2/M4/M5) N/A   N/A
  6. Deployment risk manageable?       no until H3/M13   N/A    N/A
Single-voice criticals flagged: none Critical; H1–H6 High.
```

#### Section 1: Architecture review
```
                  ┌──────────── supervisor browser ─────────────┐        ┌────── worker phone (PWA) ───────┐
 Open-Meteo ──►   │ lib/weather.ts → hourly WBGT sun/shade      │  QR    │ lib/client/session.ts           │
 (unixtime)       │ lib/engine/planner (vulnerable profile)     │ ─────► │  parse+validate fragment (Y11)  │
                  │ → SessionFragment{v,site,token,sessionId,   │ #frag  │  advanceTo(simNow) loop (Y13)   │
                  │    scenario,clock,wbgtHourly,schedule}      │        │  lib/engine/{physiology,risk}   │
                  │ board: poll GET /api/crew/status (MGET)     │        │  localStorage engine state (Y4) │
                  └──────────────┬──────────────────────────────┘        │  single-flight queue → POST     │
                                 │ GET / POST ack                         └───────────────┬─────────────────┘
                                 ▼                                                        ▼ POST/DELETE status
                        app/api/* (Antigravity): token check (const-time) → validate → applyStatus/applyAck (pure)
                                 │                                    → lib/store.ts: JSON SET EX 86400 + Lua CAS
                                 ▼
                    Upstash Redis key status:{site}:{sessionId}:{workerId}   (memory adapter only when !VERCEL)
 /evidence ← public/evidence.json ← npm run sim (lib/sim/truth + lib/engine, frozen params)
```
Design-twice (new module `lib/engine`):
- **Shape A (plan):** phone and board each fetch weather and run the planner.
- **Shape B:** the supervisor owns the weather snapshot and the schedule. The phone only steps physiology from the fragment.
- **Pick: B.** It is deeper: the phone's surface shrinks to `advanceTo` + `risk`. It removes split ownership of weather and schedule (red flag 5) and the two ways to compute a schedule (red flag 6).

Red flags:
- Hand-synced list: i18n dictionaries, fixed by the X10 parity test.
- Importable internals: `lib/sim` must not be imported by `lib/engine`, enforced by a lint rule (Y15).

Findings:
- `[INFORMATIONAL] (confidence: 8/10) PLAN.md:212` — S36 "client fetches Open-Meteo directly… same hourly snapshot" can't hold: separate fetches and V8 vs JavaScriptCore float differences can flip planner ties (eng H6). Fixed by Y6.
- `[INFORMATIONAL] (confidence: 9/10) PLAN.md:403` — X4 falls back to memory when env is missing. On Vercel, per-instance memory splits the phone and the board with no error (eng H3). Fixed by Y3.
- `[INFORMATIONAL] (confidence: 8/10) PLAN.md:245` — S43 uses one key per worker with `sessionId=wallStart`. Concurrent demos with a public token and fixed W-DEMO clobber each other (eng H5). Fixed by Y5.

Dispositions: all accepted (autoplan P5/P1), see Y3, Y5 and Y6.

#### Section 2: Code quality review
- `[INFORMATIONAL] (confidence: 9/10) PLAN.md:193` — S32 stores a Redis *hash* while S46 reads it with MGET. MGET returns nil for non-string keys, so every tile shows "no data" on Upstash while memory tests pass (eng H2). Fixed by Y2: a JSON string with `SET EX`, and status rules as a pure `applyStatus/applyAck(prev, input, now)`.
- `[INFORMATIONAL] (confidence: 8/10) PLAN.md:267` — the budget is never clamped. A negative budget falls outside every band, and a NaN derived limit is unguarded (eng M2). Fixed by Y8.
- `[INFORMATIONAL] (confidence: 7/10) PLAN.md:237` — gaps between tasks and during the midday ban have no activity, and S41 catch-up conflicts with D7 (eng M1). Fixed by Y9.
- `[INFORMATIONAL] (confidence: 7/10) PLAN.md:161` — start of day 70 = L1 from minute 0, and skip + poor-sleep stacking is undefined (eng M3). Fixed by Y10.
- Shared code: the planner and physiology are shared by board, phone and sim, which is reuse rather than duplication. No extraction is proposed. The i18n dictionaries are the only hand-synced list.

Dispositions: all accepted.

#### Section 3: Test review
```
CODE PATHS                                              USER FLOWS
[+] lib/engine/wbgt.ts                                  [+] One-click Replay demo (/)
  ├── [GAP] sun vs shade (solar=0)                        ├── [GAP] [→E2E] / → split view → L≥2 by 11:00, not before 08:00
  ├── [GAP] 3 published reference vectors (Y12)           └── [GAP] [→E2E] two concurrent demos don't clobber (Y5)
  └── [GAP] Stull wet-bulb when field missing (Y12)     [+] Worker shift
[+] lib/engine/physiology.ts                              ├── [GAP] reload mid-shift restores budget/latch/unwell (Y4)
  ├── [GAP] RAL/REL + ramp interpolation (S27)            ├── [GAP] new Live session keeps unwell/latch/budget (Y4)
  ├── [GAP] drain threshold r>1.0 + passive recovery (Y1) ├── [GAP] unwell → L4 → buddy-check clear, floor 2 (S20/D7)
  ├── [GAP] clamp [0,100]; derived NaN → worst (Y8)       └── [GAP] consent decline → local only, nothing posted (S21)
  └── [GAP] gaps/ban = shade rest (Y9)                  [+] Supervisor board
[+] lib/engine/risk.ts                                    ├── [GAP] Needs-you ordering; ack due → overdue (D5/E6)
  ├── [GAP] composition max-of-floors, unwell→4 (S46)     ├── [GAP] poll fail → banner, stale paused (D5)
  ├── [GAP] hysteresis 5 sim-min + 3 pts (S19)            └── [GAP] 401 → stop polling (X5)
  ├── [GAP] finite-input guard (X3)                     [+] Error states
  └── [GAP] skip check-in strictly worse, ≠ unwell        ├── [GAP] null Open-Meteo field never → L0 (X3)
[+] lib/engine/planner.ts                                 └── [GAP] fragment rejects bad multiplier/scenario/v (Y11)
  ├── [GAP] midday ban no sun tasks; unscheduled reasons
  └── [GAP] fasting-safe crew rule (S46)
[+] lib/engine/time.ts  [GAP] TZ=America/New_York raw Open-Meteo unixtime (Y12)
[+] lib/store.ts / applyStatus / applyAck
  ├── [GAP] older simTs 409; equal simTs same body 200 (Y7)
  ├── [GAP] ack vs level rise, both orders, never reverts (Y7)
  └── [GAP] [→E2E] contract once vs real Upstash (Y14 smoke)
[+] lib/sim  [GAP] seed-42 deterministic (tolerance); B1 sensitivity < 100% (Y12); engine/sim import ban
COVERAGE: 0/31 paths tested (greenfield)  |  QUALITY: none yet  |  GAPS: 31 (4 E2E, 0 eval)
```
Every gap above is required proof for already-approved behaviour (CEO, Design, DX or Eng obligations), so no new test-scope question is needed. Tests made obsolete: none. No LLM or prompt code, so no evals.

Test plan artifact: `~/.gstack/projects/MIcrosoft/renu1-unknown-eng-review-test-plan-<datetime>.md` (written below).

#### Section 4: Performance review
- Board: one MGET of ≤20 keys per poll at 1 s for 2 min ≈ 120 commands. Budget: p95 GET ≤ 300 ms [estimated; measured by smoke Y14].
- Sim: 2000 × 5 days × 480 steps ≈ 4.8 M steps at build time via `npm run sim`, not on page load. Budget: ≤ 60 s locally [estimated]; it is a build step only.
- Phone: one `advanceTo` per second, O(steps since last tick). Catch-up after a 30-min screen-off is ≤ 1800 steps at 240× sim time, which is trivial.
- Fragment size: about 250 characters after Y6, which fits a QR at error-correction level M.
- `[INFORMATIONAL] (confidence: 6/10)` — Upstash free-tier command quota is unverified, so check it on Sat. Board polling only while visible and in shift (S46) bounds usage.
- No unbounded queries; all reads are keyed.

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

**NOT in scope (eng):**
- Per-worker auth beyond trust on first use.
- Web Push (TODO).
- Server-side engine execution.
- A load test beyond the smoke check.
- A real-Upstash contract suite in CI (one smoke round trip only).

**What already exists (eng):** Open-Meteo, NIOSH formulas, `@upstash/redis`, Serwist (candidate), Vitest, Recharts, and Vercel preview/promote. All are reused; nothing is rebuilt.

**Failure modes registry (eng)**
```
  CODEPATH               | FAILURE MODE                         | RESCUED? | TEST? | USER SEES?            | LOGGED?
  store (Upstash)        | MGET on hash → nil                   | Y (Y2)   | Y(smoke) | correct tiles      | Y
  store (prod no env)    | per-instance memory split            | Y (Y3)   | Y     | 503 banner            | Y
  engine budget          | drains past 0 / NaN limit            | Y (Y8)   | Y     | L4 / worst chip       | N
  worker reload          | unwell/latch lost                    | Y (Y4)   | Y     | lock persists         | N
  demo concurrency       | sessions clobber                     | Y (Y5)   | Y(E2E)| independent demos     | N
  schedule split         | phone ≠ board                        | Y (Y6)   | Y     | same schedule         | N
  ack vs post race       | level reverts                        | Y (Y7)   | Y     | correct level         | Y
  time parsing           | local-time shift                     | Y (Y12)  | Y     | correct hours         | N
  SW precache            | chunk missing offline                | Y (Y14)  | manual| "Offline ready" only when true | Y
  queue latest-only      | cleared offline L4 never reaches board | N (accepted L6) | N | board shows last posted | N
```
The last row is accepted and stated (L6). The worker was cleared after a buddy check, so this is not silent harm. **Critical gaps: 0.**

**Worktree parallelization strategy**
| Step | Modules touched | Depends on |
|---|---|---|
| Contract + fixtures | lib/types, data/, constants | — |
| Engine + tests | lib/engine, lib/sim | Contract |
| API + store | app/api, lib/store, lib/problem | Contract |
| Worker UI (v0) | components/, app/worker, lib/client | Contract, Engine |
| Board UI (v0) | components/, app/supervisor | Contract, API |
| Evidence | lib/sim, app/evidence, scripts | Engine |

- Lane A: Engine → Evidence (Antigravity).
- Lane B: API + store (Antigravity).
- Lane C: Worker UI → Board UI (v0, shared components/).

Execution order: write the Contract first, then launch A, B and C. Board UI waits for B. Conflict flag: Worker and Board share `components/`, so they run sequentially in Lane C.

**Implementation Tasks (eng)**
- [ ] **T23 (P1, human ~2h / CC ~15min)**: engine. Calibrated drain + passive recovery + E1 window tests (Y1).
  - Surfaced by: eng H1.
  - Files: lib/engine/physiology.ts, constants.ts.
  - Verify: E1 window tests on both fixtures.
- [ ] **T24 (P1, human ~2h / CC ~15min)**: store. JSON SET/MGET, pure applyStatus/applyAck, Lua CAS, prod guard (Y2/Y3/Y7).
  - Surfaced by: eng H2/H3/M5.
  - Files: lib/store.ts, lib/status.ts.
  - Verify: unit tests for both race orders, plus smoke against Upstash.
- [ ] **T25 (P1, human ~1h / CC ~10min)**: client. Persist engine state; Live keyed by worker+date (Y4).
  - Surfaced by: eng H4.
  - Files: lib/client/session.ts.
  - Verify: reload test keeps unwell/latch/budget.
- [ ] **T26 (P1, human ~1h / CC ~10min)**: session. randomUUID sessions, random demo worker, key includes sessionId (Y5).
  - Surfaced by: eng H5.
  - Files: lib/client/session.ts, app/api/status.
  - Verify: concurrent demo E2E.
- [ ] **T27 (P1, human ~2h / CC ~15min)**: supervisor. Snapshot WBGT + schedule into fragment; phone reads it only (Y6/Y11).
  - Surfaced by: eng H6/M7.
  - Files: lib/weather.ts, lib/client/fragment.ts.
  - Verify: fragment parse/reject tests.
- [ ] **T28 (P1, human ~2h / CC ~20min)**: wbgt. Dimiceli globe, Stull wet bulb, unixtime parsing, reference vectors, monthly climatology (Y12).
  - Surfaced by: eng M8/M9/L2.
  - Files: lib/engine/wbgt.ts, data/climatology.json.
  - Verify: 3 reference vectors and the TZ test.
- [ ] **T29 (P2, human ~1h / CC ~10min)**: validation. Body validation, TOFU device key, constant-time token compare (Y11).
  - Surfaced by: eng M6.
  - Files: app/api/*, lib/auth.ts.
  - Verify: 400/403 tests.
- [ ] **T30 (P2, human ~1h / CC ~5min)**: lint. Ban local Date getters in lib/, ban lib/sim → lib/engine imports (Y15).
  - Surfaced by: eng L4/L8.
  - Files: eslint config.
  - Verify: lint fails on a sample violation.
