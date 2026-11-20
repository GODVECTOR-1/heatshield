# 12 · Pitch and deck

The submission is a **3-min video + a live link** that judges explore alone (gate c1a). The video follows the demo script in [07](07-landing-and-demo.md#demo-script-3-minutes-to-be-written-today-and-tagged-per-feature).

## One line
> **A returning worker is a new worker. HeatShield knows the difference and plans the shift around them.**

## Story order
1. **The problem:** most heat deaths come in a worker's first days in the heat. Gulf migrant workers become "new" again after every home leave. Supervisors only have generic temperature rules and the midday ban.
2. **Acclimatisation-aware budgets:** each worker has their own limit and ramp.
3. **The shift planner:** heavy work goes into lower-risk slots. It helps even with phones in pockets, and supervisors adopt it because there are fewer stoppages.
4. **The safety net:** graded phone alerts, an unwell lock nobody can override, and "Help sent".
5. **Evidence:**
   - the planner result: "21 % fewer overheating events and 30 % more work done";
   - the plain verdict that, as a warning alone, the engine doesn't beat a single threshold;
   - the two fairness tests that fail.

   Don't quote "83 % vs 8 %": with a 98 % false-alarm rate it misleads.
6. **Supporting points:** Fasting mode, works offline, 6 languages, privacy by design.

## Slides that must exist
- **Judging rubric map:** each part of the story mapped to a criterion.
- **Comparison:**
  - OSHA-NIOSH Heat Safety Tool: heat index, not personal
  - Kenzen / SlateSafety: paid wearables, supervisor sees health data
  - EU **HEAT-SHIELD** project: prior work, cited
  - HeatShield: acclimatisation + planner + privacy, no hardware needed
- **Who pays:** contractor HSE teams under the MoHRE midday-break rule, and main contractors.
- **Why a deterministic engine, not AI:** explainable, testable alerts are the right tool for safety. Every level shows its reason.
- **Privacy:** answers stay on the phone; the supervisor sees a colour only; never used for discipline; 24 h TTL.
- **Roadmap** (from [../../TODOS.md](../../TODOS.md)):
  - Web Push for screen-off alerts
  - SMS/WhatsApp
  - real BLE heart-rate straps + ECTemp
  - anonymised feed into DoH Population Health Intelligence
  - UAE-hosted deployment (Azure UAE North)

## Fasting mode line (optional)
"Ramadan returns to the hottest months just as summers get hotter." It is a supporting point, not a pillar: Ramadan 2027 falls 8 Feb to 9 Mar.

## Honesty lines (say them; judges respect them)
- The evidence uses our own truth model. It illustrates, it doesn't prove.
- The WBGT model isn't validated by the simulator.
- Screen-off alerts are unreliable on phones; the buddy system and the planner cover that gap.
- Translations are machine-made, with a native check for Arabic and Urdu.
