# 08 · Evidence and simulator (`lib/sim/*`, `/evidence`)

## Honest claim (changed 19 Nov, after the seed-42 run)
The page leads with the **planner result** (closed loop, planner on vs off). The sentence is built from the report, so the words can't outrun the numbers. On the 19 Nov run it reads:
> "21 % fewer overheating events and 30 % more work done when the shift is planned around the heat."

Three figures sit under it: overheating events −21 % (465 vs 587), orange-or-worse alerts −99 % (133 vs 12,058) and tasks completed +30 % (11,350 vs 8,728).

**Why the claim changed:** the original headline was unacclimatised sensitivity ("83 % vs 8 %"). It is not supported:
- **The engine is not a better warning on its own.** It alerts on 97.6 % of worker-days with no event. On sensitivity minus false alarms, neither the engine (−0.13) nor B1 (−0.17) beats chance.
- **Why it alerts so often:** the detection day has no planned breaks, and light shade work sits just above the passive-recovery cutoff (r ≈ 0.93 against 0.9), so nearly everyone reaches L2.
- **The robustness sweep is flat:** the engine stays at 77–86 % from 0× to 2×. Its catch rate does not come from knowing about acclimatisation.
- **The data was not tuned to fix it:** the report was taken as it was, and no re-run was done to improve it.

The page also says plainly:
- the truth model is ours
- the evidence doesn't validate the WBGT model itself
- as a warning alone, neither the engine nor a single threshold beats chance (a computed verdict above the engine-vs-B1 charts)
- a failed fairness test is shown openly, with its fix (age and PPE fail on the 19 Nov run)

## Truth model (`lib/sim/truth.ts`, must not import engine physiology)
- A heat-storage model with per-worker sweat capacity ~ N(1.0, 0.15).
- Factors:
  - age: −0.5 % per year over 40
  - fasting: −10 % fluid
  - acclimatisation: +2.5 % per day, up to +25 %
  - PPE: its clothing adjustment
- A **truth event** is a core temperature ≥ 38.5 °C.
- Hourly WBGT is precomputed into the bundled weather as shared input. "No shared code" applies to physiology code only.

## Weather windows (from the Open-Meteo archive, bundled)
- **Evidence:** shoulder weeks **25–29 May 2026** and **8–12 Oct 2026**, when a single threshold switches on and off during the day.
  - Between them they cover B1 thresholds from 28.2 to 30: October is the shoulder at 28.2 (REL at 300 W), May at 30.
  - In July it is on all shift, every day, so the comparison would be meaningless.
- **Replay demo:** 15 Jul 2026. The 13–18 Jul fixtures are also bundled.
- **Files** (`WeatherHour[]`, whole site-time days): `data/fixtures/2026-07-13_to_18.json`, `2026-05-25_to_29.json`, `2026-10-08_to_12.json` and `2026-11-07.json` (the E1 November live day). Regenerate them with `docs/analysis/make_fixtures.py`; `tests/fixtures.test.ts` checks for zero nulls, contiguous hours, plausible ranges and the climatology grid.
- **Saturday go/no-go: done, GO.** See [heat check](../analysis/heat-check.md) and the CSVs in `docs/analysis/heat-check/`.
  - A shoulder only exists relative to a threshold. If seed-7 tuning moves B1 above about 31, both windows go always-off for it. The `B1 sensitivity < 100 %` test is the guard, and the page says so.
  - The engine/acclimatisation contrast needs rests. Under continuous sun work in July, every profile reaches L4, so detection is open-loop on planner-off, but the Replay demo runs with the planner on.

## Runs
- **Population:** 200 workers × 5 days. Raise it (e.g. 2000) if any group has fewer than 30 events.
- **Seeds:** **7** for calibration, **42** for the reported results.
- **Calibration:**
  - On seed 7, tune k and the level thresholds for the engine.
  - **Tune B1's single threshold with the same objective.**
  - Freeze both, then run seed 42.
- **What the simulated engine sees:** Tier 0 + 1, with the check-in sampled from truth hydration and no heart rate.
- **Detection** runs **open-loop**: alerts don't change the truth, and workers follow the planner-off schedule.
- The **planner metric** runs **closed-loop** with the compliance rule: rest 15 min at L≥2, light task at L3, stop at L4.

## Baselines
- **B0:** the midday ban only, with no alerts. Shown as a reference.
- **B1:** one generic WBGT threshold for everyone, tuned on seed 7.

## Metrics (unit: worker-day)
- **Sensitivity:** truth-event days with a level ≥2 alert active within the 60 min before the event, divided by all truth-event days.
- **False-alarm rate:** alerted days with no truth event, divided by non-event days. Needs ≥30 non-event days.
- **Lead time:** event time minus the *onset of the alert episode*, capped at 60 min.
- **Fairness groups:** age band, acclimatised or not, fasting, PPE. Pass = a gap of **≤10 pp** on both sensitivity and false alarms. A group with fewer than 30 events shows "insufficient".
- **Robustness sweep:** truth-model acclimatisation and fasting effect sizes from 0 to 2×, showing where the engine's advantage disappears.
- **Planner metric:** planner on vs off, comparing tasks completed, level ≥2 events and truth events.

## Output
- `npm run sim` writes the committed **`public/evidence.json`**, which includes a **hash of DEFAULTS**. A vitest fails if the hash doesn't match the current constants.
- Golden comparisons use a tolerance.

Sanity tests:
- runs are deterministic for seeds 7 and 42
- **B1 sensitivity < 100 %**
- `lib/engine` never imports `lib/sim`

## `/evidence` page order
1. the honest claim (the planner result) plus its qualifier and three figures
2. the planner metric: planner on vs off charts
3. "As a warning alone": a computed verdict, then engine vs B1 (sensitivity, false alarms, lead time)
4. fairness with a ±10 pp band. Cells marked "insufficient" are hatched; a failed test gets a red outline and its fix text
5. the robustness sweep, with a one-line reading
6. limitations

The page loads instantly offline because the JSON is precomputed. Alert colours are never used for chart series.
