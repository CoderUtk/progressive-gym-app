// Every exercise carries a `tracking_type` that determines what shape a
// logged set takes and which UI to render in the workout logger. Adding a
// new type here is the entry point for supporting a new logging modality;
// downstream renderers key off this value via `utils/setSchema.js`.
//
// Types:
//   WEIGHT_REPS      — { weight (kg), reps, type }
//   BODYWEIGHT_REPS  — { reps, addedWeight (kg, can be 0 or negative for assist), type }
//   TIMED_HOLD       — { durationSec, type }
//   CARDIO           — { durationSec, distance, distanceUnit ('km'|'mi'), level, incline, calories, heartRate, type }
import { EXERCISEDB_EXERCISES } from './exercisedb.js';

export const TRACKING = {
  WEIGHT_REPS: 'WEIGHT_REPS',
  BODYWEIGHT_REPS: 'BODYWEIGHT_REPS',
  TIMED_HOLD: 'TIMED_HOLD',
  CARDIO: 'CARDIO',
};

// Built-in exercise catalog. Custom user-added exercises live separately in
// AsyncStorage under 'progressive:customExercises' and are merged in at
// runtime — see loadCustomExercises() below.
const BUILT_IN_EXERCISES = [
  // ─── Chest ────────────────────────────────────────────────────────────
  { id: 'bench-press', name: 'Bench Press', muscle: 'Chest', secondary: ['Triceps', 'Shoulders'], equipment: 'Barbell', aliases: ['flat bench', 'bb bench'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'incline-bench-press', name: 'Incline Bench Press', muscle: 'Chest', secondary: ['Shoulders', 'Triceps'], equipment: 'Barbell', aliases: ['incline bb'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'decline-bench-press', name: 'Decline Bench Press', muscle: 'Chest', secondary: ['Triceps'], equipment: 'Barbell', aliases: [], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'db-bench-press', name: 'Dumbbell Bench Press', muscle: 'Chest', secondary: ['Triceps', 'Shoulders'], equipment: 'Dumbbell', aliases: ['flat db press'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', muscle: 'Chest', secondary: ['Shoulders'], equipment: 'Dumbbell', aliases: ['incline press', 'db incline'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'db-fly', name: 'Dumbbell Fly', muscle: 'Chest', secondary: [], equipment: 'Dumbbell', aliases: ['chest fly', 'flye'], emoji: '🦋', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'cable-fly', name: 'Cable Fly', muscle: 'Chest', secondary: [], equipment: 'Cable', aliases: ['cable crossover'], emoji: '🦋', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'chest-press-machine', name: 'Chest Press Machine', muscle: 'Chest', secondary: ['Triceps'], equipment: 'Machine', aliases: [], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'pec-deck', name: 'Pec Deck', muscle: 'Chest', secondary: [], equipment: 'Machine', aliases: ['machine fly'], emoji: '🦋', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'push-up', name: 'Push-Up', muscle: 'Chest', secondary: ['Triceps', 'Shoulders'], equipment: 'Bodyweight', aliases: ['pushup'], emoji: '💪', tracking_type: TRACKING.BODYWEIGHT_REPS },
  { id: 'dips', name: 'Dips', muscle: 'Chest', secondary: ['Triceps', 'Shoulders'], equipment: 'Bodyweight', aliases: ['tricep dips', 'parallel bar dips'], emoji: '💪', tracking_type: TRACKING.BODYWEIGHT_REPS },

  // ─── Back ─────────────────────────────────────────────────────────────
  { id: 'deadlift', name: 'Deadlift', muscle: 'Back', secondary: ['Legs', 'Glutes'], equipment: 'Barbell', aliases: ['conventional deadlift', 'dl'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscle: 'Back', secondary: ['Legs', 'Glutes'], equipment: 'Barbell', aliases: ['rdl'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'sumo-deadlift', name: 'Sumo Deadlift', muscle: 'Back', secondary: ['Legs', 'Glutes'], equipment: 'Barbell', aliases: ['sumo dl'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'bent-over-row', name: 'Bent-Over Row', muscle: 'Back', secondary: ['Biceps'], equipment: 'Barbell', aliases: ['bb row'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'pendlay-row', name: 'Pendlay Row', muscle: 'Back', secondary: ['Biceps'], equipment: 'Barbell', aliases: [], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 't-bar-row', name: 'T-Bar Row', muscle: 'Back', secondary: ['Biceps'], equipment: 'Barbell', aliases: ['landmine row'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'db-row', name: 'Dumbbell Row', muscle: 'Back', secondary: ['Biceps'], equipment: 'Dumbbell', aliases: ['one arm row', 'single arm row'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscle: 'Back', secondary: ['Biceps'], equipment: 'Machine', aliases: ['lat machine', 'pulldown'], emoji: '🧗', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'seated-row', name: 'Seated Cable Row', muscle: 'Back', secondary: ['Biceps'], equipment: 'Cable', aliases: ['cable row'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'straight-arm-pulldown', name: 'Straight-Arm Pulldown', muscle: 'Back', secondary: [], equipment: 'Cable', aliases: [], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'chest-supported-row', name: 'Chest-Supported Row', muscle: 'Back', secondary: ['Biceps'], equipment: 'Machine', aliases: ['seal row'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'pull-up', name: 'Pull-Up', muscle: 'Back', secondary: ['Biceps'], equipment: 'Bodyweight', aliases: ['chin up', 'pullup'], emoji: '🧗', tracking_type: TRACKING.BODYWEIGHT_REPS },
  { id: 'chin-up', name: 'Chin-Up', muscle: 'Back', secondary: ['Biceps'], equipment: 'Bodyweight', aliases: [], emoji: '🧗', tracking_type: TRACKING.BODYWEIGHT_REPS },
  { id: 'inverted-row', name: 'Inverted Row', muscle: 'Back', secondary: ['Biceps'], equipment: 'Bodyweight', aliases: ['bodyweight row'], emoji: '💪', tracking_type: TRACKING.BODYWEIGHT_REPS },

  // ─── Legs ─────────────────────────────────────────────────────────────
  { id: 'squat', name: 'Back Squat', muscle: 'Legs', secondary: ['Glutes', 'Core'], equipment: 'Barbell', aliases: ['squats', 'bb squat'], emoji: '🦵', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'front-squat', name: 'Front Squat', muscle: 'Legs', secondary: ['Core'], equipment: 'Barbell', aliases: [], emoji: '🦵', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'goblet-squat', name: 'Goblet Squat', muscle: 'Legs', secondary: ['Glutes'], equipment: 'Dumbbell', aliases: [], emoji: '🦵', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscle: 'Legs', secondary: ['Glutes'], equipment: 'Dumbbell', aliases: ['bss', 'rear foot elevated split squat'], emoji: '🦵', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'walking-lunge', name: 'Walking Lunge', muscle: 'Legs', secondary: ['Glutes'], equipment: 'Dumbbell', aliases: ['lunges'], emoji: '🦵', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'leg-press', name: 'Leg Press', muscle: 'Legs', secondary: ['Glutes'], equipment: 'Machine', aliases: [], emoji: '🦵', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'hack-squat', name: 'Hack Squat', muscle: 'Legs', secondary: ['Glutes'], equipment: 'Machine', aliases: [], emoji: '🦵', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'leg-extension', name: 'Leg Extension', muscle: 'Legs', secondary: [], equipment: 'Machine', aliases: ['quad extension'], emoji: '🦵', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'leg-curl', name: 'Leg Curl', muscle: 'Legs', secondary: [], equipment: 'Machine', aliases: ['hamstring curl'], emoji: '🦵', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'calf-raise', name: 'Standing Calf Raise', muscle: 'Legs', secondary: [], equipment: 'Machine', aliases: ['calves'], emoji: '🦵', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'seated-calf-raise', name: 'Seated Calf Raise', muscle: 'Legs', secondary: [], equipment: 'Machine', aliases: [], emoji: '🦵', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'hip-thrust', name: 'Hip Thrust', muscle: 'Legs', secondary: ['Glutes'], equipment: 'Barbell', aliases: ['glute bridge'], emoji: '🍑', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'wall-sit', name: 'Wall Sit', muscle: 'Legs', secondary: ['Glutes'], equipment: 'Bodyweight', aliases: ['wall squat'], emoji: '🦵', tracking_type: TRACKING.TIMED_HOLD },

  // ─── Shoulders ────────────────────────────────────────────────────────
  { id: 'shoulder-press', name: 'Overhead Shoulder Press', muscle: 'Shoulders', secondary: ['Triceps'], equipment: 'Dumbbell', aliases: ['ohp', 'military press'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'bb-shoulder-press', name: 'Barbell Overhead Press', muscle: 'Shoulders', secondary: ['Triceps'], equipment: 'Barbell', aliases: ['strict press', 'ohp bb'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'arnold-press', name: 'Arnold Press', muscle: 'Shoulders', secondary: ['Triceps'], equipment: 'Dumbbell', aliases: [], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'lateral-raise', name: 'Lateral Raise', muscle: 'Shoulders', secondary: [], equipment: 'Dumbbell', aliases: ['side raise', 'db lateral'], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', muscle: 'Shoulders', secondary: [], equipment: 'Cable', aliases: [], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'front-raise', name: 'Front Raise', muscle: 'Shoulders', secondary: [], equipment: 'Dumbbell', aliases: [], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', muscle: 'Shoulders', secondary: ['Back'], equipment: 'Dumbbell', aliases: ['reverse fly'], emoji: '🦋', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'face-pull', name: 'Face Pull', muscle: 'Shoulders', secondary: ['Back'], equipment: 'Cable', aliases: ['rope face pull', 'rope'], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'upright-row', name: 'Upright Row', muscle: 'Shoulders', secondary: ['Arms'], equipment: 'Barbell', aliases: [], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'shrugs', name: 'Shrugs', muscle: 'Shoulders', secondary: ['Back'], equipment: 'Dumbbell', aliases: ['db shrugs'], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },

  // ─── Arms ─────────────────────────────────────────────────────────────
  { id: 'bicep-curl', name: 'Dumbbell Curl', muscle: 'Arms', secondary: ['Biceps'], equipment: 'Dumbbell', aliases: ['db curl', 'bicep curl'], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'bb-curl', name: 'Barbell Curl', muscle: 'Arms', secondary: ['Biceps'], equipment: 'Barbell', aliases: ['ez bar curl'], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'hammer-curl', name: 'Hammer Curl', muscle: 'Arms', secondary: ['Biceps'], equipment: 'Dumbbell', aliases: [], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'preacher-curl', name: 'Preacher Curl', muscle: 'Arms', secondary: ['Biceps'], equipment: 'Machine', aliases: [], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'cable-curl', name: 'Cable Curl', muscle: 'Arms', secondary: ['Biceps'], equipment: 'Cable', aliases: ['rope curl'], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'concentration-curl', name: 'Concentration Curl', muscle: 'Arms', secondary: ['Biceps'], equipment: 'Dumbbell', aliases: [], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscle: 'Arms', secondary: ['Triceps'], equipment: 'Cable', aliases: ['rope pushdown', 'rope'], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'overhead-tricep-ext', name: 'Overhead Tricep Extension', muscle: 'Arms', secondary: ['Triceps'], equipment: 'Dumbbell', aliases: ['french press'], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'skull-crusher', name: 'Skull Crusher', muscle: 'Arms', secondary: ['Triceps'], equipment: 'Barbell', aliases: ['lying tricep extension'], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'close-grip-bench', name: 'Close-Grip Bench Press', muscle: 'Arms', secondary: ['Chest', 'Triceps'], equipment: 'Barbell', aliases: ['cgbp'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'wrist-curl', name: 'Wrist Curl', muscle: 'Arms', secondary: [], equipment: 'Dumbbell', aliases: ['forearm curl'], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },

  // ─── Core ─────────────────────────────────────────────────────────────
  { id: 'plank', name: 'Plank', muscle: 'Core', secondary: [], equipment: 'Bodyweight', aliases: ['front plank'], emoji: '🔥', tracking_type: TRACKING.TIMED_HOLD },
  { id: 'side-plank', name: 'Side Plank', muscle: 'Core', secondary: [], equipment: 'Bodyweight', aliases: [], emoji: '🔥', tracking_type: TRACKING.TIMED_HOLD },
  { id: 'cable-crunch', name: 'Cable Crunch', muscle: 'Core', secondary: [], equipment: 'Cable', aliases: ['rope crunch', 'rope'], emoji: '🔥', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscle: 'Core', secondary: [], equipment: 'Bodyweight', aliases: ['leg raise', 'toes to bar'], emoji: '🔥', tracking_type: TRACKING.BODYWEIGHT_REPS },
  { id: 'ab-wheel', name: 'Ab Wheel Rollout', muscle: 'Core', secondary: [], equipment: 'Bodyweight', aliases: ['rollout'], emoji: '🔥', tracking_type: TRACKING.BODYWEIGHT_REPS },
  { id: 'russian-twist', name: 'Russian Twist', muscle: 'Core', secondary: [], equipment: 'Dumbbell', aliases: [], emoji: '🔥', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'sit-up', name: 'Sit-Up', muscle: 'Core', secondary: [], equipment: 'Bodyweight', aliases: [], emoji: '🔥', tracking_type: TRACKING.BODYWEIGHT_REPS },
  { id: 'dead-bug', name: 'Dead Bug', muscle: 'Core', secondary: [], equipment: 'Bodyweight', aliases: [], emoji: '🔥', tracking_type: TRACKING.BODYWEIGHT_REPS },
  { id: 'hollow-hold', name: 'Hollow Body Hold', muscle: 'Core', secondary: [], equipment: 'Bodyweight', aliases: [], emoji: '🔥', tracking_type: TRACKING.TIMED_HOLD },

  // ─── Cardio ───────────────────────────────────────────────────────────
  { id: 'treadmill-run', name: 'Treadmill Run', muscle: 'Cardio', secondary: [], equipment: 'Treadmill', aliases: ['run', 'running'], emoji: '🏃', tracking_type: TRACKING.CARDIO },
  { id: 'treadmill-walk', name: 'Treadmill Walk', muscle: 'Cardio', secondary: [], equipment: 'Treadmill', aliases: ['incline walk'], emoji: '🚶', tracking_type: TRACKING.CARDIO },
  { id: 'stationary-bike', name: 'Stationary Bike', muscle: 'Cardio', secondary: [], equipment: 'Bike', aliases: ['bike', 'cycling'], emoji: '🚴', tracking_type: TRACKING.CARDIO },
  { id: 'assault-bike', name: 'Assault Bike', muscle: 'Cardio', secondary: [], equipment: 'Bike', aliases: ['air bike'], emoji: '🚴', tracking_type: TRACKING.CARDIO },
  { id: 'rowing-machine', name: 'Rowing Machine', muscle: 'Cardio', secondary: [], equipment: 'Rower', aliases: ['row', 'erg'], emoji: '🚣', tracking_type: TRACKING.CARDIO },
  { id: 'stairmaster', name: 'Stairmaster', muscle: 'Cardio', secondary: [], equipment: 'Stairmaster', aliases: ['stair climber', 'stairs'], emoji: '🪜', tracking_type: TRACKING.CARDIO },
  { id: 'jump-rope', name: 'Jump Rope', muscle: 'Cardio', secondary: [], equipment: 'Rope', aliases: ['skipping'], emoji: '🪢', tracking_type: TRACKING.CARDIO },
  { id: 'elliptical', name: 'Elliptical', muscle: 'Cardio', secondary: [], equipment: 'Machine', aliases: [], emoji: '🏃', tracking_type: TRACKING.CARDIO },
];

// ExerciseDB entries minus those duplicating a built-in. Computed once.
// Dropped when the normalized name matches a built-in name/alias, or when the
// name minus its first word matches AND the matching built-in's equipment is
// the same (e.g. "Barbell Bench Press" vs built-in "Bench Press"/Barbell).
const _norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const _builtInByKey = new Map();
for (const e of BUILT_IN_EXERCISES) {
  for (const k of [e.name, ...(e.aliases || [])]) _builtInByKey.set(_norm(k), e);
}
// Only a leading equipment word may be stripped; "Diamond Push-Up" is not "Push-Up".
const _EQUIPMENT_WORDS = new Set(['barbell', 'dumbbell', 'cable', 'lever', 'smith', 'sled', 'ez', 'ez-bar', 'ez-barbell']);
const CATALOGUE_EXTRAS = EXERCISEDB_EXERCISES.filter((x) => {
  if (_builtInByKey.has(_norm(x.name))) return false;
  const [first, ...tail] = x.name.toLowerCase().split(/\s+/);
  const match = _EQUIPMENT_WORDS.has(first) && _builtInByKey.get(_norm(tail.join(' ')));
  return !(match && match.equipment === x.equipment);
});

// ─── Custom exercise infra ────────────────────────────────────────────────
// User-added exercises live in AsyncStorage. We load them into an in-memory
// array on app start (see SplashScreen) so the existing sync APIs
// (searchExercises / getExerciseById / EXERCISES export) continue to work
// without every consumer becoming async.
let _customExercises = [];
// Ids of built-in exercises the user has "deleted" (hidden). Loaded into
// memory at startup from AsyncStorage — see SplashScreen — mirroring the
// custom-exercise pattern so the sync getAllExercises() API stays sync.
let _hiddenIds = [];

export function getCustomExercises() {
  return _customExercises;
}

export function setCustomExercisesInMemory(list) {
  _customExercises = Array.isArray(list) ? list : [];
}

export function setHiddenExercisesInMemory(ids) {
  _hiddenIds = Array.isArray(ids) ? ids : [];
}

export function hideExerciseInMemory(id) {
  if (!_hiddenIds.includes(id)) _hiddenIds = [..._hiddenIds, id];
}

export function isBuiltInExercise(id) {
  return BUILT_IN_EXERCISES.some((e) => e.id === id) || CATALOGUE_EXTRAS.some((e) => e.id === id);
}

export function addCustomExerciseInMemory(ex) {
  if (!ex?.id) return;
  const without = _customExercises.filter((e) => e.id !== ex.id);
  _customExercises = [...without, ex];
}

export function deleteCustomExerciseInMemory(id) {
  _customExercises = _customExercises.filter((e) => e.id !== id);
}

// Live combined list, EXCLUDING hidden built-ins. This is the "visible
// catalog" used by search, the library, and the exercise picker. We
// reconstruct on every access so freshly-added/removed items show up
// immediately without a reactive subscription — cheap array spreads/filters.
export function getAllExercises() {
  const visibleBuiltIns = _hiddenIds.length
    ? BUILT_IN_EXERCISES.filter((e) => !_hiddenIds.includes(e.id))
    : BUILT_IN_EXERCISES;
  const visibleExtras = _hiddenIds.length
    ? CATALOGUE_EXTRAS.filter((e) => !_hiddenIds.includes(e.id))
    : CATALOGUE_EXTRAS;
  return [...visibleBuiltIns, ..._customExercises, ...visibleExtras];
}

// Full list INCLUDING hidden built-ins — used only for id lookups so that
// historical workouts referencing a hidden exercise still resolve its name,
// muscle, and tracking type when rendering history and analytics.
function getAllExercisesIncludingHidden() {
  return [...BUILT_IN_EXERCISES, ..._customExercises, ...CATALOGUE_EXTRAS];
}

// Kept for backwards compatibility with existing code that imports EXERCISES
// directly. Points at the built-in list only — screens that want to include
// custom exercises call getAllExercises() or use searchExercises.
export const EXERCISES = BUILT_IN_EXERCISES;

export function searchExercises(query) {
  const all = getAllExercises();
  const q = (query || '').trim().toLowerCase();
  if (!q) return all;
  return all.filter((e) => {
    const haystack = [e.name, e.muscle, e.equipment, ...(e.aliases || [])]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function getExerciseById(id) {
  return getAllExercisesIncludingHidden().find((e) => e.id === id);
}

export const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Arms', 'Shoulders', 'Core', 'Cardio'];
export const EQUIPMENT_TYPES = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Treadmill', 'Bike', 'Rower', 'Stairmaster', 'Rope'];

// Default weekly working-set targets per muscle group, used by the Weekly
// Volume Breakdown card. Reasonable trainer defaults; adjustable later.
export const WEEKLY_SET_TARGETS = {
  Chest: 12,
  Back: 14,
  Legs: 16,
  Shoulders: 10,
  Arms: 10,
  Core: 10,
  Cardio: 3, // sessions, not sets — treated as sessions in the calc
};
