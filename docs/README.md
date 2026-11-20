# HeatShield docs

The **spec** (`spec/`) holds the current rules only, one file per area of work. It is the only input for v0 and Antigravity, together with `lib/types.ts`. When files seem to disagree, the more specific file wins: the engine file beats the overview.

The **review** folder (`review/`) holds the full /autoplan history, kept word for word: why every rule exists.

## Spec: start here
| # | File | What's in it | Built by |
|---|---|---|---|
| 00 | [Product](spec/00-product.md) | pitch, features, alert levels, challenge rules, scope | — |
| 01 | [Architecture](spec/01-architecture.md) | ownership, repo layout, data flow, stack | — |
| 02 | [Engine](spec/02-engine.md) | WBGT, limits, budget, levels, fallbacks, planner, constants | Antigravity |
| 03 | [API & storage](spec/03-api-and-storage.md) | auth, routes, status/ack rules, keys, errors, contract types | Antigravity |
| 04 | [Client session](spec/04-client-session.md) | join, clock, loop, persistence, queue, device features | Builder |
| 05 | [Worker app](spec/05-worker-app.md) | onboarding, card, L4, lifecycle states, languages | v0 |
| 06 | [Supervisor board](spec/06-supervisor-board.md) | session + QR, Needs you, tiles, ack, polling, planner view | v0 |
| 07 | [Landing & demo](spec/07-landing-and-demo.md) | one-click Replay demo, harness, demo script, smoke | v0 + Builder |
| 08 | [Evidence & simulator](spec/08-evidence-simulator.md) | truth model, baselines, metrics, fairness, evidence page | Antigravity + v0 |
| 09 | [Design system](spec/09-design-system.md) | level tokens, type, sizes, states, AI-slop guard | v0 |
| 10 | [Dev setup](spec/10-dev-setup.md) | scripts, env, tests, Serwist, v0/Antigravity workflow, deploy | Builder |
| 11 | [Schedule & tasks](spec/11-schedule-and-tasks.md) | day plan, go/no-go, cut order, task list | — |
| 12 | [Pitch](spec/12-pitch.md) | story, slides, honesty lines | — |
| 13 | [Privacy & safety](spec/13-privacy-safety.md) | hard rules, data handling, known limitations | all |

## Which files to hand each tool
- **v0 (worker screen):** 05, 09, 04 (the delivery-line and state rules), `lib/types.ts`, `mocks/`. First prompt: [handoff/v0-worker-card.md](handoff/v0-worker-card.md)
- **v0 (supervisor board):** 06, 09, `lib/types.ts`, `mocks/`
- **v0 (landing):** 07, 09
- **Antigravity:** 02, 03, 08, 13, `lib/types.ts`, the hand-written tests. Start it with [handoff/antigravity.md](handoff/antigravity.md)

## Review history
| File | Contents |
|---|---|
| [00-original-plan-and-amendments](review/00-original-plan-and-amendments.md) | the original plan + every accepted amendment (E, R, S, D, X, Y, Z items) |
| [01-ceo-review](review/01-ceo-review.md) | premises, scope decisions, spec-review loop, 11 sections |
| [02-design-review](review/02-design-review.md) | 7 design passes, D1–D15 |
| [03-dx-review](review/03-dx-review.md) | developer experience, X1–X14 |
| [04-eng-review](review/04-eng-review.md) | architecture, tests, failure modes, Y1–Y20, Z1–Z17 |
| [05-decision-audit-trail](review/05-decision-audit-trail.md) | every decision and who made it |
| [06-review-report](review/06-review-report.md) | final report (approved at gate rev 2) |

Deferred work: [../TODOS.md](../TODOS.md).
