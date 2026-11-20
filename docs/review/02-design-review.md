<!-- Moved verbatim from PLAN.md lines 1231-1476 on 2026-11-14. -->
> Phase 2, design review: 7 passes, litmus scorecard, design obligations D1–D15.

### Phase 2 — Design review (autoplan)
Methodology read in full: lines 1–1576/1576 (EOF). The design binary is `DESIGN_NOT_AVAILABLE` (`--version` timed out), so the review is text-only with no mockups. No `DESIGN.md` exists. UI scope: yes, with 4 surfaces (/ landing, /worker, /supervisor, /evidence).

**Step 0:**
- Initial design completeness is **4/10**. The plan defines engine behaviour and a states table but not what users see.
- A 10 here would mean every screen has an element order, a state matrix, copy keys, level tokens, sizes for sunlight and gloves, RTL rules and a demo preset.
- Leverage: shadcn/21st.dev primitives through v0, plus the `ui-ux-pro-max` rules.
- Focus areas: all 7 dimensions (override P1).

**Dual voices**
- CLAUDE SUBAGENT (design, independent review): completed on input `3d061332…` with 3 Critical, 9 High and 9 Medium findings.
- CODEX SAYS (design, UX challenge): unavailable (`not_authed`), so this phase is `[single-model]`.
```
DESIGN OUTSIDE VOICES — LITMUS SCORECARD: [single-model]
  Check                                    Claude            Codex  Consensus
  1. Brand unmistakable in first screen?   NOT SPEC'D (/)    N/A    N/A
  2. One strong visual anchor?             YES after D3 full-bleed level  N/A  N/A
  3. Scannable by headlines only?          NO→YES after D5 "Needs you"    N/A  N/A
  4. Each section has one job?             NO→YES after D2 SCREENS        N/A  N/A
  5. Cards actually necessary?             board tiles yes; elsewhere no  N/A  N/A
  6. Motion improves hierarchy?            only rest countdown ring       N/A  N/A
  7. Premium without decorative shadows?   YES (flat full-bleed colour)   N/A  N/A
  Hard rejections triggered:               #7 risk (v0 stacked cards) → prevented by D2   N/A  N/A
```

**Pass 1 Information Architecture: 4 → 8.**
- The plan implies an order for the worker card (card, bar, voice, unwell) but has no slot for the main action or delivery state.
- Fixed by D2 and D4. Worker order: level colour, icon and phrase → main action button → delivery line → banded bar with reason chip → activity row → unwell, fixed at the bottom → menu.
- Board: "Needs you" strip, then a stable grid, then the planner. Evidence: as in D12.
- Remaining gap: the / landing composition is only "one button".
```
WORKER (/worker, mobile-first)          SUPERVISOR (/supervisor, laptop)
┌───────────────────────────┐           ┌──────────────────────────────────────────┐
│ REPLAY·15 Jul·240× 10:42  │ banner    │ header: session (locked) · QR · clock    │
│███ L2 ◆ REST IN SHADE ████│ full-bleed│ NEEDS YOU: [W-7F3A L4 STOP · Send buddy] │
│ [ I'm in the shade ]  ◯   │ primary   │            [W-2B11 L3 · ack due 0:22]    │
│ Supervisor sees: orange·1m│ delivery  ├──────────────────────────────────────────┤
│ ▓▓▓▓▓░░ bands · "dark urine"│ bar+chip│ CREW GRID (by name, stable)              │
│ (rest)(light)(mod)(heavy) │ secondary ├──────────────────────────────────────────┤
│ ─────────────────────────│           │ PLANNER timeline: WBGT strip · ban hatch │
│ [  I FEEL UNWELL  ]       │ fixed     │ tasks · rests · predicted line · tray    │
└───────────────────────────┘           └──────────────────────────────────────────┘
```

**Pass 2 Interaction State Coverage: 5 → 9.**
- There was no delivery state, no pre-shift or post-shift state, no no-session state, and no board-offline state.
- Fixed by D1, D6, D8 and D9. Remaining: the copy still needs a native-speaker check.
```
FEATURE          | LOADING             | EMPTY                      | ERROR                              | SUCCESS             | PARTIAL
worker card      | last level + "updating" | "Scan your supervisor's QR" + 998 | "Not sent, no signal" (L≥3: call buttons primary) | colour+action+"Supervisor sees" | reason chip (floor/fallback)
pre/post shift   | countdown 3 s demo / 30 s live | —                 | late join: "Joined 10:15"          | end-of-shift summary | "Yesterday was hard: starting lower"
board tile       | first-poll skeleton | "no data" (neutral)        | board offline banner, stale/overdue paused | colour+number+icon+supervisor action | one badge (overdue>stale>battery)
planner          | —                   | "No tasks today"           | unscheduled tray with reason       | timeline            | some unscheduled
evidence         | none (precomputed)  | —                          | "insufficient (n<30)" hatched cell; failed fairness in red outline + fix text | charts | sweep only
onboarding       | —                   | —                          | invalid token / replaced session: "Rescan QR" | "You are Ravi K. (W-7F3A)?" | declined: "Not shared (you chose this)" banner
```

