# v0 prompt 2: visual pass (worker card v2, landing, supervisor board, evidence)

> **v2 chosen 19 Nov.**
> - `WorkerCardV2` was merged into `components/worker/WorkerCard.tsx`, the only worker card now; the v1 card was deleted.
> - The preview's Design toggle was removed.
> - Specs [05](../spec/05-worker-app.md) and [09](../spec/09-design-system.md) now carry the v2 rules.
>
> **Copied in 18 Nov** (versions: A+B `b_ClUrYj4XRmC`, C `b_fYLJD4iKsdc`, D `b_UxLI9Zwcaxx`). Hand fixes are listed at the top of each copied file. The ones that matter for the next v0 prompt:
> - **Layout:** v2 clipped "I FEEL UNWELL" in 9 of 17 states, so the sheet is now `shrink-0` and the number scales with container units. In call states the locked activity row is hidden.
> - **Gauge:** the marker was not on the arc, and the thin five-band ring was missing.
> - **Level change:** the sweep overlay was invisible; a root `transition-colors` replaces it.
> - **Heat timeline:** it used `preserveAspectRatio="none"`, which stretched the text, and v0's file had a syntax error.
> - **Evidence charts:** the percent ticks were scaled wrong.
>
> Not copied:
> - v0's extra packages (shadcn helpers, lucide, tailwindcss-animate);
> - `next.config.mjs` (it had `ignoreBuildErrors`);
> - its `/supervisor` page, which put mock data on the live route.
>
> Open: `/demo`, the landing button's target, does not exist yet. Sheets and screenshots are in `docs/review/`.
>
> **Sent 18 Nov** as four messages to the private v0 chat `x6HlVHgSygt`. The chat was seeded through the v0 API with the project files the prompt refers to, not attachments; the send scripts were throwaway. Written 18 Nov. Everything between the two `---` lines is the prompt. It is long, so send it in **one v0 chat as four messages**: the shared part plus Part A first, then B, C and D as follow-ups in the same chat. v0 handles one surface at a time better than four at once. The shared rules apply to every part.
>
> **Attach:** `lib/types.ts`, `app/globals.css`, `components/worker/WorkerCard.tsx`, `app/worker/preview/PreviewClient.tsx`, all `mocks/worker/card-*.json`, all `mocks/board/*.json` (tiles, views and `timeline-replay.json`), and `mocks/evidence/report.json`.
>
> **Mock data:** `mocks/board/timeline-replay.json` has real WBGT for 15 Jul 2026 from `docs/analysis/heat-check/hourly.csv`, but its tasks, schedule and predicted levels are invented. All numbers in `mocks/evidence/report.json` are invented, `paramsHash: "MOCK"`, and the page must show a MOCK banner for it. Real numbers come from `npm run sim` → `public/evidence.json`.
>
> **Spec impact:** this prompt relaxes three rules in [09](../spec/09-design-system.md): buttons may have a pressed shadow, motion is allowed where it carries meaning, and the worker sheet may use a 24 px top radius. The safety rules do not change. Update spec 09 only after comparing v2 with the current card in `/worker/preview`.
>
> **Copying in:** v0 output is copied by hand, as with prompt 1. v0 never edits `lib/`, `package.json` or the existing tokens in `app/globals.css`; it only appends the marked block below.

---

# HeatShield visual pass

HeatShield is a heat-safety PWA for outdoor construction workers in Abu Dhabi. A worker's phone shows a heat level from 0 to 4 and what to do. A supervisor's board shows the crew and the day's heat plan. It is a competition entry judged from a **3-minute video and a live link**.

The current UI is correct but looks like a wireframe, and judges will read flat as unfinished. This pass makes it look like a finished, working instrument. It does **not** change behaviour, data shapes or the safety rules.

## Shared rules (all parts)

