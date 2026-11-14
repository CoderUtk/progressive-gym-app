# Exercise catalogue expansion — design

**Date:** 2026-11-14 · **Size:** small change

## Intent
Users can't find exercises they actually do in our 76 built-ins, and the list
looks thin next to apps like openGym. Grow the catalogue to ~1,300 exercises.

## Goals
- Every exercise from the MIT ExerciseDB dataset (`hasaneyldrm/exercises-dataset`,
  1,324 entries) is searchable and pickable.
- Common lifts stay easy to reach.

## Non-goals
- No media (images/GIFs are Gym visual's, not licensed to us).
- No how-to instructions UI (option C — possible follow-up).
- No translations.

## Anti-goals
- Breaking saved history: existing built-in ids (`bench-press`, …) must never change.
- Built-ins buried under near-duplicate dataset variants.

## Constraints
- Dataset text is MIT: attribution must ship with the app.
- Media fields (`image`, `gif_url`, `media_id`, `attribution`) are dropped.

## Approaches
- **A. Import everything, cleaned (picked).** Simplest, nothing a user does gets dropped. Cost: long muscle tabs.
- B. Curated subset by equipment — cleaner lists, but rules guess wrong on what's "odd".
- C. A + how-to instructions — fixes "what is this?" without pictures, but more work and ~500 KB. Deferred.

## Design
- **One-off script** `scripts/build-exercisedb.mjs` reads the dataset JSON (downloaded, not committed)
  and writes `data/exercisedb.js` (generated, committed). Re-runnable.
- **Entry shape** matches built-ins: `{ id: 'edb-0001', name, muscle, secondary, equipment, aliases: [], emoji, tracking_type }`.
- **Names:** Title Case; keep "3/4", "EZ" etc. sensible.
- **Muscle** from dataset `category`: chest→Chest, back→Back, upper/lower legs→Legs,
  upper/lower arms→Arms, shoulders & neck→Shoulders, waist→Core, cardio→Cardio.
- **Secondary** from `secondary_muscles` mapped onto the same 7 groups (plus Glutes as built-ins already use), deduped, primary removed.
- **Equipment:** map onto `EQUIPMENT_TYPES` where natural (barbell/EZ/olympic→Barbell,
  lever/sled/smith/assisted machine→Machine, body weight/weighted→Bodyweight, …);
  anything else keeps its Title-Cased dataset value.
- **tracking_type:** cardio→CARDIO; name contains plank/hold (not push-up/tap/lift/fly/adduction)→TIMED_HOLD;
  body weight→BODYWEIGHT_REPS; else WEIGHT_REPS.
- **Dedupe:** skip a dataset entry whose normalized name matches a built-in name or alias.
- **Ordering** in `data/exercises.js`: built-ins, then custom, then dataset — so built-ins rank first in search and muscle tabs.
- **Hide** works on dataset entries the same way as built-ins; id lookup (`getExerciseById`) covers all three lists.
- **Attribution:** MIT notice as header of `data/exercisedb.js`, plus one credit line in Settings.

## Left to the builder
Exact equipment map entries, Title Case edge cases, emoji per muscle.