**Pass 3 User Journey: 4 → 8.**
| STEP | USER DOES | USER FEELS | PLAN SPECIFIES? |
|---|---|---|---|
| 1 | Worker scans the QR and sees the language list in native scripts | unsure, with low literacy | D11 native-script list with voice samples |
| 2 | Consent | wary of the employer | D11 equal-weight Accept/Decline and plain copy |
| 3 | Picks crew, then name, then confirms | needs to know it's really them | D11 confirm step |
| 4 | 3-tap check-in | quick | D10 3 swatches; Skip states its consequence |
| 5 | Orange card while working | alerted but not panicked | D3/D4: the main button is the action |
| 6 | Taps "I'm in the shade" | in control | D4 countdown ring, "recovering" chip |
| 7 | Feels unwell | scared, needs help now | D7 STOP screen, call buttons first, delivery line truthful |
| 8 | Supervisor sees "Needs you" and taps "Help sent" | responsible, with no blame | D5 supervisor-action copy |
| 9 | End of shift | relieved | D8 summary |

Time horizons:
- 5 s: one colour and one instruction.
- 5 min: the main button matches the instruction.
- 5 years: trust that the supervisor never sees answers.

Remaining: the copy tone in 6 languages is unverified.

**Pass 4 AI Slop Risk: 3 → 7.**
- Classifier: OPERATE (app UI) for the worker, board and evidence pages. PERSUADE-lite for / landing.
- The risk is v0's default shadcn card dashboard, which is hard rejection #7. D2 SCREENS and D3 tokens remove it.
- Capped at 7 because no mockups exist (designer unavailable) to check pixels.
- Litmus 1 (brand on the first screen): NOT SPEC'D for /.

**Pass 5 Design System Alignment: 1 → 7.**
- No DESIGN.md exists.
- D3 defines the level tokens and D13 the type.
- `/design-consultation` is deferred (TODO) in favour of a TOKENS section in SPEC.md (P5).
- Remaining: spacing scale and radius as tokens, which D3 sets.

**Pass 6 Responsive & Accessibility: 3 → 8.**
- Outdoor sun, gloves, colour-blindness and RTL were not addressed.
- Fixed by D3 (≥7:1 contrast, number + icon shape + STOP stripe), D14 (≥64 px targets, ≥28 px action text, aria-live on level change, keyboard and focus order on the board) and D9 (RTL mirroring rules).
- Remaining: a real-device sunlight check.

**Pass 7 Unresolved design decisions:**
| DECISION NEEDED | IF DEFERRED, WHAT HAPPENS |
|---|---|
| T-palette: exact level colours (proposed in D3) | taste: v0 picks shadcn defaults that fail 7:1 in sun |
| T-type: Noto Sans family vs another multi-script face | taste: system fonts render Malayalam/Bengali inconsistently |
| / landing composition beyond the button | judges' first screen is a bare button (litmus 1) |

T-palette and T-type are TASTE decisions for the gate. The landing composition is resolved by D15.

<!-- autoplan-accepted:design -->
- D1 Delivery truth (design C1): The worker card always shows one delivery line:
  - "Supervisor sees: <colour> · <n> min ago" once a POST succeeds.
  - "Not sent, no signal" while queued. At level ≥3 the medic and 998 buttons then become the main action.
  - "Not shared (you chose this)" if consent was declined.

  The worker never sees supervisor acks. Verify: a unit test of the line for each of the 3 queue/consent states.
- D2 SCREENS spec (design C2): Add a SCREENS section to `SPEC.md` for / landing, /worker, /supervisor and /evidence. Each screen lists element order, state matrix (Pass 2 table), copy keys (`t(key)`) and token references. v0 prompts use SCREENS and never generate layout on their own. Verify: every v0 prompt cites a SCREENS section, and the review checklist compares the built screen with its element order.
- D3 Level tokens (design H9; exact hex values are taste T-palette): Each level has a full-bleed background with a paired text colour, all at contrast ≥7:1.
  - L0 #0B5E2E with white text
  - L1 #FFD400 with black text
  - L2 #FF8A00 with black text
  - L3 #9E1116 with white text
  - L4 #4A1470 with white text, a diagonal stripe and the word "STOP"

  Each level also has its own number and icon shape: L0 circle, L1 drop, L2 triangle, L3 square, L4 octagon. The same tokens are used on the card, the board and the planner. Alert colours are never used for chart series. Stale shows a hatch pattern, not transparency. Spacing uses a 4 px scale and radius is 8 px everywhere. Verify: a contrast check script on the token pairs.
