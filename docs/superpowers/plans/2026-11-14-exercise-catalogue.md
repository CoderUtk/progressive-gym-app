# Exercise Catalogue Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 1,324 MIT ExerciseDB exercises (text only) to the catalogue, ranked after built-ins and custom exercises.

**Architecture:** Pure converter module (`scripts/exercisedb-convert.mjs`) maps one dataset record to our exercise shape. A one-off build script runs it over the downloaded dataset and writes generated `data/exercisedb.js`. `data/exercises.js` imports that list, drops entries duplicating built-ins, and merges it into every lookup.

**Tech Stack:** Expo/React Native (JS, ESM), Node 22 built-in test runner (`node --test`), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-14-exercise-catalogue-design.md`

## Global Constraints

- No media: drop `image`, `gif_url`, `media_id`, `attribution` fields (Gym visual owns them).
- Existing built-in ids never change; dataset ids are `edb-<dataset id>` (e.g. `edb-0001`).
- Order everywhere: built-ins, then custom, then dataset.
- MIT notice ships: full MIT text as header comment of `data/exercisedb.js` + one credit line in Settings.
- Muscle values: only `Chest, Back, Legs, Arms, Shoulders, Core, Cardio`. Secondary values: those plus `Glutes, Biceps, Triceps` (what built-ins already use).
- `tracking_type` values are the string literals `WEIGHT_REPS | BODYWEIGHT_REPS | TIMED_HOLD | CARDIO` (generated file must not import `data/exercises.js` — avoids a cycle).
- Imports between data files use explicit `.js` extension (works in Metro and plain Node tests).
- Dataset JSON is downloaded to a temp/scratch path and never committed.

## Review Focus

1. Hidden dataset exercise referenced by a saved workout — `getExerciseById('edb-…')` still returns it (history must render). Test in Task 3.
2. Dedupe false positives — "Dumbbell Bench Press" must not be dropped by Bench Press (Barbell) built-in. Test in Task 3.
3. Unknown dataset `category` / equipment / muscle — converter returns a valid entry (muscle falls back to `Core`, equipment to its Title-Cased value, unknown secondary dropped), never `undefined`. Test in Task 1.
4. Names with quotes/apostrophes/slashes ("3/4 sit-up", "farmer's walk") — generated file still parses. Covered by Task 2 using `JSON.stringify` and Task 2's import check.
5. Library delete on a dataset exercise hides it (like built-ins) instead of trying to delete a custom exercise. Test in Task 3 via `isBuiltInExercise('edb-0001') === true`.

---

### Task 1: Converter module

**Files:**
- Create: `scripts/exercisedb-convert.mjs`
- Test: `tests/exercisedb-convert.test.mjs`
- Modify: `package.json` scripts — add `"test": "node --test tests/"`

**Interfaces:**
- Produces: `export function convertRecord(rec) -> { id, name, muscle, secondary, equipment, aliases, emoji, tracking_type }` and `export function titleCase(str) -> string`.
- `rec` shape (dataset): `{ id: '0001', name, category, equipment, target, secondary_muscles: string[] }`.

Mappings (exact):
- `category` → muscle: chest→Chest, back→Back, upper legs→Legs, lower legs→Legs, upper arms→Arms, lower arms→Arms, shoulders→Shoulders, neck→Shoulders, waist→Core, cardio→Cardio; unknown→`Core`.
- secondary (from `secondary_muscles`, lowercase match): pectorals/chest→Chest; lats/upper back/traps/rhomboids/lower back/spine→Back; quads/quadriceps/hamstrings/calves/adductors/abductors/hip flexors/inner thighs→Legs; glutes→Glutes; biceps→Biceps; triceps→Triceps; forearms/wrists/grip muscles→Arms; delts/deltoids/shoulders/rear deltoids/rotator cuff→Shoulders; abs/obliques/core→Core; anything else dropped. Dedupe, remove the primary muscle, keep first-seen order.
- equipment: barbell/ez barbell/olympic barbell/trap bar→Barbell; dumbbell→Dumbbell; cable→Cable; leverage machine/sled machine/smith machine/assisted/skierg machine/elliptical machine/stepmill machine/upper body ergometer→Machine; body weight/weighted→Bodyweight; stationary bike→Bike; rope→Rope; else `titleCase(original)`.
- tracking_type: category cardio→CARDIO; else name matches `/\b(plank|hold|hang)\b/i`→TIMED_HOLD; else equipment `body weight`→BODYWEIGHT_REPS; else WEIGHT_REPS.
- emoji: Chest/Back/Shoulders→🏋️, Legs→🦵, Arms→💪, Core→🧘, Cardio→🏃.
- `titleCase`: capitalize first letter of each space- or hyphen-separated word; uppercase `ez`→`EZ`; leave tokens starting with a digit unchanged.
- `aliases`: `[]`.

- [ ] **Step 1: Write failing tests** in `tests/exercisedb-convert.test.mjs` using `node:test` + `node:assert/strict`:

```js
test('converts a bodyweight core record', () => {
  const e = convertRecord({ id: '0001', name: '3/4 sit-up', category: 'waist', equipment: 'body weight', target: 'abs', secondary_muscles: ['hip flexors', 'lower back'] });
  assert.deepEqual(e, { id: 'edb-0001', name: '3/4 Sit-Up', muscle: 'Core', secondary: ['Legs', 'Back'], equipment: 'Bodyweight', aliases: [], emoji: '🧘', tracking_type: 'BODYWEIGHT_REPS' });
});
test('ez barbell maps to Barbell and EZ is uppercased', () => {
  const e = convertRecord({ id: '0100', name: 'ez barbell curl', category: 'upper arms', equipment: 'ez barbell', target: 'biceps', secondary_muscles: ['forearms'] });
  assert.equal(e.name, 'EZ Barbell Curl'); assert.equal(e.equipment, 'Barbell'); assert.equal(e.muscle, 'Arms'); assert.deepEqual(e.secondary, []);
});
// note: forearms→Arms equals primary → removed
test('plank is TIMED_HOLD, cardio is CARDIO', () => { /* name 'front plank', category 'waist' → TIMED_HOLD; category 'cardio' → CARDIO */ });
test('unknown category/equipment/muscle never yields undefined', () => {
  const e = convertRecord({ id: '9999', name: 'odd thing', category: 'mystery', equipment: 'tire', target: 'x', secondary_muscles: ['nonsense'] });
  assert.equal(e.muscle, 'Core'); assert.equal(e.equipment, 'Tire'); assert.deepEqual(e.secondary, []);
});
```

- [ ] **Step 2:** Run `npm test` — expect FAIL (module not found).
- [ ] **Step 3:** Implement `convertRecord` and `titleCase` in `scripts/exercisedb-convert.mjs` with the maps above as plain object lookups.
- [ ] **Step 4:** Run `npm test` — expect all PASS.
- [ ] **Step 5: Commit** `feat: add ExerciseDB record converter`

---

### Task 2: Build script + generated data

**Files:**
- Create: `scripts/build-exercisedb.mjs`
- Create (generated): `data/exercisedb.js`

**Interfaces:**
- Consumes: `convertRecord` (Task 1).
- Produces: `data/exercisedb.js` with `export const EXERCISEDB_EXERCISES = [ ... ];` (1,324 entries, sorted by dataset id).

- [ ] **Step 1:** Download dataset outside the repo: `curl -sL https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json -o <scratch>/exercises.json`.
- [ ] **Step 2:** Implement `scripts/build-exercisedb.mjs`: usage `node scripts/build-exercisedb.mjs <path-to-exercises.json>`; reads array (or `.exercises`), maps `convertRecord`, writes `data/exercisedb.js` = header comment (generated-file warning, source repo URL, full MIT licence text copied from the dataset's `LICENSE`, "media not included") + one entry per line via `JSON.stringify(entry)`. Exits non-zero with message if arg missing.
- [ ] **Step 3:** Run it. Verify: `node -e "import('./data/exercisedb.js').then(m=>console.log(m.EXERCISEDB_EXERCISES.length))"` prints `1324`.
- [ ] **Step 4:** Spot-check muscle distribution: no entry has a muscle outside the 7 allowed values (one-line node check, expect empty output).
- [ ] **Step 5: Commit** `feat: generate ExerciseDB catalogue data (MIT, text only)` — include script and generated file only.

---

### Task 3: Merge into catalogue

**Files:**
- Modify: `data/exercises.js` (import near top; `isBuiltInExercise`, `getAllExercises`, `getAllExercisesIncludingHidden` at ~lines 140–170)
- Test: `tests/exercises-catalogue.test.mjs`

**Interfaces:**
- Consumes: `EXERCISEDB_EXERCISES` from `./exercisedb.js`.
- Produces (unchanged signatures): `getAllExercises()`, `searchExercises(q)`, `getExerciseById(id)`, `isBuiltInExercise(id)` — now covering dataset entries. `EXERCISES` export stays built-ins only.

Dedupe rule (module-level, computed once): build a Set of normalized built-in keys (`name` + each alias; normalize = lowercase, strip non-alphanumerics). Drop a dataset entry if its normalized name is in the Set, OR if its name with the first word removed is in the Set AND that matching built-in's `equipment` equals the dataset entry's `equipment`. Result: `CATALOGUE_EXTRAS`.

- [ ] **Step 1: Write failing tests:**

```js
test('catalogue grows past 1000 and built-ins come first', () => {
  const all = getAllExercises();
  assert.ok(all.length > 1000);
  assert.equal(all[0].id, EXERCISES[0].id);
  assert.ok(all.findIndex(e => e.id.startsWith('edb-')) >= EXERCISES.length);
});
test('custom exercises sit between built-ins and dataset', () => {
  setCustomExercisesInMemory([{ id: 'custom-x', name: 'Zzz', muscle: 'Core' }]);
  assert.equal(getAllExercises()[EXERCISES.length].id, 'custom-x');
  setCustomExercisesInMemory([]);
});
test('barbell bench press duplicate dropped, dumbbell variant kept', () => {
  const names = getAllExercises().map(e => e.name.toLowerCase());
  assert.equal(names.filter(n => n === 'barbell bench press').length, 0);
  assert.ok(searchExercises('dumbbell bench press').length >= 1);
});
test('hidden dataset exercise disappears from list but resolves by id', () => {
  const id = getAllExercises().find(e => e.id.startsWith('edb-')).id;
  hideExerciseInMemory(id);
  assert.ok(!getAllExercises().some(e => e.id === id));
  assert.equal(getExerciseById(id).id, id);
  setHiddenExercisesInMemory([]);
});
test('dataset exercises are hide-not-delete', () => {
  assert.equal(isBuiltInExercise(getAllExercises().find(e => e.id.startsWith('edb-')).id), true);
});
```

- [ ] **Step 2:** `npm test` — expect FAIL.
- [ ] **Step 3:** Implement in `data/exercises.js`: import, `CATALOGUE_EXTRAS` dedupe, `getAllExercises` returns `[...visibleBuiltIns, ..._customExercises, ...visibleExtras]` (hidden filter applies to extras too), `getAllExercisesIncludingHidden` returns `[...BUILT_IN_EXERCISES, ..._customExercises, ...CATALOGUE_EXTRAS]`, `isBuiltInExercise` checks both lists. Update the "array is small" comment.
- [ ] **Step 4:** `npm test` — expect all PASS.
- [ ] **Step 5: Commit** `feat: merge ExerciseDB catalogue into exercise lookups`

---

### Task 4: Attribution + app check

**Files:**
- Modify: `screens/SettingsScreen.js` (add one `helpText` line near the last card, ~line 255–270)

- [ ] **Step 1:** Add credit text: `Exercise data from ExerciseDB via hasaneyldrm/exercises-dataset (MIT licence).` using existing `styles.helpText`.
- [ ] **Step 2:** Run web build (`npx expo start --web`), open Exercise Library and Picker: search "lever" returns dataset results; Chest tab lists built-ins first; scrolling a long tab stays smooth; hide a dataset exercise from Library and confirm it disappears. Settings shows the credit line.
- [ ] **Step 3:** `npm test` green; `graphify update .`.
- [ ] **Step 4: Commit** `feat: credit ExerciseDB in Settings`
