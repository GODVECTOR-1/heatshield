# TODOS

## E3 — SMS / WhatsApp alert fallback
- **What:** Send level ≥3 alerts to the worker and their buddy by SMS or WhatsApp when the app isn't open.
- **Why:** PWA alerts are unreliable with the screen off, and many workers keep the phone in a pocket.
- **Pros:** Reaches feature phones and works without the app.
- **Cons:** Needs a paid provider (Twilio or the WhatsApp Business API), consent text, and per-message cost.
- **Context:** Deferred by the CEO review on 2026-11-14 as new infrastructure outside the 6-day build. Start from `POST /api/status` and add a server-side send when the level reaches ≥3.
- **Effort:** human M / CC S · **Priority:** P2 · **Depends on:** S14 storage, consent copy

## E4 — Real BLE heart-rate strap (Web Bluetooth)
- **What:** Replace the simulated Tier 2 heart-rate stream with a real BLE heart-rate strap.
- **Why:** Moves ECTemp from simulated data to real data.
- **Pros:** Gives real-world evidence and uses a cheap device (~AED 100 straps).
- **Cons:** Web Bluetooth works only in Chromium on Android; it is a hardware testing risk.
- **Context:** Deferred on 2026-11-14. `lib/engine/ectemp.ts` already takes an HR stream, so only the input adapter changes.
- **Effort:** human M / CC S · **Priority:** P3 · **Depends on:** a test device

## E10 — Anonymised aggregate feed for DoH Population Health Intelligence
- **What:** Daily, per-site counts of level ≥2/≥3 events and unwell taps, with no worker identities.
- **Why:** Links site safety to the DoH and Microsoft Population Health Intelligence framework.
- **Pros:** Gives health authorities population-level insight; strong pitch roadmap slide.
- **Cons:** Re-identification risk on small crews, so it needs k-anonymity (suppress counts < 5).
- **Context:** Deferred on 2026-11-14. Build it from the S14 status keys before their 24 h TTL expires.
- **Effort:** human M / CC S · **Priority:** P3 · **Depends on:** S14, privacy review

## ECTemp Kalman core-temperature estimate (cut from Tier 2)
- **What:** Replace the S30 heart-rate rule with the ECTemp Kalman filter (Buller 2013, Looney 2018) to estimate core temperature from HR.
- **Why:** It is more physiological than an HR threshold (RMSD ~0.3 °C in the literature).
- **Pros:** A credible "estimated core temp" for the pitch, and it plugs into E4 real straps.
- **Cons:** Constants must be validated against the papers; the spec review rated it the costliest non-pitch module.
- **Context:** Cut by the CEO spec review (pass 2, 2026-11-14). The S30 rule keeps the same watch on/off/drop interface, so swapping it in is local to `lib/engine/risk.ts`.
- **Effort:** human M / CC S · **Priority:** P3 · **Depends on:** E4 for real data

## Web Push for screen-off alerts
- **What:** Use the planner's deterministic schedule (breaks, midday-ban start) to send Web Push notifications.
- **Why:** PWA timers are unreliable with the screen off. Push works screen-off on Android, and on installed iOS PWAs from 16.4.
- **Pros:** Removes the weakest point of the worker app (CEO voice M4).
- **Cons:** Needs VAPID keys, a push subscription per device and a server-side scheduler.
- **Context:** Deferred by the CEO review on 2026-11-14; it goes on the roadmap slide only.
- **Effort:** human M / CC S · **Priority:** P2 · **Depends on:** S14, S23

## DESIGN.md via /design-consultation
- **What:** A full design system (type scale, spacing, components, motion) to replace the TOKENS section in SPEC.md.
- **Why:** The design review rated design-system alignment 7/10 without a DESIGN.md (2026-11-14).
- **Pros:** Gives a consistent post-hackathon UI and lets /design-review calibrate against it.
- **Cons:** Too much to fit in the 6-day build.
- **Context:** The D3 level tokens and D13 Noto type are the seed.
- **Effort:** human M / CC S · **Priority:** P3 · **Depends on:** the hackathon outcome

## Per-worker auth beyond trust-on-first-use
- **What:** Replace the site token + TOFU device key (Y11) with real per-worker credentials, issued and revocable by the site.
- **Why:** A holder of the site token can still read the roster, and TOFU can't recover a lost phone.
- **Pros:** Production-grade access control for a real DoH pilot.
- **Cons:** Needs enrolment UX and a revocation flow.
- **Context:** Deferred by the eng review on 2026-11-14. Start from `lib/auth.ts` and the X5 problem codes.
- **Effort:** human M / CC S · **Priority:** P2 · **Depends on:** a pilot site
