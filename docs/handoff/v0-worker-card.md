# v0 prompt 1: worker card (en + ar)

> **Superseded 19 Nov** by the v0 visual pass ([v0-visual-pass.md](v0-visual-pass.md)); this card's design is gone from the repo. The lessons below still apply.
>
> **Sent 14 Nov** (v0 chat `mx5fIgMU4ob`). The output is in `components/worker/WorkerCard.tsx`, with hand corrections listed at the top of that file. Preview: `/worker/preview`. For the next v0 prompts, state these up front: budget bands run L4→L0 from the start edge; the caller formats all times; every label, including aria-labels, goes through `t()`; only weights 400 and 600; no `font-mono`.

Send this with four attachments: `lib/types.ts`, `app/globals.css`, `docs/spec/05-worker-app.md`, `docs/spec/09-design-system.md`, plus the `mocks/worker/card-*.json` files. v0's output is copied by hand into `components/worker/`; v0 never edits `lib/`, `app/globals.css` or `package.json`.

---

Build the **main worker card** for HeatShield, a heat-safety PWA for outdoor construction workers in Abu Dhabi. The use scene: a cheap Android phone in direct midday sun, held with gloves, by a worker with low literacy. One glance must tell them what to do.

## Stack and boundaries
- Next.js App Router, React 19, TypeScript, Tailwind v4. No other dependencies: no shadcn, no icon library, no animation library. Draw the five level shapes as inline SVG.
- Produce **presentational components only**, in `components/worker/`. No data fetching, no timers, no `localStorage`, no `Date` calls. Everything arrives as props.
- Import types from `@/lib/types`. Do not redefine or extend them.
- Use the tokens already in `app/globals.css` as Tailwind classes: `bg-l0`…`bg-l4`, `text-on-l0`…`text-on-l4`, `rounded-ui` (8 px, the only radius), `min-h-tap` (64 px), `text-ink`, `bg-paper`, `text-muted`, `border-line`, and the `.stripe-l4` class. Do not add colours.

## Component contract
```tsx
// components/worker/WorkerCard.tsx
export interface WorkerCardProps {
  card: CardView;                       // from @/lib/types
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
  simNow: number;                       // epoch ms, for the countdown ring and "n min ago"
  clockLabel: string;                   // site time, already formatted "09:58"
  onMainAction: (action: MainAction) => void;   // 'in-shade' | 'light-task'
  onCall: (who: 'medic' | '998') => void;
  onActivity: (activity: Activity) => void;
  onUnwell: () => void;
  onClearL4: () => void;                // "I'm OK, buddy checked"
  onOpenMenu: () => void;
}
```
Split it into small files as you see fit (`LevelIcon`, `BudgetBar`, `DeliveryLine`, `ActivityRow`, `ReasonChip`), but `WorkerCard` is the only entry point.

## Layout, top to bottom (one screen, no scrolling at 360 × 640)
1. **Banner strip**, only when `card.banners` is non-empty. One line each: `replay` shows `t('banner.replay')` plus `clockLabel`; `not-shared`, `low-battery` and `offline-delete` show their own key. Also show `t('card.joinedAt', {time})` when `lateJoinAt` is set and `t('card.startedLower')` when `startedLower` is true.
2. **Level block**, full-bleed in the level colour, taking about half the screen: the level **number** (huge, tabular figures), the level's **icon shape** and the action phrase `t(card.phraseKey)` at ≥ 28 px, weight 600. Level 4 adds the diagonal stripe and the word `t('card.stop')`.
3. **Main action button**, ≥ 64 px tall, full width:
   - `in-shade` → `t('action.inShade')`. When `card.restCountdownEnd` is set, show a countdown ring and the minutes left (from `simNow`) instead.
   - `light-task` → `t('action.lightTask')`.
   - `call` → two stacked buttons: site medic first (`t('action.callMedic')` + `card.medicTel` as text), then `t('action.call998')`. Below them, the secondary `t('action.okBuddyChecked')`, disabled unless `card.canClearL4`.
   - `none` → no button; the level block grows.
4. **Delivery line**: `sent` → `t('delivery.sent', {level, minutes})` with a small swatch of that level's colour and shape; `queued` → `t('delivery.queued')`; `not-shared` → `t('delivery.notShared')`. When `queued` and `card.level >= 3`, render the call buttons from step 3 as the main action.
5. **Banded budget bar**: five fixed bands in the level colours (boundaries at 15/30/50/75 %), a marker at `card.budgetFraction`, **no number**. It fills from the start edge, so it mirrors in RTL. Next to it, one **reason chip** when `card.reason` is set: `t('reason.' + card.reason)`.
6. **Activity row** (secondary, smaller): Rest, Light, Moderate, Heavy as four icon buttons with labels; the current `card.activity` is selected (`veryHeavy` selects Heavy). All disabled when `card.activityLocked`.
7. **"I FEEL UNWELL"**: fixed to the bottom edge, always visible, full width, ≥ 64 px, `t('action.unwell')`.
8. A menu button in the top corner (start side) calling `onOpenMenu`. Do not build the menu.

