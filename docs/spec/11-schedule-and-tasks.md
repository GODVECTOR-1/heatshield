# 11 · Schedule, go/no-go and tasks

Submission is **Fri 20 Nov 2026**. Deploy to Vercel every day.

## Day plan
| Day | Work |
|---|---|
| **Sat 14** (today) | Spec split into `docs/spec/` (done). **Heat-constant spreadsheet go/no-go** (done: **GO**, [heat check](../analysis/heat-check.md)). `lib/types.ts` (done). Hand-written expectation tests (done: `tests/`, Vitest 5 installed). Fixtures (done: `data/fixtures/`, `data/climatology.json`): 13–18 Jul, 25–29 May and 8–12 Oct windows, Nov live (7 Nov), 12×24 climatology. `constants.ts` (moved to Antigravity step 1, values pinned by `tests/spec-params.ts`). GitHub repo + Vercel skeleton + Supabase project (needs your OK). Check the Next version against Serwist (done: `@serwist/next` + `next build --webpack`, [10](10-dev-setup.md)). Antigravity brief (done: [handoff](../handoff/antigravity.md)). |
| **Sun 15** | Engine: `time`, `wbgt` (approximation), `physiology`, `risk`, `planner`. Then `status`, `auth`, `problem`, `store`, and API routes on the in-memory adapter. All tests green. |
| **Mon 16** | `lib/client/session.ts` first (builder). Then the worker PWA via v0: **one working card in en + ar wired to `session.ts`** (onboarding, check-in, card, L4, delivery line). |
| **Tue 17** | Supervisor board via v0: session setup + QR, "Needs you", tiles, ack, planner timeline, demo crew. Landing + one-click demo. |
| **Wed 18** | Simulator + calibration (seed 7) + `evidence.json` (seed 42) + evidence page. Liljegren WBGT is a stretch goal. |
| **Thu 19** | Serwist offline + test on the deployed build. Remaining languages (hi, ur, bn, ml), battery (low-battery), vibration, Wake Lock. Polish, final demo script, smoke. |
| **Fri 20** | 3-min video + deck, then **submit**. |

## Go/no-go checkpoints (22:00 each day)
- **Sun:** engine tests aren't green → ship the WBGT approximation only.
- **Mon:** the card doesn't work on a real phone at the deployed URL → stay at en + ar and push the extras to Thursday or cut them.
- **Tue:** phone→board sync fails → demo with the client-side crew and in-page store only.
- **Wed:** fairness results are unstable → ship sensitivity, lead time and the planner metric only.

## Cut order if late
1. bn/ml voice
2. vibration patterns
3. low-battery handling
4. heart-rate (Tier 2) rule
5. fasting planner rule
6. "ack overdue" badge

## Task list (from the review; tick as you ship)
| ID | P | Task | Spec |
|---|---|---|---|
| T1 | P1 | Compile the effective spec (**done: `docs/spec/`**) | all |
| T2 | P1 | 3-min demo script + feature tags | [07](07-landing-and-demo.md) |
| T3 | P1 | GitHub repo, Vercel skeleton deploy, Supabase project + `supabase/schema.sql` (with your OK) | [10](10-dev-setup.md) |
| T4 | P1 | WBGT approximation first, Liljegren as stretch | [02](02-engine.md) |
| T5/T24 | P1 | Store: JSON SET/MGET, pure `applyStatus`, production guard | [03](03-api-and-storage.md) |
| T6 | P2 | Offline delete behaviour | [04](04-client-session.md) |
| T7/T13 | P1 | One-click Replay split-view demo + preset | [07](07-landing-and-demo.md) |
| T8 | P2 | Robustness sweep chart | [08](08-evidence-simulator.md) |
| T9 | P1 | Screen + token sections, used in v0 prompts | [09](09-design-system.md) |
| T10 | P1 | Delivery line, action-first card, banded bar | [05](05-worker-app.md) |
| T11 | P1 | L4 forces Rest, no drain while latched | [02](02-engine.md), [04](04-client-session.md) |
| T12 | P1 | "Needs you" strip, tile anatomy, offline banner | [06](06-supervisor-board.md) |
| T14 | P2 | Contrast vitest | [09](09-design-system.md) |
| T15 | P2 | Precompute sim JSON at build | [08](08-evidence-simulator.md) |
| T16 | P1 | problem+json helper and 409 outcomes | [03](03-api-and-storage.md) |
| T17 | P1 | Finite-input guard | [02](02-engine.md) |
| T18 | P1 | Store env selection + `.env.example` | [03](03-api-and-storage.md), [10](10-dev-setup.md) |
| T19 | P1 | `lib/types.ts` (**done**, strict-typechecked; checks in `lib/types.check.ts`) | [03](03-api-and-storage.md#contract-types-libtypests-every-timestamp-is-jsdoc-epoch-ms) |
| T20 | P1 | README, seed tokens, scripts, vitest config | [10](10-dev-setup.md) |
| T21 | P2 | Weather result + retry, SW ready, Wake Lock re-request | [04](04-client-session.md), [06](06-supervisor-board.md) |
| T22 | P2 | `npm run smoke` | [07](07-landing-and-demo.md) |
| T23 | P1 | Calibrated drain + E1 goldens | [02](02-engine.md), [08](08-evidence-simulator.md) |
| T25 | P1 | Persist engine state (Live keyed by worker + date) | [04](04-client-session.md) |
| T26 | P1 | Random sessionId in keys; fixed W-DEMO | [03](03-api-and-storage.md), [07](07-landing-and-demo.md) |
| T27/T36 | P1 | Session record + small fragment + validation + role tokens + ack key | [03](03-api-and-storage.md), [04](04-client-session.md) |
| T28/T34 | P1 | WBGT: Dimiceli globe (constants verified), DNI + diffuse instant, wind clamp, climatology | [02](02-engine.md) |
| T29 | P2 | Body validation, device key, constant-time token | [03](03-api-and-storage.md) |
| T30 | P2 | Lint rules (Date getters, sim imports) | [10](10-dev-setup.md) |
| T31 | P1 | Spreadsheet go/no-go (**done: GO**); shoulder fixtures; fair B1; capped lead time | [08](08-evidence-simulator.md) |
| T32 | P1 | Gaps use last task class, not Rest; Δ drain | [02](02-engine.md) |
| T33 | P1 | Serwist explicit rules, no-store APIs, Next 16 check (**check done**) | [10](10-dev-setup.md) |
| T35 | P1 | Spec conflict checklist (**done in `docs/spec/`**) | all |
| T37 | P1 | Hand-write E1 goldens, WBGT and status/ack tests first (**done: `tests/`**) | [10](10-dev-setup.md) |
