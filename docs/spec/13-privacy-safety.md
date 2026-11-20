# 13 · Privacy and safety rules

These are hard rules. Code reviews check them.

## Safety
- **Screening, not diagnosis.** Level 4 hands off to a human: the site medic or **998**.
- **Missing input means worst plausible value.** This covers forecast, check-in, sensors and derived values.
- **Unwell is final until the worker clears it.** Tapped at any time, it locks level 4. Neither the supervisor nor the engine can clear it. It survives reloads and new sessions (Live).
- **Worker safety before productivity.** No feature lets a supervisor lower a worker's level, and the planner never schedules into predicted level ≥ 2.

## Privacy
- **Stays on the phone:** check-in answers, heart rate, budget, the fasting toggle.
- **Leaves the phone:** exactly `{workerId, level, simTs, lowBattery}`, with a pseudonymous `workerId` such as `W-7F3A`.
- **Server:** only the derived risk level, **24 h TTL**, with no history.
- **Never used for discipline, never shared with the employer** beyond the alert colour needed to send help. The consent screen says this, and the pitch repeats it.
- **Decline is allowed:** alerts still run locally and nothing is posted.
- **Delete my data:** clears the phone and every status posted today, or expires within 24 h if offline.
- **Fasting** is never sent per worker. The supervisor sets a crew-level "fasting-safe" planning toggle.
- **Roles:**
  - The worker token sees only roster names and IDs, plus its own profile.
  - The supervisor token sees profiles for planning, but never check-in answers or vitals.
- **Hosting:** the demo runs on Vercel + Supabase with no health data stored. Supervisor emails live in Supabase Auth; workers are anonymous users. Production would be UAE-hosted (Azure UAE North) under UAE Federal Law 2/2019.
- **Demo data:** names in the seed file are synthetic.
- **QR join (as built):** only `{workerId, level, simTs, lowBattery}` leaves the phone, over a Supabase Realtime broadcast channel named after the crew code. Nothing is stored, and the phone never sends check-in answers, heart rate or profile.
- **Gemini** receives only the anonymous schedule (tasks, times, levels). No names, worker ids, profiles, check-ins or ID documents ever go to it. Its text never changes a level.

## Known limitations (stated in the UI and the pitch)
- Alerts are unreliable with the screen off or the tab frozen. Buddies and the planner cover this.
- iOS has no vibration, and some Android phones lack voices for some languages (tone fallback).
- The latest-only offline queue can drop a level 4 that was cleared before the phone reconnected.
- **QR join (as built):** anyone with the crew code can send a fake status for a crew member on that board. Only well-formed messages are accepted. The real fix is the sign-in and device binding in [03](03-api-and-storage.md).
- One site token means anyone holding the worker QR can post as any roster name until a device binds. Mitigated by binding each name to its first anonymous Supabase user; a per-worker QR is in TODOS.
- Translations are machine-made; Arabic and Urdu get a native check.
