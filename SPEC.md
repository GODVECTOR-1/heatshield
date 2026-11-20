# HeatShield SPEC (entry point)

This is the build contract for v0, Antigravity and the builder. The rules live in [`docs/spec/`](docs/spec/), one file per area. The types live in [`lib/types.ts`](lib/types.ts). This page covers what applies everywhere.

## Rules that apply everywhere
1. **`lib/types.ts` is the contract.** Only the builder edits it. v0 and Antigravity import it and never redefine its shapes.
2. **The spec files are current rules only.** If two seem to disagree, the more specific file wins (engine beats overview). Report the conflict; don't pick silently.
3. **Safety rules never bend:**
   - a missing input means the worst plausible value
   - an unwell tap can only be cleared by the worker
   - nothing lets a supervisor lower a level
   - see [13-privacy-safety](docs/spec/13-privacy-safety.md)
4. **Time:** every timestamp is epoch ms (UTC). Site time is Asia/Dubai, fixed UTC+4, so convert only through `lib/engine/time.ts`. `MinuteOfDay` values (shifts, task windows) are site-time minutes after midnight.
5. **No secrets in code or logs.** Tokens go only in `Authorization: Bearer`. `.env.local` is gitignored.
6. **Every string the worker sees is a `t(key)`.** Use logical CSS for RTL.
7. **Changing a rule:** edit the matching `docs/spec/` file (and `lib/types.ts` if a shape changes), never `docs/review/`.

## Glossary
| Term | Meaning |
|---|---|
| **WBGT** | Wet-bulb globe temperature, °C. Comes as *sun* and *shade* values per hour in the session record |
| **Effective WBGT** | WBGT + clothing adjustment |
| **Limit** | The worker's personal WBGT limit: RAL + ramp% × (REL − RAL) |
| **Δ** | Effective WBGT − limit, °C. Drain = k·max(0, Δ) per sim-minute |
| **Budget** | 0–100 heat budget per worker; it sets the level through bands 75/50/30/15 |
| **Level** | 0 green · 1 yellow · 2 orange · 3 red · 4 purple "STOP" |
| **Latch** | A budget-driven level 4 that holds until the worker taps "I'm OK, buddy checked" |
| **Unwell lock** | Level 4 from the "I feel unwell" tap; only the worker clears it |
| **Tier 0/1/2** | Inputs present: 0 = forecast + task + profile, 1 = + check-in and taps, 2 = + watch heart rate |
| **Session** | One crew shift: a server record `session:{site}:{sessionId}`, joined through the QR fragment |
| **simTs / sim-minute** | Simulation time. Live runs at 1×, Replay at 240× (an 8 h shift takes about 2 min) |
| **Replay** | The bundled 15 Jul 2026 weather, used by the one-click demo |
| **Vulnerable profile** | The planner's composite worker: lowest ramp %, highest clothing adjustment |
| **B0 / B1** | Evidence baselines: B0 = midday ban only, B1 = one generic WBGT threshold |

## What to hand each tool
| Job | Give it |
|---|---|
| v0 → worker screen | [05](docs/spec/05-worker-app.md), [09](docs/spec/09-design-system.md), [04 (delivery line + states)](docs/spec/04-client-session.md), `lib/types.ts`, `mocks/` |
| v0 → supervisor board | [06](docs/spec/06-supervisor-board.md), [09](docs/spec/09-design-system.md), `lib/types.ts`, `mocks/` |
| v0 → landing + demo | [07](docs/spec/07-landing-and-demo.md), [09](docs/spec/09-design-system.md) |
| v0 → evidence page | [08 (page order)](docs/spec/08-evidence-simulator.md), [09](docs/spec/09-design-system.md), `lib/types.ts` (`EvidenceReport`) |
| Antigravity → engine + sim | [02](docs/spec/02-engine.md), [08](docs/spec/08-evidence-simulator.md), `lib/types.ts`, the hand-written tests; first message: [docs/handoff/antigravity.md](docs/handoff/antigravity.md) |
| Antigravity → API + store | [03](docs/spec/03-api-and-storage.md), [13](docs/spec/13-privacy-safety.md), `lib/types.ts` |
| Builder → client runtime | [04](docs/spec/04-client-session.md), [02](docs/spec/02-engine.md) (engine API) |

The full index is at [docs/README.md](docs/README.md), and the schedule is in [11-schedule-and-tasks](docs/spec/11-schedule-and-tasks.md).
