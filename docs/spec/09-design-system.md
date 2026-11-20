# 09 · Design system

The use scene is a cheap Android phone in direct sun, held with gloves, by a worker with low literacy. That means a **light, full-bleed, high-contrast** design. There is no dark mode.

## Level tokens (gate d1a, all ≥ 7:1 contrast)
| Level | Background | Text | Contrast | Icon shape | Extra |
|---|---|---|---|---|---|
| L0 | `#0B5E2E` | white | 7.9 | circle | — |
| L1 | `#FFD400` | black | 14.7 | drop | — |
| L2 | `#FF8A00` | black | 8.9 | triangle | — |
| L3 | `#9E1116` | white | 8.2 | square | — |
| L4 | `#4A1470` | white | 12.9 | octagon | diagonal stripe + "STOP" |

- The same tokens appear on the worker card, the board tiles and the planner.
- Colour is never the only signal: every level also has its **number** and its **icon shape**.
- **Stale** = a hatch pattern, never transparency.
- **Alert colours are never used for chart series** or planner task blocks. Task blocks use a neutral palette per metabolic class.
- `check:contrast` is a vitest over these pairs.

## Type (gate d2a)
- **Noto Sans** family through `next/font`, one per script: Latin, Arabic, Devanagari, Bengali, Malayalam. Two weights, 400 and 600.
- Action text is ≥ **28 px** at weight 600. Level numbers use tabular figures.

## Spacing and shape
- 4 px spacing scale.
- One radius, **8 px** (`rounded-ui`), everywhere, with two exceptions: the worker card's white sheet has a **24 px** top radius (`rounded-t-sheet`), and the landing page's phone mock-up has its own bezel radius.
- Tap targets ≥ **64 px**.
- Browser surfaces are themed from the palette: focus rings, selection, caret.

## Depth and motion (visual pass, 19 Nov)
- **Depth:**
  - Buttons on the worker phone have a pressed shadow (`shadow-press`) and move down 2 px when pressed.
  - The worker sheet and board tiles use `shadow-lift`.
  - No other shadows.
- **Motion only where it carries meaning:**
  - a level change (colour transition on the card, a colour sweep on a board tile);
  - the rest countdown ring;
  - the budget gauge draining;
  - the L4 octagon pulse;
  - a board tile that needs attention (two pulses).
- **Motion limits:**
  - Nothing else moves, and nothing loops except the L4 pulse and the countdown.
  - Nothing flashes more than 3 times a second.
  - Every animation stops under `prefers-reduced-motion`.
- **Neutral tokens** are used so that alert colours never appear in charts, timelines or task blocks:
  - `heat-1`…`heat-5`, a WBGT ramp in sand tones;
  - `task-light`…`task-veryheavy`, a slate ramp;
  - `series-a` (engine) and `series-b` (baseline).

  They are defined at the end of `app/globals.css`.

## Accessibility
- Level changes announce through `aria-live="assertive"`.
- The board is fully keyboard operable with visible focus.
- Vibration pulses = level, only when the level rises.
- No information is carried by colour alone.

## Interaction states (every screen must define these)
| Feature | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Worker card | last level + "updating" | "Scan your supervisor's QR" + 998 | "Not sent, no signal" (L≥3: call buttons are the main action) | colour + action + "Supervisor sees" | reason chip |
| Board tile | first-poll skeleton | neutral "no data" | "Board offline" banner, last data frozen | colour + number + icon + supervisor action | one badge |
| Planner | — | "No tasks today" | Unscheduled tray with reasons | timeline | some unscheduled |
| Evidence | none (precomputed) | — | "insufficient (n<30)", hatched | charts | sweep only |
| Onboarding | — | — | "Rescan QR" | "You are Ravi K. (W-7F3A)?" | declined banner |

## Avoid (AI-slop guard for v0 prompts)
- generic shadcn card dashboards or stacked cards on the worker screen
- gradient heroes
- 3-column feature grids
- icons in coloured circles
- centred-everything layouts
- emoji as UI
- system fonts as the display face

Copy uses utility language: orientation, status, action. No mood or marketing copy inside the app.

## Copy
- Every string is a `t(key)` key; keys are listed per screen in [05](05-worker-app.md) and [06](06-supervisor-board.md).
- Use logical CSS (`margin-inline-start`) for RTL.
- The supervisor and evidence pages are English only.