- D4 Action-first card (design H1, H2): The main button carries out the instruction:
  - L2 "I'm in the shade": sets Rest and shows a countdown ring.
  - L3 "Switched to light task": sets Light.
  - L4: see D7.

  The activity row is secondary. The budget bar shows the 5 level bands with no number. When a floor or fallback sets the level, one reason chip says why: "heart rate high", "after unwell: 12 min", "dark urine", "watch lost: playing safe", "no forecast: worst case". A "recovering" chip shows while resting.
- D5 Board layout (design H4, H5):
  - The "Needs you" strip (overdue, L4, L3, stale at ≥L2, low battery) is sorted by severity then `levelSince`. Below it, the crew grid is sorted by name and never re-sorts live.
  - Tile: name, level colour + number + icon, the supervisor's action ("Send buddy", "Allow shade break", "Move to light task"), last seen, and one badge (overdue > stale > battery).
  - The ack button reads "Help sent". "Ack due 0:22" shows before a tile goes overdue.
  - When a poll fails, a banner says "Board offline since HH:MM, statuses frozen". Stale and overdue calculation pauses until a poll succeeds, using the server `now`.
- D6 Demo preset (design H3, H6, M5, M6, M9):
  - The S51 one-click demo pre-fills English, W-DEMO and consent ("Accept (demo)" shown once), and uses a 3 s countdown.
  - An "auto-follow advice" toggle on the demo worker reuses the S46 compliance rule. Only "I feel unwell" is tapped by hand.
  - `speechSynthesis.cancel()` runs before each utterance.
  - Simulated crew-mates appear only in Replay sessions, with a SIM tag and a dashed border; never in Live.
  - A permanent "REPLAY · 15 Jul 2026 · 240×" banner and a site-time clock appear on both views.
  - Watch, battery and demo toggles live in a demo drawer in the harness, not on the worker card. Confidence chips move to the menu.
  - In demo sessions, `tel:` shows a "Would dial 998" toast, and numbers are always shown as text.
- D7 Level-4 behaviour (design C3): At L4:
  - Activity is forced to Rest, the activity row is disabled, and Rest never reverts.
  - The call buttons (site medic, 998) are the main action.
  - "I'm OK, buddy checked" is a secondary control placed below the call buttons. It is enabled only after ≥15 sim-min of Rest and a budget ≥18.

  Verify: an engine test where the budget does not drain while latched at L4.
- D8 Worker lifecycle states (design H8):
  - No session or fragment: "Scan your supervisor's QR" with a large 998 button and no invented level.
  - Before the shift: a countdown.
  - After the shift: an end-of-shift summary.
  - Next day below 100: "Yesterday was hard: starting lower".
  - Late join: "Joined HH:MM".
  - Forecast loading, or climatology in use: shown as the reason chip.
  - Low battery: "Battery low, stay with your buddy".
  - Invalid or replaced session: "Rescan QR".
  - Delete pending offline: "Deleting when back online".

  Each state has one copy key.
- D9 Planner view and RTL (design H7, M8):
  - The planner is a read-only timeline across shift hours: a WBGT heat strip, the hatched 12:30–15:00 ban, task blocks coloured by metabolic class (not alert colours), inserted rests, the vulnerable profile's predicted-level line, and an Unscheduled tray with one reason per task.
  - "Planner off" is a comparison overlay with counters (level ≥2 events, tasks completed). It is never sent to phones.
  - Scenario, multiplier and the fasting-safe toggle lock when the session starts. Any change means a new session and a new QR.
  - RTL: the worker card and activity row mirror, and the bar fills from the start edge. The planner timeline and charts stay left-to-right. The supervisor and evidence pages are English only.
- D10 Check-in (design M3, M4): Urine is 3 large swatches: pale, medium, dark (mapping to S31 colours 1–3, 4–5 and 6–8). The Skip button states "counts as dehydrated". Fasting copy is written for all 5 levels, and the L3–L4 wording gets a native-speaker check. The fasting toggle lives in the menu and asks for confirmation if changed mid-shift.
- D11 Onboarding (design M2, M7):
  - The language list shows names in native script with voice samples, no flags.
  - The name picker goes crew → name → "You are Ravi K. (W-7F3A)?" confirmation.
  - Consent gives Accept and Decline equal visual weight. A declined worker keeps a banner.
  - "Delete my data" is in the menu, asks for confirmation, is queued if offline, and then returns to the language picker.
