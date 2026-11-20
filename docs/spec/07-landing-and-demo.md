# 07 · Landing page and one-click demo (`/`)

Judges watch the video and then open the live link alone, so this page is the magical moment. It must work with **no phone, no QR and no setup**.

## Landing (one composition, no cards, no hero image)
- product name: HeatShield
- one sentence: "A returning worker is a new worker. HeatShield plans the shift around them."
- one button: **"Run the 15 July demo"**
- footer: a link to `/evidence` and the Open-Meteo attribution (CC BY 4.0)

## What the button does
1. Creates a **Replay** session:
   - weather: 15 Jul 2026
   - speed: **240×**
   - fixed demo worker **`W-DEMO`**
   - a fresh `sessionId`, which keeps concurrent judges apart
   - fasting-safe off
   - a 3 s countdown
2. Opens the **worker and supervisor views side by side** in one window.
3. Onboarding is pre-filled: English, `W-DEMO`, and consent shown once with **"Accept (demo)"**.
4. **Auto-follow advice** is on for the demo worker. It uses the simulator's compliance rule: rest 15 min at L≥2, light task at L3, stop at L4. The presenter taps only "I feel unwell".
5. Simulated crew-mates fill the board, Replay only, with a SIM tag and a dashed border.

## Demo harness drawer (not on the worker card)
- watch: on / off / drop, to show the sensor-failure fallback
- battery simulation
- auto-follow on/off
- In demo sessions, `tel:` shows a "Would dial 998" toast.

## As built (19 Nov)
- **Route and files:**
  - The landing button opens **`/demo`**.
  - The demo runs entirely in the page, with no API, store or sign-in: the "in-page store" fallback is the only store.
  - Code: `components/demo/DemoClient.tsx`; the scenario, crew and presenters are in `lib/demo/scenario.ts`, with tests.
- **Clock:** a 3 s countdown, then 06:00 → 18:00 at 240× (3 min). It ends with a "Shift over · Restart" panel.
- **Crew** (invented):
  - Ravi K. is the phone: a new arrival on day 1.
  - Five SIM crew-mates are on the board:
    - Abdul R., acclimatised;
    - Bilal A., back after 3 weeks away;
    - Joseph M., 57;
    - Manoj T., in double-layer coveralls;
    - Sunil P., who reported dark urine and so is floored at L1.
- **Tasks:** five tasks; the planner leaves "Tie rebar mats" as too hot.
- **Auto-follow** taps the card's main action: Rest at L2, "Switched to light task" at L3. At L4 the engine forces Rest.
- **Watch:** the phone's simulated watch sends a heart rate each sim-minute while it is on.
- **Drawer:**
  - watch, low battery and auto-follow, as listed above;
  - the phone language (EN/AR);
  - **Planner on/off.** Off restarts the day on the planner-off schedule, with a "PLANNER OFF · comparison run" badge. This is a demo-only exception to spec 06's "never sent to phones".
- **Engine numbers on 15 Jul**, for the vulnerable composite with the advice followed:
  - **planner on:** 0 level-2+ alerts, 4 of 5 tasks done;
  - **planner off:** 14 level-2+ alerts, 5 of 5 tasks done.

  With the planner on, the whole crew stays at L0–L1 all day. On camera, orange, STOP and "Needs you" come from the unwell tap, the watch dropping out, low battery, or the planner-off run.

### Role page (20 Nov)
`/start` asks "Who is using this screen?" and offers two choices:
- **I'm a supervisor** opens `/supervisor`;
- **I'm a worker** opens `/worker`.

A small link to `/demo` sits underneath. The landing page links to it as "Try it with a real phone", next to "See the evidence". The one-click demo stays the main button. See [04](04-client-session.md#qr-join-as-built-20-nov).

## Resilience
- On `503 store-unavailable` the demo switches to an **in-page store**, since worker and board share the window, and shows a small banner. The judged link never shows a dead board.
- The demo tokens are public by design. `/api/status` is rate-limited.

## Demo script (3 minutes), to be written today and tagged per feature
Tag every feature as **on-camera**, **rule/security** or **invisible**. Build invisible items only when a rule or security needs them. Planned beats:
1. A new-arrival worker on 15 July. The card turns yellow, then orange, and the planner had already moved heavy work earlier.
2. The same day for an acclimatised worker stays greener ("a returning worker is a new worker").
3. The "Needs you" strip lights up, followed by "Help sent".
4. Tap "I feel unwell": STOP, call buttons, and the supervisor can't clear it.
5. Watch drop: the engine plays safe and shows a reason chip.
6. Evidence page: the honest claim, fairness, and the robustness sweep.

## Checks
- `npm run smoke <url>` runs after every production deploy:
  - `/` returns 200
  - a headless Replay engine run matches the E1 golden window
  - a tokenless GET returns 401
  - one POST + GET round trip on a throwaway session
- Manual: a 2-minute run at 240× on the deployed URL in airplane mode after first load.
