# 05 · Worker app (`/worker`, built with v0)

Mobile-first, icon-first, for low literacy and bright sun. Tokens, sizes and contrast: [09-design-system.md](09-design-system.md). Runtime behaviour: [04-client-session.md](04-client-session.md).

## Onboarding (first run)
1. **Language:** names in their own scripts (English, العربية, हिन्दी, اردو, বাংলা, മലയാളം), each with a voice sample. No flags.
2. **Consent:** Accept and Decline get equal visual weight. The copy:
   - "Your answers never leave this phone. Your supervisor sees only your alert colour, to send help."
   - "Never used for discipline, never shared with your employer."

   A worker who declines keeps a "Not shared (you chose this)" banner.
3. **Name:** pick the crew, then the name, then confirm with "You are Ravi K. (W-7F3A)?".
4. **Check-in**, 3 taps:
   - slept well? yes / no
   - urine colour: **3 big swatches** (pale / medium / dark)
   - feeling unwell? yes / no

   A **Skip** button says "counts as dehydrated".
5. **Start shift:** unlocks voice and vibration and offers "keep screen on".

## Main card: element order
Component: `components/worker/WorkerCard.tsx` (the v0 visual-pass design, chosen 19 Nov). The whole screen takes the level colour; the controls sit on a white sheet rising from the bottom.

1. Banner, demo/replay only: `REPLAY · 15 Jul 2026 · 240×` plus the site-time clock.
2. **Level zone (full-bleed level colour)**:
   - the level number, very large, scaled to the space the sheet leaves;
   - the level's icon shape as a large watermark behind the number;
   - a short action phrase (L4 adds "STOP" and a stripe);
   - a live readings line, "WBGT 31.4° · Heart rate 112". Each reading hides when null. The line hides in call states.
   - While resting, a countdown ring around the number (a full ring is 15 min).
3. **Banded budget gauge**, a semicircular arc with no number:
   - a thin outer ring always shows the 5 bands, L4 → L0 from the start edge;
   - the thick fill drains toward the start edge, and a marker sits at the current budget;
   - it mirrors in RTL.

   One reason chip sits beside the gauge when a floor or fallback sets the level: "heart rate high", "after unwell: 12 min", "dark urine", "watch lost: playing safe" or "no forecast: worst case". A "recovering" chip shows while resting. In call states the gauge is compact.
4. **Main action button**, which carries out the instruction:
   - L2: "I'm in the shade". Sets Rest and starts the countdown ring.
   - L3: "Switched to light task". Sets Light for 15 sim-min, like a Rest tap. The engine only knows Rest taps, so the session layer rewrites the schedule for that window (`withLightTap` in `lib/demo/scenario.ts`).
   - L4: the call buttons (site medic, then 998).
5. **Delivery line** ([04](04-client-session.md)).
6. **Activity row** (secondary): Rest-in-shade, Light, Moderate, Heavy.
7. **"I FEEL UNWELL"**, at the bottom of the sheet and always visible. The sheet never shrinks; the level zone gives up space instead.
8. **Menu:** Fasting mode toggle (confirm if changed mid-shift), language, confidence chips, "Offline ready", "Delete my data".

`LEVEL_THEME` (exported from the card) gives the level hex values, so the caller can set `<meta name="theme-color">` and the status bar follows the level.

## Level 4
- Activity is forced to Rest and the activity row is locked. While the call buttons are the main action, the locked row is hidden, so the number and the three call buttons fit without scrolling.
- Call buttons are the main action. In demo sessions a call shows a "Would dial 998" toast instead of dialling. The number is always shown as text.
- "I'm OK, buddy checked" is secondary and sits below the call buttons. It enables after ≥15 sim-min of Rest and a budget ≥18.
- The unwell lock can't be cleared by the supervisor or the engine.

## Lifecycle states (one copy key each)
| State | What the worker sees |
|---|---|
| No session / bad fragment | "Scan your supervisor's QR" + big 998 button, no level shown |
| Before shift | countdown |
| Late join | "Joined HH:MM" |
| Next day started lower | "Yesterday was hard: starting lower" |
| Climatology in use | reason chip "no forecast: worst case" |
| Low battery | "Battery low, stay with your buddy" |
| Session expired (401) | "Session expired: rescan QR" |
| Device mismatch (403) | "Name in use on another phone, ask for a new QR" |
| Offline delete | "Your status expires within 24 h" |
| After shift | end-of-shift summary |

## Feedback channels
- **Vibration:** pulse count = level, only when the level rises. Skipped silently where unsupported; iOS has no vibration.
- **Voice:** each level's phrase in the chosen language, with a tone fallback.
- **Screen readers:** level changes announce through `aria-live="assertive"`.

## Languages
- en, ar, hi, ur, bn, ml. Monday ships **en + ar**; the rest come Thursday.
- ar and ur use `dir="rtl"`. The card and activity row mirror, and the bar fills from the start edge.
- A missing key falls back to `en` with a dev warning. A key-parity test checks all 6 dictionaries.
- Translations are machine-made and unreviewed, with a native-speaker check for ar and ur.
- The copy says **"Fasting mode"**. "Ramadan" appears nowhere in the dictionaries.
