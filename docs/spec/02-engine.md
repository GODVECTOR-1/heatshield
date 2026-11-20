# 02 · Engine (`lib/engine/*`)

Pure TypeScript with no dependencies. The phone, the supervisor and the simulator all use the same code. The API it implements is `EngineApi` in [`lib/types.ts`](../../lib/types.ts): `initState`, `applyEvent` and `advanceTo`, with the state, context, events and result all typed there. **`lib/engine/index.ts` exports `engine: EngineApi`**, and `constants.ts` exports `DEFAULTS: EngineParams`. The hand-written tests in `tests/engine.test.ts` are the acceptance check. Every function takes `params = DEFAULTS` from `constants.ts` so calibration can inject values. Every constant is an `[estimated]` calibration knob.

## Time (`time.ts`)
- Site time is **Asia/Dubai, fixed UTC+4, no DST**.
- `simTs` is epoch ms.
- One `toSiteTime()` helper handles every local-time rule.
- No device-local `Date` getters or `toLocale*` anywhere in `lib/`; a lint rule enforces this.
- The engine steps in **1 sim-minute** increments. Time is injected, so tests run in milliseconds.

## WBGT (`wbgt.ts`, used by the supervisor and the simulator)
- WBGT = 0.7·Tnwb + 0.2·Tg + 0.1·Ta, with the globe temperature Tg from the **Dimiceli (2011)** closed form. The constants are verified against `pywbgt/dimiceli.py`; see [heat check](../analysis/heat-check.md#1-wbgt-formula-verified).
  - `Tg = (B + C·Ta + 7.68e6) / (C + 2.56e5)`
  - `B = DNI/(4σ) + 1.2·diffuse/σ + 0.575·e_a^(1/7)·Ta^4`
  - `C = 0.315·u^0.58 / 5.3865e-8`
  - Units: Ta and Tg in **°C** (not K), u in **m/h**, e_a in hPa, σ = 5.67e-8.
- Tnwb comes from the psychrometric wet bulb: Open-Meteo `wet_bulb_temperature_2m`, or Stull from T/RH when that field is missing. Stull is within 0.3 °C of Open-Meteo. The stated tolerance is **±1.5 °C**. Known bias: the psychrometric wet bulb ignores sun, so sun WBGT reads about 1 °C low.
- Inputs: T, RH, wind, **`direct_normal_irradiance_instant`** and **`diffuse_radiation_instant`**.
  - Wind: u2 = 0.75·u10, clamped to ≥ 0.5 m/s.
  - DNI already equals S·f_db/cos z, so there is no sun-position code and no cos z clamp.
- Shade WBGT (for `sun:false` tasks and rest) uses DNI = diffuse = 0.
- API: `wbgtHour(row: WeatherHour): WbgtHour` and `stullWetBulb(ta, rh)`. `WeatherHour` is in `lib/types.ts`.
  - A non-finite input makes both sun and shade null.
  - A null or non-finite `tw` falls back to Stull.
  - Cases: `tests/wbgt.test.ts`, e.g. 15 Jul 13:00 gives sun 33.83, shade 32.05 (±0.05).
- The engine reads the WBGT for a minute by **linear interpolation** between the hourly `WbgtHour` values. It holds the first and last values outside them.
- `WBGT_METHOD` constant: the approximation ships first; Liljegren is a Wednesday stretch goal.

## Limits (`physiology.ts`)
- NIOSH, with M in watts: **RAL = 59.9 − 14.1·log10(M)** and **REL = 56.7 − 11.5·log10(M)**.
- M by task class: light 180, moderate 300, heavy 415, veryHeavy 520.
- Effective WBGT = WBGT + clothing adjustment: work clothes 0, cloth coveralls 0, double-layer woven +3, polyolefin coveralls +1, hood +1.
- Limit = RAL + ramp% × (REL − RAL). This mapping is a HeatShield assumption, marked `[estimated]`.
- Ramp%:
  - new worker: 20 % per day over 5 days
  - returning after ≥7 days away: 50 / 60 / 80 / 100 % over 4 days
  - 1–6 days away: no reset
- Seeded acclimatisation days are static; they don't advance day to day.

## Budget
- Range **0–100**, always clamped.
- **Drain** per sim-minute = k·max(0, Δ), where Δ = effective WBGT − limit in °C. k comes only from the seed-7 calibration ([08](08-evidence-simulator.md)).
- **Fasting mode**: drain × 1.25.
- **Recovery**:
  - Rest in shade: +2 per minute.
  - Passive: +0.5 per minute when r = effective WBGT ÷ limit < 0.9 and the activity isn't heavy.
- **Start of day**:
  - Replay: 100.
  - Live with yesterday's record: 100 − 0.3 × deficit (deficit = 100 − the last persisted budget for that site-date).
  - Live without a record: **80**.
  - Late join: the budget starts at join time.
- **Check-in deductions**, applied after the start value:
  - Poor sleep: −10, only when reported.
  - Urine: pale 0, medium −5, dark −15, and dark also floors the level at L1.
  - **Skipped** check-in: counts as dark urine only. Unwell stays "unknown", never "yes".
- Any non-finite input or derived value (limit, r, Δ) counts as **missing**. It falls back to the worst plausible value and shows a reason chip.

## Activity
- The default activity is the class of the scheduled task (`veryHeavy` maps to the Heavy icon).
- **Rest** applies only to:
  - planner-inserted rests
  - the midday ban for sun tasks
  - worker taps
- Every other gap uses the last task's class, or *moderate in sun* when there is none. An empty task list never produces recovery.
- A Rest tap reverts to the scheduled class after 15 sim-min. Exception: at L4, Rest is forced and never reverts. That rule lives in the session/UI layer, not the engine.
- Engine steps run only inside the crew's shift window. Exception: unwell and latch timers always run on the sim clock.

## Levels
- Bands are half-open: **[75,100] → 0 · [50,75) → 1 · [30,50) → 2 · [15,30) → 3 · [0,15) → 4**.
- A level **rises at once**. It **falls** only after 5 sim-min in the lower band, and only once the budget is 3 points past the boundary.
- A budget-driven **L4 latches** until the worker taps "I'm OK, buddy checked". That button enables after ≥15 sim-min of Rest and a budget ≥ 18.
- **Unwell**, tapped at any time (pre-shift included), means L4, locked. Only the worker can clear it, with "I'm OK, buddy checked". After clearing, the level is the computed one but never below 2 for 15 sim-min. The supervisor and the engine can never clear it.
- **Tier 2 heart rate** (simulated watch):
  - HR > 0.85·(220 − age) sustained for 5 sim-min sets the level to at least 2.
  - Watch *off*: no Tier 2 and no penalty.
  - Watch *drop*: HR data older than 2 sim-min while the watch is on. Tier 2 is dropped and the unacclimatised limit (RAL) applies until it returns. It never discards Tier 1.
- **Composition** (`risk.ts`):
  `level = unwell ? 4 : max(hysteresis(budget), latch4, urineFloor, hrFloor, postUnwellFloor)`

## Fallbacks
| Missing | Use |
|---|---|
| Forecast row for the current hour (Live) | 12×24 month-by-hour p95 climatology for sun/shade (`data/climatology.json`, type `Climatology`, 2021–2025 archive); reason chip "no forecast: worst case". Replay is exempt |
| No stored session at all | Tier 0 at worst values: climatology, unacclimatised. Show the 998 button |
| Null/NaN field in a weather row | Same as a missing row |
| Watch data stale | Watch-drop rule above |

**Confidence** = the set of tiers present (Tier 0 forecast + task + profile, Tier 1 check-in + taps, Tier 2 watch), shown as chips in the menu.

## Planner (`planner.ts`, runs on the supervisor)
- One **chronological scheduler on 15-min slots** across the shift. It simulates a composite *vulnerable profile*: lowest ramp %, highest clothing adjustment, and × 1.25 drain if the crew is fasting-safe.
- At each slot it picks the **heaviest remaining feasible task** whose predicted level stays < 2. Otherwise it picks a lighter one, otherwise it inserts a 15-min shade Rest.
- A task is feasible when it is inside its `earliest`/`latest` window and is not a sun task during the midday ban (12:30–15:00, 15 Jun–15 Sep).
- Leftovers go to **Unscheduled** with a stable reason code: `ban-window`, `too-hot`, `no-slot` or `past-latest`.
- "Planner off" (comparison only): tasks run in their given order from shift start, with the ban still enforced.
- The scheduler is deterministic. Its output is stored in the session record.

## Constants (`constants.ts`, all `[estimated]`)
| Name | Value |
|---|---|
| k (drain per °C over limit per min) | from seed-7 calibration; grid 0.05–0.3, provisional default **0.15** (see [heat check](../analysis/heat-check.md#3-drain-k-provisional-default-015-calibration-grid-00503)) |
| Fasting drain multiplier | 1.25 |
| Rest recovery | +2/min |
| Passive recovery | +0.5/min when r < 0.9, not heavy |
| Start budget, no record | 80 |
| Carry-over factor | 0.3 |
| Level bands | 75 / 50 / 30 / 15 |
| Hysteresis | 5 sim-min + 3 points |
| "I'm OK" enable at L4 | 15 sim-min Rest + budget ≥ 18 |
| Post-unwell floor | L2 for 15 sim-min |
| HR rule | 0.85·(220 − age), 5 sim-min |
| Metabolic W | light 180, moderate 300, heavy 415, veryHeavy 520 |
| Clothing adjustment | work 0, cloth coveralls 0, double-layer woven +3, polyolefin +1, hood +1 |
