# Antigravity brief: engine (paste this whole file as the first message)

> **Rewritten Thu 19 Nov** for the page-only demo. The first version, Sunday's (engine + store + API routes), was never started. The server parts are cut: the one-click demo runs entirely in the browser, so it only needs the pure engine below.

You are building the **engine** of **HeatShield**, a heat-safety web app for outdoor construction workers in Abu Dhabi (Next.js App Router + TypeScript). Use plain TypeScript; the engine has no dependencies.

The frontend already exists: the worker card, supervisor board, landing page and evidence page. The one-click demo will call your engine in the browser, minute by minute, for a replay of 15 Jul 2026. **Target: steps 1–6 green by 20:00 today (Thu 19 Nov).** Submission is tomorrow.

## Read first, in this order
1. `SPEC.md`: rules, precedence and glossary.
2. `docs/spec/02-engine.md`, all of it: time, WBGT, limits, budget, activity, levels, fallbacks, planner and constants.
3. `docs/spec/03-api-and-storage.md`, **only** the sections "Status rules" and "Ack rules" (for `lib/status.ts`). Skip auth, routes, tables and the store; they are cut.
4. `lib/types.ts`: the contract. Every shape you need is already there, including:
   - `EngineApi`, `EngineContext`, `EngineState`, `EngineEvent` and `EngineResult`;
   - `EngineParams`;
   - `PlanShift`, `PlannerInput` and `PlannerResult`;
   - `WeatherHour` and `WbgtHour`.
5. `tests/`: the acceptance tests. `tests/spec-params.ts` holds the constant values.

## What you own, and what you must not touch
- **You write only:**
  - `lib/engine/constants.ts`, `wbgt.ts`, `time.ts`, `physiology.ts`, `risk.ts`, `planner.ts` and `index.ts`;
  - `lib/engine/planner.test.ts`;
  - `lib/status.ts`.
- **Read-only, do not edit:**
  - `lib/types.ts`, `tests/` and `docs/`;
  - `data/` (fixtures, climatology and the `i18n` dictionaries);
  - `app/`, `components/` and `mocks/`;
  - `package.json` and every config file.
- **Do not create:**
  - `app/api/*`, `lib/store.ts`, `lib/auth.ts`, `lib/problem.ts` or `lib/weather.ts`;
  - anything under `supabase/`.

  The demo doesn't need them.
- **Ask first** before adding a dependency, and the answer will be no.
- If a test or type looks wrong, **stop and say which one and why**. Don't edit it, and don't loosen it to make it pass. The tests were hand-written from the spec, so that the code and the tests can't simply agree with each other.

## Build in this order
Done means `npm test` is green for the file named in each step.

| # | Build | Green when |
|---|---|---|
| 1 | `lib/engine/constants.ts`: `export const DEFAULTS: EngineParams`, with the values in `tests/spec-params.ts` (k = 0.15, provisional) | `tests/engine.test.ts` › constants |
| 2 | `lib/engine/wbgt.ts`: `wbgtHour(row: WeatherHour): WbgtHour` and `stullWetBulb(ta, rh)`. The formula and units are in spec 02: temperatures in °C, and wind in **m/h** inside the globe formula. | `tests/wbgt.test.ts` |
| 3 | `lib/engine/time.ts`: one `toSiteTime()` helper (Asia/Dubai, fixed UTC+4) | used by everything after |
| 4 | `lib/engine/{physiology,risk}.ts` + `lib/engine/index.ts` exporting `engine: EngineApi` | `tests/engine.test.ts` |
| 5 | `lib/status.ts`: pure `applyStatus(prev, input, now)` and `applyAck(status, body, now)` | `tests/status.test.ts` |
| 6 | `lib/engine/planner.ts`: `export const planShift: PlanShift` (spec 02, Planner), re-exported from `lib/engine/index.ts`, with your own tests in `lib/engine/planner.test.ts`. Include one test on the bundled 15 Jul weather (`data/fixtures/2026-07-13_to_18.json` → `wbgtHour`): a heavy sun task with an early `earliest` must be scheduled before the midday ban. | your tests |

`tests/fixtures.test.ts` is already green; keep it that way.

**Stretch, only after steps 1–6 are green and only once you have reported back:** `lib/sim/*`, the simulator in `docs/spec/08-evidence-simulator.md`, which writes `public/evidence.json`. The evidence page picks that file up automatically. The `npm run sim` script needs a `package.json` change, so ask first.

## Hard rules
- **Engine purity:**
  - `lib/engine` is pure and deterministic.
  - It steps in 1 sim-minute increments.
  - It never imports `lib/sim`, React or anything from `app/` or `components/`.
  - Every engine function takes `params` (default `DEFAULTS`), so calibration can inject values.
- **Time:**
  - No device-local `Date` getters (`getHours()`, …) and no `toLocale*` anywhere in `lib/`.
  - Tests run in both UTC and America/New_York.
  - Every timestamp is epoch ms. Site time comes only through `time.ts`.
- **Status privacy:** a status carries exactly `{workerId, level, simTs, lowBattery}`. No health data is stored server-side.
- **Commands:**
  - Run tests with `npm test` (`vitest run`, never watch mode).
  - The type check is `npm run typecheck`.
  - Do not start the dev server; another session is using port 3000.
- **Secrets:** they live in `.env.local`. Never print, log or commit them; the engine doesn't need any.

## Report back
At the end of each step, give:
- the test count (passed/failed);
- any test you think is wrong, and why;
- any spec ambiguity, together with the reading you chose.

**Checkpoint at 20:00:** if the engine tests aren't green by then, say which ones still fail and why, so the builder can decide whether to fall back.