## Level tokens
| Level | Class | Text | Shape |
|---|---|---|---|
| 0 | `bg-l0` | `text-on-l0` | circle |
| 1 | `bg-l1` | `text-on-l1` | drop |
| 2 | `bg-l2` | `text-on-l2` | triangle |
| 3 | `bg-l3` | `text-on-l3` | square |
| 4 | `bg-l4` | `text-on-l4` | octagon, plus `.stripe-l4` and "STOP" |

Colour is never the only signal: the number and the shape always appear with it.

## Accessibility and RTL
- The level block is an `aria-live="assertive"` region announcing level and phrase.
- Every control is a real `<button>` with a visible label, ≥ 64 px tap target, and the global focus ring.
- Use logical CSS only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`). No `left`/`right`. The root element takes `dir={dir}`.
- No text below 16 px. No information in hover states.

## Do not
- No cards-in-cards, no shadcn dashboard look, no gradients, no shadows, no rounded-full pills, no icons inside coloured circles, no emoji, no centred-everything layout, no dark mode, no marketing copy.
- No motion except the countdown ring.

## Preview page
Add `app/worker/preview/page.tsx` (client component) that imports every `mocks/worker/card-*.json`, shows a picker for the mock and an en/ar toggle, and renders `WorkerCard` inside a 360 × 640 frame with no-op handlers. Use this inline dictionary for the preview only:

```ts
const en = {
  'banner.replay': 'REPLAY · 15 Jul 2026 · 240×', 'banner.not-shared': 'Not shared (you chose this)',
  'banner.low-battery': 'Battery low, stay with your buddy', 'banner.offline-delete': 'Your status expires within 24 h',
  'card.joinedAt': 'Joined {time}', 'card.startedLower': 'Yesterday was hard: starting lower', 'card.stop': 'STOP',
  'card.l0.phrase': 'Keep working. Drink water.', 'card.l1.phrase': 'Drink now. Slow down.',
  'card.l2.phrase': 'Go to shade. Rest 15 min.', 'card.l3.phrase': 'Stop heavy work. Light task only.',
  'card.l4.phrase': 'Stop work. Get help now.',
  'action.inShade': "I'm in the shade", 'action.lightTask': 'Switched to light task',
  'action.callMedic': 'Call site medic', 'action.call998': 'Call 998', 'action.okBuddyChecked': "I'm OK, buddy checked",
  'action.unwell': 'I FEEL UNWELL',
  'delivery.sent': 'Supervisor sees: level {level} · {minutes} min ago', 'delivery.queued': 'Not sent, no signal',
  'delivery.notShared': 'Not shared (you chose this)',
  'reason.hr-high': 'heart rate high', 'reason.after-unwell': 'after unwell', 'reason.dark-urine': 'dark urine',
  'reason.watch-lost': 'watch lost: playing safe', 'reason.no-forecast': 'no forecast: worst case', 'reason.recovering': 'recovering',
  'activity.rest': 'Rest', 'activity.light': 'Light', 'activity.moderate': 'Moderate', 'activity.heavy': 'Heavy',
};
const ar = {
  'banner.replay': 'إعادة · 15 يوليو 2026 · ×240', 'banner.not-shared': 'غير مُشارَك (باختيارك)',
  'banner.low-battery': 'البطارية ضعيفة، ابقَ مع زميلك', 'banner.offline-delete': 'تنتهي حالتك خلال 24 ساعة',
  'card.joinedAt': 'انضممت {time}', 'card.startedLower': 'أمس كان صعبًا: تبدأ بمستوى أقل', 'card.stop': 'توقّف',
  'card.l0.phrase': 'واصل العمل. اشرب الماء.', 'card.l1.phrase': 'اشرب الآن. خفّف السرعة.',
  'card.l2.phrase': 'اذهب إلى الظل. استرح 15 دقيقة.', 'card.l3.phrase': 'أوقف العمل الشاق. عمل خفيف فقط.',
  'card.l4.phrase': 'أوقف العمل. اطلب المساعدة الآن.',
  'action.inShade': 'أنا في الظل', 'action.lightTask': 'انتقلت إلى عمل خفيف',
  'action.callMedic': 'اتصل بمسعف الموقع', 'action.call998': 'اتصل بـ 998', 'action.okBuddyChecked': 'أنا بخير، زميلي تأكّد',
  'action.unwell': 'أشعر بتوعّك',
  'delivery.sent': 'المشرف يرى: المستوى {level} · منذ {minutes} د', 'delivery.queued': 'لم يُرسَل، لا توجد إشارة',
  'delivery.notShared': 'غير مُشارَك (باختيارك)',
  'reason.hr-high': 'نبض القلب مرتفع', 'reason.after-unwell': 'بعد التوعّك', 'reason.dark-urine': 'بول داكن',
  'reason.watch-lost': 'انقطعت الساعة: نحتاط', 'reason.no-forecast': 'لا توجد توقعات: أسوأ حالة', 'reason.recovering': 'تتعافى',
  'activity.rest': 'راحة', 'activity.light': 'خفيف', 'activity.moderate': 'متوسط', 'activity.heavy': 'شاق',
};
```
The Arabic is machine-made and unreviewed; keep the keys identical in both.

## Done when
Every `card-*.json` mock renders without layout breakage at 360 × 640 in both `ltr` and `rtl`, the unwell button never scrolls off screen, and level 4 shows call buttons with the phone number as text.
