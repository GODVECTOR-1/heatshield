# Heat-constant go/no-go (Sat 14 Nov 2026, Z1)

**Verdict: GO.** Spec edits: [02](../spec/02-engine.md) has the verified WBGT formula and provisional k; [08](../spec/08-evidence-simulator.md) pins the evidence windows to 25–29 May and 8–12 Oct.

> Rev 2, same day. Rev 1 had a bug: the shift was mapped onto the 12:00–24:00 weather, which made October look "always on". This revision replaces all of rev 1's numbers.

- **Data:** Open-Meteo archive, Abu Dhabi (24.45, 54.38), 1 Apr – 7 Nov 2026, hourly. 5,304 rows, 0 nulls.
- **Script:** [`heat_check.py`](heat_check.py), plain Python with no dependencies. The fetch URL is in its docstring.
- **Spreadsheet** (CSV, opens in Excel) in [`heat-check/`](heat-check/):

| File | One row per | Contents |
|---|---|---|
| `hourly.csv` | site hour | inputs, Tw (Open-Meteo vs Stull), Tg, WBGT sun/shade |
| `daily.csv` | day | WBGT max/mean; B1 on-fraction, first-on and switches at 28.2/30/32; max Δ and minutes over limit per profile × task |
| `budget.csv` | day × profile × task × k × pattern | min budget, first time at L1–L4 |

**Assumptions**
- Shift 06:00–18:00 site time, sun work from 06:00, start budget 100 (Replay).
- Midday ban (15 Jun–15 Sep) counts as shade Rest.
- `45/15` means 45 min work, then 15 min shade Rest (+2/min), every hour.

## 1. WBGT formula: verified
The Dimiceli (2011) globe constants match the open-source `pywbgt` package (`src/pywbgt/dimiceli.py`, K. Wodzicki, NCICS), which implements Dimiceli, Liljegren and Bernard. The paper PDFs could not be read here.

```
Tg = (B + C·Ta + 7.68e6) / (C + 2.56e5)
B  = DNI/(4σ) + 1.2·diffuse/σ + 0.575·e_a^(1/7) · Ta^4
C  = 0.315 · u^0.58 / 5.3865e-8
```

| Symbol | Unit | Note |
|---|---|---|
| Ta, Tg | **°C**, not K | this is why the formula linearises around 40 |
| u | **metres per hour** | wind at 2 m |
| e_a | hPa | |
| σ | — | 5.67e-8 |

The paper's direct term, S·f_db/(4σ cos z), equals DNI/(4σ). Open-Meteo serves `direct_normal_irradiance_instant`, so **the engine needs no sun-position code and no cos z clamp**.

**Sanity checks**
- Tg − Ta averages +7.4 °C when SW > 600 W/m² (range 3.6–18.9). At night Tg ≈ Ta.
- 15 Jul sun WBGT: 29.2 at 06:00, 33.9 peak at 14:00, shift mean 32.3. Shade runs 29.2 → 32.7.
- Stull vs Open-Meteo wet bulb: mean |Δ| 0.06 °C, max 0.27. The fallback sits well inside ±1.5.

**Known bias:** Tnwb is the *psychrometric* wet bulb, so it ignores sun. Sun minus shade WBGT is only 0.2·(Tg − Ta), about 1–2 °C, so sun WBGT probably reads about 1 °C low. The spec accepts this; Liljegren is the stretch fix.

## 2. Evidence windows: 25–29 May and 8–12 Oct
Monthly mean fraction of the shift with B1 on (sun WBGT ≥ threshold):

| Month | ≥ 28.2 | ≥ 30 | ≥ 32 |
|---|---|---|---|
| Apr | 0.02 | 0.00 | 0.00 |
| May | 0.39 | 0.13 | 0.00 |
| Jun | 0.94 | 0.63 | 0.09 |
| Jul | 0.97 | 0.87 | 0.37 |
| Aug | 0.99 | 0.91 | 0.68 |
| Sep | 0.95 | 0.76 | 0.28 |
| Oct | 0.68 | 0.33 | 0.06 |
| Nov 1–7 | 0.24 | 0.01 | 0.00 |

A shoulder only exists relative to a threshold, and B1's threshold is tuned on seed 7. So the two windows are chosen to cover thresholds from 28.2 to 30 between them.

