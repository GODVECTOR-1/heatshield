<!-- Moved verbatim from PLAN.md lines 2067-2121 on 2026-11-14. -->
> Every auto-decision and user decision made during /autoplan.

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 1 | CEO | Mode = SELECTIVE EXPANSION | Mechanical | override | autoplan override | other modes |
| 2 | CEO | Accept E1 heat-day replay | Mechanical | P2 | November demo would be all green (probe) | live-only |
| 3 | CEO | Accept E2 time-lapse | Mechanical | P2 | 8 h shift unwatchable in a pitch | real time only |
| 4 | CEO | Accept E7 pre-shift check-in | Mechanical | P1 | Tier 1 promised but unbuilt | skip Tier 1 |
| 5 | CEO | Accept E11 vibration | Mechanical | P2 | native, 1 line, helps noisy sites | none |
| 6 | CEO | Accept E6 escalation | Taste | P1 vs P5 | closes "who acts" loop; adds state | no ack |
| 7 | CEO | Keep Vercel over Azure | Taste | P3 | simpler; Azure is a pitch nicety | Azure SWA |
| 8 | CEO | Cut /api/plan + /api/sim | Taste | P4, P5 | duplicates client engine | 5 routes |
| 9 | CEO | Defer SMS, BLE, DoH feed | Mechanical | P3 | new infra/hardware, outside radius | include |
| 10 | CEO | Queue Ramadan reframe as User Challenge | User Challenge | — | P4 premise challenged; user chose it | auto-change |

