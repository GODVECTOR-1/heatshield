# 04 · Client session runtime (`lib/client/*`, owned by the builder)

This is the glue between the v0 UI, the engine and the API. Its core is pure: `advanceTo`, a queue reducer `(state, event) → {state, effects}` and the fragment parser, each with node tests. The browser side-effect shell stays thin. It is written **Monday morning, before v0 UI is wired**.

## QR join (as built, 20 Nov)
The built join is a cut-down version of the flow below. There is no server route, no sign-in and no stored state.
- **`/supervisor`** (`DemoClient layout="board"`) makes a 6-character crew code (no I, L, O, 0 or 1), kept in `sessionStorage`. It shows the code, a QR for `/worker#c=CODE` and **Start shift**, then runs the same 15 Jul replay as `/demo`. The QR stays in the board header after the start; tapping it shows it large again.
- **`/worker`** without a valid `#c=` shows the scan prompt, a typed-code box and a 998 button. With a code, it opens Ravi K.'s full-screen card (`layout="phone"`). The engine runs on the phone with no watch (Tier 0 + 1) and no auto-follow.
- **Messages** (`lib/client/link.ts`):
  - **Phone to board:** `hello` every 5 s until the shift starts, then `status {workerId, level, simTs, lowBattery}` on every level change and every 5 s.
  - **Board to phone:** `session {wallStart, boardNow, endSim}` on start, on restart, on End shift and in reply to `hello`. The phone corrects its clock by `boardNow`. `endSim` is the sim minute the supervisor ended the shift, or null while it runs.
  - `parseMsg` drops anything malformed and strips extra fields. Anyone holding the code can send.
- **Transport:** Supabase Realtime broadcast on the channel `heatshield-CODE` when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (no tables). Otherwise `BroadcastChannel`, which only links tabs in one browser. The board says which one is in use.
- **On the board:** the phone's status replaces Ravi K.'s simulated tile (no SIM badge). After 2.5 missed heartbeats (12.5 s) the tile goes stale and the header says "no signal". Acks stay on the board; the worker never sees them.
- **End shift (20 Nov):** the board's header button reads **Start shift**, then **End shift** (after a confirm) while the shift runs, then **Start new shift**. Ending early freezes the clock and every engine at that minute on the board and the phone, both show "Shift over at HH:MM", and "Needs you" empties. The `/demo` header has the same End shift button, next to Restart.
- **On the phone:** the delivery line shows the last status the link confirmed. A failed send shows "Not sent, no signal".
- **Not built:** sign-in, device binding, choosing your name (the phone is always Ravi K.), `/api/status`, and the queue and persistence below.

## Joining a session
1. **Parse the fragment** `#v=1&s=<siteId>&t=<workerToken>&id=<sessionId>` (< 200 chars).
   - An unknown `v` or a missing field shows "Scan your supervisor's QR" with a large 998 button.
   - Pages read `location.hash` in an effect, never during render.
2. `GET /api/session/:sessionId` returns the record (clock, scenario, multiplier, shift, WBGT hourly, schedule). Then validate it:
   - multiplier ∈ {1, 240}
   - Live means 1×
   - the scenario is known
3. `GET /api/site`, then the worker picks a name, then `GET /api/profile/:workerId`.
4. Cache the record, site and profile in localStorage for this session.
5. **Offline boot:** use the cached copies. If nothing is cached, run Tier 0 at worst values and show the 998 button.
6. **Post a status right away** on join.

## Clock
- `simNow = simStart + (wallNow + offset − wallStart) × multiplier`.
- The offset comes from the server `now` and is applied **before the first tick**, then refreshed from every response.
- The multiplier is fixed per session.
- The session starts after a countdown: `wallStart = now + 30 s` live, 3 s in the one-click demo.

## Loop
- One loop only: `advanceTo(simNow)` on every 1 s wall tick and on `visibilitychange`/resume. It catches up in 1 sim-minute steps along the schedule, gaps included.
- At L4, or while unwell, the activity is forced to Rest and the activity row is disabled.
- Post and vibrate **once, after** catch-up, and only when the level changed.

## Persisted engine state
- `{v, budget, latch, unwell, timers, lastSimTs, levelState}` is saved on every step. **Unwell is written synchronously** on the tap.
- Keys:
  - **Live:** keyed by worker + site-date, so a reload or a new Live session keeps unwell, latch and budget.
  - **Replay:** its own namespace per session.
- On a `v` mismatch after a deploy, keep `unwell` and `latch` and drop the rest.

## Queue (latest-only, single-flight)
- The queue holds only the latest status per worker, and only one request is in flight at a time.
- **Retries** run on `online` and on every heartbeat. The heartbeat runs on wall-clock time: **5 min live, 15 s in time-lapse**.
- On `409 status-superseded`, drop the item.
- On 2xx, update the delivery line and the clock offset.
- On `401` stop posting and show "Session expired: rescan QR". On `403 device-mismatch` show "Name in use on another phone, ask for a new QR".
- If consent was declined, the engine still runs locally but the queue is disabled.
- *Known limitation:* a status that went to L4 and was cleared while offline never reaches the board.

## Delivery line (D1), derived from the queue
- "Supervisor sees: <colour> · <n> min ago" after a successful post.
- "Not sent, no signal" while queued. At level ≥3 the medic and 998 buttons become the main action.
- "Not shared (you chose this)" when consent was declined.

The worker never sees the supervisor's acks.

## Delete my data
1. Ask for confirmation. If the worker is unwell, the same buddy-check confirmation is required.
2. Wipe local state and the worker ID.
3. Send `DELETE /api/status/:sessionId/:workerId` for **every sessionId posted to today**. The phone keeps that list.
4. If offline, show "Your status expires within 24 h".
5. Return to the language picker.

## Device features
- **"Start shift" tap:** unlocks audio and vibration, offers the opt-in Screen Wake Lock, and probes `speechSynthesis` voices after `voiceschanged`.
- **Wake Lock:**
  - It is re-requested on `visibilitychange`.
  - The toggle shows `!sentinel.released`.
  - On rejection show "Screen may turn off: stay with your buddy".
- **Battery:** where `navigator.getBattery` exists, below 20 % the app releases the Wake Lock and posts `lowBattery: true`. It keeps posting level changes after that. Where the API doesn't exist, this is a stated limitation.
- **Voice:** call `speechSynthesis.cancel()` before each utterance. With no voice for the language, play a tone pattern for the level.
- **Service worker:**
  - It registers only in production, as `/sw.js?v=<build id>`.
  - `#nosw` unregisters it.
  - The menu shows "Offline ready" only after the SW posts `sw-ready`.
- **Testing:** test phones only on the HTTPS Vercel URL. Plain LAN http breaks `randomUUID`, the SW and Wake Lock.