Daily on-fraction:

| Window | ≥ 28.2 | ≥ 30 | Shoulder at |
|---|---|---|---|
| **25–29 May** | 0.85 / 0.87 / 0.89 / 0.89 / 0.91 | 0.61 / 0.33 / 0.32 / 0.62 / 0.52 | 30 |
| **8–12 Oct** | 0.79 / 0.70 / 0.72 / 0.48 / 0.87 | 0.69 / 0.28 / 0.30 / 0.00 / 0.51 | 28.2 |

If B1 tunes above about 31, both windows go "always off" for it. The `B1 sensitivity < 100 %` sanity test and the page text cover that case.

## 3. Drain k: provisional default 0.15 (calibration grid 0.05–0.3)
With Δ-drain plus rests, the hourly budget change is 2·rest_min − k·Δ·work_min. A 45/15 cycle is sustainable only while **Δ < 0.67/k**: 6.7 °C at k = 0.1, 4.4 °C at 0.15, 3.3 °C at 0.2. The outcome is near-binary: the budget either recovers to 100 or drains to 0, and L2/L3 are transient.

**15 Jul, continuous work, no rests**
- Every heavy profile reaches L4 at any k ≥ 0.05. Acclimatised-moderate reaches L4 at k ≥ 0.1.
- That is correct per NIOSH: Δ is +1 to +6 °C even over REL.
- New vs acclimatised heavy, first L2:

| k | New | Acclimatised | Gap |
|---|---|---|---|
| 0.05 | 08:38 | 10:12 | 94 min |
| 0.1 | 07:25 | 08:28 | 63 min |
| 0.15 | 06:58 | 07:47 | 49 min |

**15 Jul, 45/15 (the demo needs rests, i.e. the planner)**

| k | New heavy | Returning heavy | Acclimatised heavy | Acclimatised moderate |
|---|---|---|---|---|
| 0.1 | L2 (11:39) | L2 (17:41) | L1 | L0 |
| **0.15** | **L4 (07:44)** | **L4 (09:34)** | **L3 (11:42)** | **L1** |

At 0.15 the line "a returning worker is a new worker" holds.

**Shoulder windows, 45/15, max level per day**

| k | New heavy, May | New heavy, Oct | Acclimatised heavy, May | Acclimatised heavy, Oct |
|---|---|---|---|---|
| 0.1 | 21111 | 21112 | 10000 | 10000 |
| **0.15** | **44444** | **44424** | **20111** | **21101** |

k = 0.1 barely separates; 0.15 separates clearly.

**Days where new heavy reaches ≥ L2 and acclimatised heavy stays ≤ L1 (45/15):**

| k | May | Jun | Jul | Aug | Sep | Oct | Nov 1–7 |
|---|---|---|---|---|---|---|---|
| 0.1 | 1 | 8 | 24 | 30 | 23 | 9 | 0 |
| **0.15** | 13 | 25 | 12 | 1 | 11 | 20 | 2 |
| 0.2 | 17 | 11 | 0 | 0 | 2 | 18 | 7 |

**E1 checks**
- **Replay** (new day-1, heavy, double-layer woven +3, 15 Jul): first L2 at 07:51 (k 0.05), 06:57 (0.1), 06:38 (0.15). **Before 11:00 ✔** at any k.
- **November live** (acclimatised moderate, Live start 80, continuous): **7 Nov stays ≤ L1 at every k ✔**. 7 Nov is the latest archive day, nearest to the 20 Nov demo, and is the E1 fixture.
  - The hot days 4–5 Nov (sun WBGT up to 30.2) reach L2–L3 at k ≥ 0.1 *without rests*.
  - With 45/15 they stay ≤ L1 up to k = 0.2.
  - Honest consequence: a Live demo on a hot November day can show orange for continuous work.

## Watch item for Wed calibration (not changed)
Rest recovers +2/min regardless of shade WBGT. On 15 Jul shade is 29–33 °C, above every RAL, yet rest still recovers fully. This is what makes outcomes near-binary and k-sensitive.

If one k can't hold the Replay contrast and the shoulder separation together, the smallest fix is: **Rest +2/min only when shade r < 1, else +1/min**. That is one constant, plus a sensitivity line on `/evidence`.