<!-- autoplan-baseline-edits:ceo {"sourceSha256":"96cc829a0188e39e2278fe68bebc1d311818f25abd0415a10ab25f56e41762f7","replacements":[{"oldText":"| `POST /api/plan` | shift planner: tasks + forecast → schedule |\n| `GET /api/sim?seed=` | simulator metrics for the evidence page |\n","newText":"| `POST /api/ack` | supervisor acks a level ≥3 status (`ackTs` on the worker's key) |\n"},{"oldText":"crews, workers (profile, acclim days, fasting flag), tasks, cached forecast","newText":"crews, workers (profile, acclim days), per-crew `fastingMembers` count, tasks, scenario + clock, medic number"},{"oldText":"worker posts `{workerId, level, action, unwell, ts}`. Actions only, no vitals","newText":"worker posts `{workerId, level, action, unwell, simTs}`. Actions only, no vitals"},{"oldText":"- Data: seeded JSON crews. Add shared storage (Upstash/Supabase) only if the demo needs a live phone → dashboard sync.","newText":"- Data: seeded JSON crews; shared status in Upstash Redis (24 h TTL)."}]} -->
| 11 | CEO | Accept spec-review fixes S1–S16 | Mechanical | P1, P2 | spec pass 1 FAIL 5/10; all in blast radius | leave gaps |
| 12 | CEO | Shrink E6 to board badge, drop safety officer | Mechanical | P5 | spec 4.1/4.2: under-costed, unapproved role | full escalation |
| 13 | CEO | Voice: speechSynthesis + tone fallback, not pre-recorded clips | Taste | P3 vs P1 | clips = 5 levels × 6 langs to record; tone fallback ships today | pre-recorded clips |
| 14 | CEO | Storage = Upstash Redis, 24 h TTL | Mechanical | P1 | serverless memory not shared (spec 2.1) | in-memory |
| 15 | CEO | Accept spec-pass-2 fixes S17–S39 | Mechanical | P1 | spec pass 2 FAIL 5/10; data-flow contradictions | leave gaps |
| 16 | CEO | Replace ECTemp Kalman with HR rule; ECTemp → TODOS | Mechanical | P5, P3 | costliest non-pitch module with no effect on level | keep Kalman |
| 17 | CEO | Fasting: drop the per-crew count; crew toggle in the session URL | Mechanical | P5 | count had no route and re-identified people in small crews | fastingMembers count |
| 18 | CEO | Drop phone-OS fairness group | Mechanical | P5 | delivery not modelled, so the gap is vacuous | keep group |
| 19 | CEO | Accept spec-pass-3 blocking fixes S40–S45 + polish S46 | Mechanical | P1 | 6 blocking, each 1–2 sentences; cap reached → spec not re-verified | leave blocking gaps |
| 20 | CEO | Demo crew drawn client-side, no POST | Mechanical | P5 | less code, keeps the 4-key payload | demo:true posts |
| 21 | CEO | Drop the Fajr/Maghrib table; fasting = whole daylight shift | Mechanical | P5 | planner no longer needs prayer times | bundled table |
| 22 | CEO | 0H document approval → A (approve, continue to 0I) | Mechanical | recommended | both docs reflect decisions; spec not re-verified recorded | revise/pause |
| 23 | CEO | Accept CEO-voice fixes S47–S53 | Mechanical | P1, P6 | voice C1/C2/H1/H2/H5/M2 within blast radius | ignore |
| 24 | CEO | Queue UC2 (lead with returning worker + planner) and UC3 (rename vs EU HEAT-SHIELD) | User Challenge | — | changes the user's chosen pitch pillars/name | auto-change |
| 25 | CEO | T-voice: keep speechSynthesis + tone (decision 13) vs bundled clips (voice M3) | Taste | P3 vs P1 | voice disagrees; surfaced at gate | — |
| 26 | CEO | Web Push → TODOS | Mechanical | P3 | roadmap only (voice M4) | build now |
| 27 | CEO | Atomic status/ack compare required | Mechanical | P1 | Section 4 race | non-atomic |
| 28 | CEO | Queue offline DELETE | Mechanical | P1 | Section 4 gap | wipe local only |
| 29 | Design | Accept D1–D12, D14, D15 structural fixes | Mechanical | P5, P1 | missing states/hierarchy; safety (delivery truth, L4 drain) | leave to v0 defaults |
| 30 | Design | Level palette (D3 hex values) | Taste | P5 | contrast-checked ≥7:1; other palettes viable | shadcn defaults |
| 31 | Design | Noto Sans family (D13) | Taste | P1 | covers all 6 scripts | system fonts |
| 32 | Design | Skip /design-consultation; TOKENS in SPEC.md | Mechanical | P5, P3 | 6-day build | full DESIGN.md |
| 33 | Design | Precompute evidence JSON | Mechanical | P5 | deterministic, offline, no loading state | live compute |
| 34 | DX | Persona = AI coding agents (v0, Antigravity) + solo integrator | Mechanical | P6 | they consume SPEC/types; judge path already ~15 s | human dev persona |
| 35 | DX | TTHW target Competitive (<5 min, goal 3) | Mechanical | P5 | fewest steps with in-memory fallback | Champion <2 min |
| 36 | DX | Accept X1–X14 | Mechanical | P1 | 3×CAP4 silent-success paths, CAP6 recoveries | leave gaps |
| 37 | DX | SPEC conflict resolutions in X7 | Mechanical | P5 | later, more specific rule wins | ask per conflict |
| 38 | Eng | Structure: smaller arrangement (engine 6 + sim 2) | Mechanical | P5 | same scope, fewer moving parts | original 8 engine files |
| 39 | Eng | Accept Y1–Y17 | Mechanical | P1, P5 | 6 High spec bugs + medium safety/race fixes | leave as written |
| 40 | Eng | Supervisor-owned weather+schedule snapshot (design-twice shape B) | Mechanical | P5 | removes split ownership | phone fetch + planner |
| 41 | Eng | Service worker: Serwist vs hand-written | Taste | P1 vs P5 | Serwist auto-precaches prerendered routes; adds a dependency | — |
| 42 | Eng | Collect all deferred items into TODOS.md | Mechanical | override | eng runs last | — |
| 43 | Gate | rev 1 reply `rec`: uc1a uc2a uc3a c1a d1a–d7a p1b | User decision | — | owner answered via AskUserQuestion 14 Nov | as-is |
| 44 | Gate | B2: apply uc1a/uc2a as Y18/Y19 (+ Y20 taste), re-run Eng, re-present gate | Mechanical | autoplan B2 | accepted User Challenges change the plan | skip rerun |
| 45 | Eng rerun | Accept Z1–Z17 | Mechanical | P1, P5 | rerun voice: degenerate July evidence, gap-as-rest safety, Serwist /api cache, units, SPEC conflicts | leave as written |
| 46 | Eng rerun | Ack in own key (drops Lua CAS) | Mechanical | P5 | one writer per key removes the race | Lua CAS |
| 47 | Eng rerun | Session record instead of fat QR fragment | Mechanical | P5 | fixes simTs window + QR density | fragment payload |