### Safety rules (these are not style choices; do not trade them for looks)
- Text on every level colour keeps **≥ 7:1 contrast**. Use only the `text-on-l0`…`text-on-l4` pairs on `bg-l0`…`bg-l4`.
- **Colour is never the only signal.** Every level shows its **number** and its **shape** (0 circle, 1 drop, 2 triangle, 3 square, 4 octagon). Level 4 also shows the diagonal stripe (`.stripe-l4`) and the word STOP.
- Every control on the worker phone is a real `<button>` with a visible label and a tap target of at least **64 px** (`min-h-tap`).
- **"I FEEL UNWELL" is always on screen** at 360 × 640, in every state, and never scrolls away.
- Level changes are announced through `aria-live="assertive"` on the element that holds the level number and the phrase.
- No text below 16 px on the worker phone. Nothing is shown only on hover.
- **Stale is a hatch pattern (`.hatch`), never transparency or opacity.**
- **Alert colours (l0–l4) are never used for chart series**, heat ramps or task blocks. Use the neutral tokens below.
- The supervisor never sees health details. A board tile shows level, number, shape, the supervisor's action, last seen and one badge. It never shows heart rate, readings or reason chips.

### Stack and boundaries
- Next.js 16 App Router, React 19, TypeScript, Tailwind v4. **No new dependencies**: no shadcn, no chart library, no icon library, no animation library. Icons and charts are inline SVG. Motion is CSS only.
- Components are **presentational**: props in, callbacks out. No fetching, `localStorage` or `Date` calls inside components. Timers are allowed only in preview pages and in the landing page's demo loop.
- Import types from `@/lib/types`. Do not redefine or extend them. If you need a new prop shape, declare it next to the component.
- **The caller formats all times.** Components receive formatted strings such as `"10:00"`, or a `formatTime(ms)` prop. Never compute site time inside a component. Subtracting two timestamps for "2 min ago" or "0:22" is fine.
- Fonts: Noto Sans is already loaded. Use only **weights 400 and 600**. Do not use `font-mono` or `font-bold`/`font-black`. Use `tabular-nums` for every figure.
- Use logical CSS only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`). No `left`/`right`. The worker root takes `dir={dir}`, and every arc, bar and gauge mirrors in RTL.
- Worker strings go through `t(key, vars)`, including aria-labels. The supervisor and evidence pages are English only: put their strings in one `COPY` object at the top of each file.

### Tokens to add
Append this block to the end of `app/globals.css` exactly as written. Do not change anything above it.

```css
/* v0 visual pass: added tokens (review in docs/handoff/v0-visual-pass.md) */
@theme {
  --radius-sheet: 24px;
  --shadow-press: 0 2px 0 rgb(0 0 0 / 0.35), 0 8px 18px rgb(0 0 0 / 0.18);
  --shadow-lift: 0 1px 2px rgb(0 0 0 / 0.12), 0 6px 20px rgb(0 0 0 / 0.10);

  /* WBGT heat ramp (°C): <28, 28–30, 30–32, 32–34, ≥34. Neutral sand, never alert colours. */
  --color-heat-1: #f4efe4;
  --color-heat-2: #e6d8bb;
  --color-heat-3: #cfb489;
  --color-heat-4: #a8865a;
  --color-heat-5: #6f5435; /* white text on this one, ink on the others */

  /* Task blocks by metabolic class (slate ramp). */
  --color-task-light: #dfe3e9;
  --color-task-moderate: #b4bdca;
  --color-task-heavy: #7a879a;
  --color-task-veryheavy: #46536a; /* white text */

  /* Chart series: engine and baseline. */
  --color-series-a: #1f4e8c;
  --color-series-b: #8a8a8a;
}