- D12 Evidence page (design M1):
  - Precompute the simulation to JSON at build time (deterministic) and load it instantly offline.
  - Order:
    1. S50 headline claim with its qualifier
    2. engine vs B1: sensitivity, false alarms, lead time
    3. fairness with a ±10 pp band
    4. robustness sweep
    5. planner metric
    6. limitations
  - "Insufficient" cells are hatched. A failed fairness test gets a red outline and the fix text.
- D13 Type (taste T-type): The Noto Sans family (Latin, Arabic, Devanagari, Bengali, Malayalam) self-hosted and cached by the service worker. Action text uses 600 weight; level numbers use tabular figures.
- D14 Accessibility minimums (design H9):
  - Tap targets ≥64 px and action text ≥28 px.
  - Vibration pulse count = level, triggered only on a level rise.
  - Level changes announce through an `aria-live="assertive"` region.
  - The board is fully keyboard operable in tile order ("Needs you" first), with visible focus rings themed from the tokens.
- D15 Landing (Pass 7): / is a single composition: the product name, one sentence ("A returning worker is a new worker. HeatShield plans the shift around them." unless UC2 is rejected, then the core pitch line), one button "Run the 15 July demo", and a footer link to /evidence. No cards and no hero image.
<!-- /autoplan-accepted:design -->

**NOT in scope (design):**
- Mockup generation: the designer is unavailable.
- A full `DESIGN.md` from `/design-consultation`: deferred, with SPEC TOKENS used instead.
- Localising the supervisor and evidence pages.
- Dark mode: the use scene is an outdoor sun-lit phone, so a light, full-bleed design is chosen on purpose.

**What already exists (design):** shadcn/21st.dev primitives through v0 (buttons, sheets, toasts), the `ui-ux-pro-max` rules, and Noto fonts (Google Fonts, OFL licence).

**Design Review Completion Summary**
```
| System Audit         | no DESIGN.md; UI scope 4 surfaces; designer unavailable
| Step 0               | 4/10 initial; all 7 dimensions
| Pass 1  (Info Arch)  | 4/10 → 8/10
| Pass 2  (States)     | 5/10 → 9/10
| Pass 3  (Journey)    | 4/10 → 8/10
| Pass 4  (AI Slop)    | 3/10 → 7/10
| Pass 5  (Design Sys) | 1/10 → 7/10
| Pass 6  (Responsive) | 3/10 → 8/10
| Pass 7  (Decisions)  | 1 resolved (D15), 2 taste → gate
| NOT in scope         | written (4 items)
| What already exists  | written
| TODOS.md updates     | 1 (design-consultation)
| Approved Mockups     | 0 generated (designer unavailable)
| Decisions made       | 15 added to plan (auto-decided, P5/P1)
| Decisions deferred   | 2 (T-palette, T-type) → gate
| Overall design score | 1/10 → 7/10
```
Passes 4 and 5 remain below 8 because no mockups or real DESIGN.md exist. `/design-review` should run after implementation for visual QA.

**Implementation Tasks (design)**
- [ ] **T9 (P1, human ~3h / CC ~20min)**: spec. Write the SCREENS + TOKENS sections of SPEC.md (D2/D3).
  - Surfaced by: design C2.
  - Files: SPEC.md.
  - Verify: each v0 prompt cites a section.
- [ ] **T10 (P1, human ~2h / CC ~15min)**: worker. Delivery line, action-first card and banded bar (D1/D4).
  - Surfaced by: design C1/H1/H2.
  - Files: app/worker.
  - Verify: unit test of the 3 delivery states.
- [ ] **T11 (P1, human ~1h / CC ~10min)**: engine. L4 forces Rest and no drain while latched (D7).
  - Surfaced by: design C3.
  - Files: lib/engine/risk.ts.
  - Verify: engine test.
- [ ] **T12 (P1, human ~3h / CC ~25min)**: board. "Needs you" strip, tile anatomy, offline banner (D5).
  - Surfaced by: design H4/H5.
  - Files: app/supervisor.
  - Verify: a poll-fail test that pauses stale/overdue.
- [ ] **T13 (P1, human ~2h / CC ~15min)**: demo. Demo preset with auto-follow, SIM tags only in Replay, demo drawer (D6).
  - Surfaced by: design H3/H6.
  - Files: app/page.tsx, lib/client/session.ts.
  - Verify: the one-click demo runs 3 min with no taps except unwell.
- [ ] **T14 (P2, human ~1h / CC ~5min)**: tokens. Contrast check script for the D3 pairs.
  - Surfaced by: design H9.
  - Files: scripts/contrast.ts.
  - Verify: every pair ≥7:1.
- [ ] **T15 (P2, human ~2h / CC ~15min)**: evidence. Precompute sim JSON at build time (D12).
  - Surfaced by: design M1.
  - Files: scripts/precompute-sim.ts.
  - Verify: the page loads offline with no compute.
