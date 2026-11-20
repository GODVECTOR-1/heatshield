# 00 · Product

**HeatShield**: heat-risk safety for outdoor workers. Future Health Digital Innovation Challenge 2026, Challenge 07 (Climate-Resilient Worker Health). Solo build, submitted **Fri 20 Nov 2026** as a 3-min video plus a live link.

## Pitch (gate uc2a)
> **A returning worker is a new worker. HeatShield knows the difference and plans the shift around them.**

- **The story:** acclimatisation-aware personal heat budgets, plus a shift planner that moves heavy work into cooler hours.
  - Most heat deaths happen in a worker's first days in the heat.
  - Gulf migrant workers become "new" again after every home leave.
- **The safety net:** graded phone alerts (5 levels) with one action each.
- **Supporting points:**
  - Fasting mode (gate uc1a, for any daylight fast, including Ramadan)
  - works offline
  - 6 languages
  - privacy by design
- **Evidence headline:** the planner result: fewer overheating events and more work done when the shift is planned around the heat, worded honestly. It changed on 19 Nov from unacclimatised sensitivity, which the simulation did not support. See [08-evidence-simulator.md](08-evidence-simulator.md).
- **Name:** HeatShield stays. The EU Horizon 2020 project HEAT-SHIELD is cited as prior work (gate uc3a).

## What it does
1. **Personal heat budget** (0–100) per worker. It drains when effective WBGT is above that worker's limit and recovers in shade. It carries over to the next day.
2. **Acclimatisation.** A new arrival ramps 20 %/day over 5 days. A worker back from ≥7 days away ramps 50/60/80/100 % over 4 days.
3. **Shift planner.** The supervisor's screen schedules the crew's tasks in 15-min slots. Heavy work goes where predicted risk stays low, and the planner respects the UAE midday ban (12:30–15:00, 15 Jun–15 Sep).
4. **Worker phone app.** One colour card with one action, a delivery line, and an "I feel unwell" button that nobody else can override. It works offline.
5. **Supervisor board.** A "Needs you" strip, a crew grid and a "Help sent" ack. The supervisor sees the alert colour only, never health data.
6. **Evidence page.** A simulator compares the engine with a generic single-threshold rule, with fairness checks by group.
7. **One-click demo.** A `/` landing page replays 15 Jul 2026 at 240× in one window: worker and supervisor side by side.

## Alert levels
| Level | Colour | Worker action | Fasting-mode wording |
|---|---|---|---|
| 0 | green | normal, hydrate on schedule | pace yourself, take shade breaks |
| 1 | yellow | drink water now | shade + cooling towel |
| 2 | orange | rest 15 min in shade ("I'm in the shade") | same |
| 3 | red | cool down + switch to a light task | same |
| 4 | purple, "STOP" | stop; call the medic or a buddy | same |

Tokens, icons and contrast: [09-design-system.md](09-design-system.md). Exact level rules: [02-engine.md](02-engine.md).

## Challenge rules → where they're met
| Rule | Where |
|---|---|
| Screening, not diagnosis | Level 4 hands off to a human medic or 998: [05-worker-app.md](05-worker-app.md) |
| Privacy and consent; never shared with employers or used for discipline | [13-privacy-safety.md](13-privacy-safety.md) |
| UAE culture and religion; multilingual; low literacy | Fasting mode, 6 languages + RTL, icon-first UI: [05](05-worker-app.md), [09](09-design-system.md) |
| Evidence and fairness on simulated cases | [08-evidence-simulator.md](08-evidence-simulator.md) |
| Weak network, low battery, safe fallback when sensors fail | [04-client-session.md](04-client-session.md), [02-engine.md](02-engine.md) |
| Worker safety before productivity | The unwell lock and "missing input = worst value" rule |

## Not in scope (this build)
- SMS/WhatsApp alerts
- real BLE heart-rate straps
- ECTemp core-temperature estimate
- DoH aggregate feed
- Web Push
- a full DESIGN.md
- per-worker auth beyond trust-on-first-use

All are listed with context in [../../TODOS.md](../../TODOS.md).