@keyframes level-sweep { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes sheet-rise { from { transform: translateY(24px); opacity: 0.6; } to { transform: none; opacity: 1; } }
@keyframes l4-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes attention { 0%, 100% { box-shadow: 0 0 0 0 rgb(17 17 17 / 0.6); } 50% { box-shadow: 0 0 0 6px rgb(17 17 17 / 0); } }

.animate-level-sweep { animation: level-sweep 500ms cubic-bezier(.2,.7,.2,1) both; }
.animate-sheet-rise { animation: sheet-rise 320ms ease-out both; }
.animate-l4-pulse { animation: l4-pulse 1.2s ease-in-out infinite; }
.animate-attention { animation: attention 1s ease-out 2; }

@media (prefers-reduced-motion: reduce) {
  .animate-level-sweep, .animate-sheet-rise, .animate-l4-pulse, .animate-attention { animation: none; }
}
```

Use `rounded-sheet`, `shadow-press`, `shadow-lift`, `bg-heat-1`…`bg-heat-5`, `bg-task-*` and `text-series-a`/`stroke-series-a` as Tailwind classes. Do not invent other colours.

### Motion rules
Motion is allowed **only where it carries meaning**: a level change, a countdown, a draining budget, an L4 alarm, or a tile that needs attention. Nothing loops except the L4 pulse and the countdown. Nothing flashes more than 3 times a second. Everything respects `prefers-reduced-motion`.

### Known pitfalls from the last v0 round (avoid these)
- The budget bands run **L4 → L0 from the start edge**: [0, 15) L4, [15, 30) L3, [30, 50) L2, [50, 75) L1, [75, 100] L0. The last round drew them backwards.
- No time maths in components; the caller formats times.
- The `aria-live` region must wrap the level and phrase, not the menu button.
- No hard-coded English on the worker card, not even "min" or aria-labels.
- A button on a level-coloured background must not be the same colour as that background.
- No nested `<main>`.

### Avoid
shadcn-style card dashboards, cards inside cards, glassmorphism, gradients (the existing `.stripe-l4` and `.hatch` patterns are fine), neon, dark mode, emoji, icons inside coloured circles, centred-everything layouts, 3-column feature grids, marketing copy inside the app, confetti, and layout shift when data updates.

---

## Part A: worker card v2

Create **`components/worker/WorkerCardV2.tsx`** (split helpers into small files if you like). **Keep `WorkerCard.tsx` unchanged**: we compare both before choosing one.

### Props
The same as `WorkerCardProps` in the attached `WorkerCard.tsx`, plus:

```ts
readings: { wbgtC: number | null; heartRate: number | null };   // null hides that reading
```

Also export `LEVEL_THEME: Record<Level, string>` with the five level hex values, so the caller can set `<meta name="theme-color">` and the phone's status bar takes the level colour too.

### Layout (one screen, no scrolling at 360 × 640)
1. **The whole screen is the level colour.** The phone itself turns green, yellow, orange, red or purple. Banners (`card.banners`, late join, started lower) stay as a slim ink strip at the top, as in the current card.
2. **Level zone** (level colour, about the top half):
   - menu button in the top start corner (`onOpenMenu`, `t('a11y.menu')`);
   - the **level number, very large** (about 150–170 px, weight 600, tabular) with the **level shape as a large watermark behind it** (about 240 px, `currentColor` of the on-level text at low strength, so the number stays fully readable);
   - the action phrase `t(card.phraseKey)` at ≥ 28 px, weight 600;
   - a **live readings line** at 18 px: `t('reading.wbgt', { value })` · `t('reading.hr', { value })`. Hide each reading when it is null; hide the line when both are null;
   - **Level 4:** `.stripe-l4` on the zone, the word `t('card.stop')` beside the number, and the octagon with `animate-l4-pulse`.
   - **Rest countdown:** when `card.restCountdownEnd` is set, a **large ring (about 180 px)** around the number shows the time left (minutes from `simNow`, full ring = 15 min). Put `t('action.restMinutes', { minutes })` below it.
3. **White sheet** (`bg-paper text-ink rounded-t-sheet shadow-lift`, rising from the bottom with `animate-sheet-rise` on mount). Inside, top to bottom:
   - **Heat budget gauge, the hero element.** A thick semicircular arc (stroke ≥ 20 px). A thin outer ring always shows the five bands in level colours for orientation. The thick inner arc fills from the start edge to `card.budgetFraction` in the colour of each band it passes through, and the rest of the track is `stroke-line`. A marker sits at the fraction. **No number is shown.** The fill animates (`transition` on `stroke-dashoffset`, ~600 ms), so the budget visibly drains in the video. The arc mirrors in RTL. `role="img"` with `aria-label={t('a11y.budget')}`. The reason chip `t('reason.' + card.reason)` sits under or beside the gauge when set.
   - **Main action button** (rules as in the current card). It is ink with paper text, `shadow-press`, and on press `translate-y-[2px] shadow-none`. `call` gives the two stacked call buttons (medic with `card.medicTel` as text, then 998) and, at level 4, the secondary `t('action.okBuddyChecked')`, disabled unless `card.canClearL4`. When `delivery.kind === 'queued'` and `level >= 3`, the call buttons are the main action.
   - **Delivery line** as in the current card, with the small swatch (colour + shape) of the level the supervisor sees.
   - **Activity row:** Rest, Light, Moderate, Heavy; outlined buttons, the selected one is ink and raised (`shadow-press`). All are disabled when `card.activityLocked`. `veryHeavy` selects Heavy.
   - **"I FEEL UNWELL"**, pinned to the bottom, full width, ≥ 64 px, outlined ink with `shadow-press`.
4. **Space at level 4.** The call buttons need about 200 px, so the level zone and gauge shrink (smaller number and a compact gauge) rather than anything scrolling.

### Motion
- **Level change:** an overlay in the new level colour sweeps up from the bottom (`animate-level-sweep`, keyed on `card.level` so it replays on every change). The component needs no state for this.
- L4 pulse, the countdown ring and the gauge drain, as above. Nothing else moves.

### New strings (add to both dictionaries)
```ts
// en
'reading.wbgt': 'WBGT {value}°', 'reading.hr': 'Heart rate {value}',
// ar (machine-made, unreviewed)
'reading.wbgt': 'مؤشر الحرارة {value}°', 'reading.hr': 'النبض {value}',
```

### Dictionaries
Move the two inline dictionaries out of `PreviewClient.tsx` into **`data/i18n/en.json`** and **`data/i18n/ar.json`** (identical keys, plus the new ones). Add `components/worker/t.ts` exporting `makeT(dict)`, which returns `t(key, vars)` with `{name}` replacement and falls back to the key.

### Preview
Update `app/worker/preview/PreviewClient.tsx`, keeping the existing `?mock=` and `?lang=` links working:
- add a **Design** toggle: `current` / `v2` / `side by side` (two 360 × 640 frames), also as `?design=`;
- pass `readings={{ wbgtC: 31.4, heartRate: 112 }}`, with `heartRate: null` for the `reason-watch-lost` mock;
- add a **"Play level changes"** button that steps l0 → l1 → l2 → l2-resting → l3 → l4-latched every 2.5 s, so the sweep and gauge drain can be checked.

### Done when
All 17 `card-*.json` mocks render in v2 at 360 × 640 in `ltr` and `rtl`: no clipping or scrolling, the unwell button visible, every button ≥ 64 px, the gauge bands in the correct order and mirrored in RTL, and level 4 showing the call buttons with the phone number as text.

---

## Part B: landing page (`/`)

Judges open the live link alone after watching the video, so this page must sell the idea in five seconds and start the demo in one click. Use **one composition**: no cards, no stock hero image and no feature grid.

Create **`components/landing/Landing.tsx`** (client component) with props `{ demoHref: string; evidenceHref: string }`, and render it from `app/page.tsx` with `demoHref="/demo"` and `evidenceHref="/evidence"`.

- **Start side:** the wordmark **HeatShield** (600), then the one sentence *"A returning worker is a new worker. HeatShield plans the shift around them."*, then **one primary button "Run the 15 July demo"** (a link to `demoHref`; ink, ≥ 64 px, `shadow-press`), then one quiet line *"Real Abu Dhabi weather · 15 Jul 2026 · 240× speed · no phone needed"*, then a text link *"See the evidence"*.
- **End side:** a **phone mock-up** (an ink bezel drawn with CSS; this frame alone may use a larger radius such as `rounded-[44px]`) running **`WorkerCardV2`** in a scripted loop: card-l0 → l1 → l2 → l2-resting → l3 → l4-latched, 2.5 s each, with the replay banner and a clock advancing from 07:00 to 14:00. Import the card mocks from `mocks/worker/` and the dictionary from `data/i18n/en.json`. Behind the phone, a tall full-bleed band in the **current level colour** sweeps to the next colour on each step, so the page visibly turns with the phone.
- **Footer:** *"Weather data by Open-Meteo.com (CC BY 4.0)"* linking to https://open-meteo.com, plus the evidence link.
- **Must look composed at 1280 × 720** (the video frame) and stack cleanly on a 360 px phone, with the phone mock-up under the button.
- The loop stops under `prefers-reduced-motion`, showing the level 2 card.

---

## Part C: supervisor board (`/supervisor`)

This is the screen that looks impressive on video: the crew changing colour live and the day's heat plan. It is English only. Design for **1280 × 720 first**, and keep it working down to 768 px.

Create **`components/board/Board.tsx`** as the entry point, with helpers such as `BoardHeader`, `NeedsYou`, `CrewTile`, `HeatTimeline` and `ReplayProgress` in `components/board/`.

### Props
```ts
// components/board/types.ts: the shape of mocks/board/timeline-replay.json
export interface TimelineData {
  simNow: EpochMs; shiftStart: EpochMs; shiftEnd: EpochMs; banStart: EpochMs; banEnd: EpochMs;
  forecastFetchedAt: EpochMs | null;
  wbgt: WbgtHour[]; tasks: Task[]; schedule: ScheduleSlot[]; unscheduled: Unscheduled[];
  /** Predicted level for the most vulnerable profile, as steps. */
  predicted: { t: EpochMs; level: Level }[];
  plannerCompare: { on: PlannerMetric; off: PlannerMetric };
}

export interface BoardProps {
  view: BoardView;
  timeline: TimelineData;
  crewName: string;
  clockLabel: string;                    // site time, already formatted
  formatTime: (ms: EpochMs) => string;   // site time "HH:MM", supplied by the caller
  wallNow: EpochMs;                      // for "Ack due 0:22" and "2 min ago"
  qr: React.ReactNode | null;            // the caller renders the QR
  onAck: (workerId: WorkerId, level: Level) => void;
}
```

### Layout
1. **Header:** crew name and scenario as a locked summary (small lock icon), the **site clock large** (tabular), a `REPLAY · 240×` ink banner when `view.scenario` is the replay, and the QR on the end side.
2. **Replay progress** (Replay only): a thin track under the header from shift start to shift end, filled to `simNow`, with hour ticks and `06:00`/`18:00` labels. It is read-only: **no pause or seek**, because the phones and the board share one session clock.
3. **"Needs you" strip:** `view.needsYou` in the given order (never re-sort). Each tile is larger and carries a **"Help sent"** button (`onAck(workerId, level)`, `shadow-press`). A tile that newly appears gets `animate-attention` once. When the list is empty, show one quiet line: *"Nobody needs you right now."*
4. **Crew grid:** `view.grid` in the given order. **Never re-sort or move tiles live.** Use 4–6 columns.
5. **Heat timeline** (full width; the centrepiece on video), described below.

### Tile
- the full tile in the level colour with its on-colour text: name (600), the **number and shape**, the supervisor's action (`send-buddy` "Send buddy", `move-to-light` "Move to light task", `allow-shade` "Allow shade break"), last seen "2 min ago", and **one badge** (`overdue` "Ack overdue", `stale` "Stale", `battery` "Buddy check: low battery");
- ack: `due` shows a "Ack due 0:22" countdown (from `ackDueAt − wallNow`, m:ss), `overdue` shows the badge, and `acked` shows "Help sent" with a check icon;
- **stale:** the last level with `.hatch` over it plus the stale badge, never faded;
- **no-data:** one neutral look (paper, `border-line`, the name, "No data"), the same for every reason, so nobody can tell who declined;
- **SIM** (demo crew-mates): dashed border plus a small "SIM" tag;
- **live colour change:** when a tile's level changes, the new colour sweeps in (`animate-level-sweep`, keyed on the level). An L3 or L4 tile also gets `animate-attention` once;
- `shadow-lift` on tiles; tiles are focusable in order, "Needs you" first, with the global focus ring.

### Heat timeline (inline SVG, x axis = shift start to shift end)
- **Row 1, WBGT in sun:** one cell per hour in the heat ramp (`heat-1`…`heat-5`), with the °C value printed in each cell. A thinner row below shows WBGT in shade. Label the rows "Sun" and "Shade".
- **Row 2, plan:** task blocks in `task-*` colours by metabolic class, labelled with the task name (truncated); rest slots as paper blocks labelled "Rest".
- **The midday break 12:30–15:00** (`banStart`–`banEnd`) is hatched across all rows, labelled *"Midday break (law)"*.
- **Row 3, predicted level** for the most vulnerable profile: an **ink** step line on a 0–4 scale, with the y labels drawn as the level number plus its small shape. Never use alert colours here.
- **Now cursor:** a vertical ink line at `simNow` labelled "Now 10:00" (via `formatTime`); the past part of the chart sits on a light grey band.
- **Unscheduled tray** under the chart: the task name plus the reason (`too-hot` "Too hot all day", `ban-window` "Inside the midday break", `no-slot` "No free slot", `past-latest` "Past latest start").
- **Source line:** "Forecast fetched HH:MM", or "Replay: bundled Open-Meteo archive" when `forecastFetchedAt` is null.
- **Planner on / off:** a two-option segmented control. "Off" shows the comparison counters from `plannerCompare` ("Level 2+ alerts 4 vs 11", "Tasks completed 3 vs 4"). It is a comparison only and never changes the plan.

### Board states (from the view mocks)
- `view-offline`: an ink banner *"Board offline since HH:MM, statuses frozen"*, with the tiles still visible;
- `view-session-invalid`: a full panel *"Session not valid: start a new session"*;
- `view-first-poll-empty`: static neutral skeleton tiles, no shimmer.

### Preview
Add `app/supervisor/preview/page.tsx` (a server component reading `mocks/board/view-*.json` and `timeline-replay.json`) with a view picker and a **"Simulate live"** toggle that bumps one grid tile's level every 3 s (preview only), so the colour sweep can be checked.

---

## Part D: evidence page (`/evidence`)

This page carries the honest claim with real charts instead of tables. It is English only and has to load instantly offline.

Create **`components/evidence/EvidenceReportView.tsx`** with props `{ report: EvidenceReport; formatDate: (ms: EpochMs) => string }`. In `app/evidence/page.tsx` (a server component), read `public/evidence.json` if it exists and otherwise `mocks/evidence/report.json`.

**If `report.paramsHash === 'MOCK'`**, show a full-width ink banner at the top: *"MOCK DATA: layout only, these are not results."* This must never be missed on camera.

### Order (keep it)
1. **The claim**, large: *"Illustrates how much a generic threshold misses if acclimatisation matters as much as NIOSH says."* (`claimKey` `evidence.claim`). Under it, plainly: *"The truth model is ours. This does not validate the WBGT model itself."* Then the **headline**: unacclimatised-worker sensitivity, engine vs a single threshold (B1), as two big figures (e.g. "88 % vs 58 %") joined by a dumbbell chart.
2. **Engine vs B1:** three small charts (sensitivity, false-alarm rate, median lead time in minutes), each with paired horizontal bars, engine in `series-a` and B1 in `series-b`, and the values printed. Add a note: *"B1 = one WBGT threshold ({thresholdC} °C), tuned on the same calibration seed."*
3. **Fairness:** for each group (age, acclimatised, fasting, PPE), a dot plot of each cell's sensitivity with a ±10 pp band around the group mean. Cells marked `insufficient` are hatched and labelled "insufficient (n < 30)". A group with `pass: false` gets a **red outline (`border-l3`, the one allowed alert colour here, per spec)** and its `fixNote` text.
4. **Robustness sweep:** a line chart with x = `acclimEffect` (0–2) and y = sensitivity (0–100 %), two lines (engine and B1), and a marker at 1.0 labelled "NIOSH assumption".
5. **Planner metric:** planner on vs off as paired bars for tasks completed, level 2+ events and truth events.
6. **Limitations:** a short list. English for the keys: `evidence.limit.truthModel` "The truth model is ours, not measured core temperature."; `evidence.limit.wbgtNotValidated` "This does not validate the WBGT model itself."; `evidence.limit.simulatedWorkers` "Simulated workers, not field data."; `evidence.limit.twoWindows` "Two shoulder-season weeks of Abu Dhabi weather (May and October)."
7. **Footer:** seed, calibration seed, workers × days, the weather windows, `paramsHash` and `generatedAt` (via `formatDate`).

### Charts
Inline SVG with no library. Every chart has axis labels and printed values, and a `<title>` plus a short text summary for screen readers. Use only `series-a`, `series-b`, ink, `line` and the hatch pattern (plus the single failed-test outline). Readable at 1280 × 720 and stacked on a phone.

---

## Deliverables (all parts)
- `app/globals.css` with the appended token block only
- `components/worker/WorkerCardV2.tsx` (+ helpers), `components/worker/t.ts`, `data/i18n/en.json`, `data/i18n/ar.json`
- `app/worker/preview/PreviewClient.tsx` (Design toggle, Play level changes)
- `components/landing/Landing.tsx`, `app/page.tsx`
- `components/board/*`, `app/supervisor/preview/page.tsx`
- `components/evidence/EvidenceReportView.tsx`, `app/evidence/page.tsx`

Do not touch `lib/`, `package.json`, `tests/`, `mocks/` or `data/fixtures/`.
