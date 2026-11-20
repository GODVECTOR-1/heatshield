# 06 · Supervisor board (`/supervisor`, built with v0, English only)

## Starting a session
1. Choose the **crew**, the **scenario** (Live forecast, or Replay 15 Jul 2026), the **speed** (1×, or 240× for Replay only) and **fasting-safe** on/off.
2. `lib/weather.ts` fetches Open-Meteo:
   - Request with `timeformat=unixtime`, `wind_speed_unit=ms` and the `*_instant` radiation variables, and assert `hourly_units`.
   - The result type is `{ok:true, rows, fetchedAt} | {ok:false, code:'forecast_unavailable'|'forecast_bad_response', status?, reason?}`. A failed fetch retries on `online` and every 15 min.
   - Replay uses the bundled fixture.
3. Compute hourly WBGT for sun and shade. The planner then builds the schedule ([02](02-engine.md#planner-plannerts-runs-on-the-supervisor)).
4. `POST /api/session` stores the record, and the screen shows the **QR**. The settings lock: any change means a new session and a new QR.

## Layout: element order
1. **Header:** the session summary (locked), the QR, the site-time clock and the `REPLAY · 240×` banner when replaying.
2. **"Needs you" strip:** overdue acks, L4, L3, stale at ≥L2 and low battery. Sorted by severity, then `levelSince`.
3. **Crew grid:** sorted by name. It never re-sorts live.
4. **Planner timeline.**

## Tile
- name
- level colour, number and icon
- the **supervisor's** action: "Send buddy" (L4), "Move to light task" (L3), "Allow shade break" (L2)
- last seen
- **one badge**, in priority order: overdue, then stale, then battery

| Tile state | Rule |
|---|---|
| No data | no status key (not started, declined or deleted). One neutral look, so nobody can tell who declined |
| Stale | 2 missed heartbeats (10 min live, 30 s time-lapse): last level shown **hatched** + a "stale" badge. Stale at ≥L2 also raises ack overdue |
| Ack due | "Ack due 0:22" countdown from `levelSince`. The window is 5 min live, 30 s time-lapse, on wall-clock time |
| Ack overdue | level ≥3, or stale ≥2, with no matching ack after the window |
| Acked | `ack.level >= status.level && ack.ackTs >= levelSince` |
| Low battery | "buddy check" prompt |
| Demo crew-mate | Replay only: drawn client-side with a SIM tag and a dashed border. Never in Live |

**"Help sent"** posts `POST /api/ack {workerId, level}`. On a 409 the button stays and the tile re-renders. The supervisor has **no control** that clears a worker's level or unwell lock.

## Polling
- 10 s live, 1 s in time-lapse, while the tab is visible, from session start until shiftEnd + 30 min. One MGET per poll.
- All timing uses the server `now` from each response.
- **Poll fails:**
  - A banner shows "Board offline since HH:MM, statuses frozen".
  - Stale and overdue calculation **pauses**.
  - Retries back off 1 → 2 → 4 s, capped at 30 s.
- **401/403:** polling stops and the board shows "Session not valid: start a new session".

## Planner timeline (read-only)
- an hourly WBGT heat strip across the shift
- the hatched 12:30–15:00 ban
- task blocks coloured by metabolic class (never alert colours)
- inserted rests
- the vulnerable profile's predicted-level line
- an **Unscheduled** tray with one reason per task
- `fetchedAt` for the forecast
- **"Planner off"** overlay: a comparison only, with counters for level ≥2 events and tasks completed. It is never sent to phones.

## Accessibility
- The board is fully keyboard operable in tile order, "Needs you" first.
- Focus rings are visible and themed from the tokens.
