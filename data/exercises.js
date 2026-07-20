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
export const TRACKING = {
  WEIGHT_REPS: 'WEIGHT_REPS',
  BODYWEIGHT_REPS: 'BODYWEIGHT_REPS',
  TIMED_HOLD: 'TIMED_HOLD',
  CARDIO: 'CARDIO',
};

export const EXERCISES = [
  // — Weighted classics ————————————————————————————————
  { id: 'bench-press', name: 'Bench Press', muscle: 'Chest', secondary: ['Triceps', 'Shoulders'], equipment: 'Barbell', aliases: ['flat bench', 'bb bench'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', muscle: 'Chest', secondary: ['Shoulders'], equipment: 'Dumbbell', aliases: ['incline press', 'db incline'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscle: 'Back', secondary: ['Biceps'], equipment: 'Machine', aliases: ['lat machine', 'pulldown'], emoji: '🧗', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscle: 'Arms', secondary: ['Triceps'], equipment: 'Cable', aliases: ['rope pushdown', 'rope'], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'face-pull', name: 'Face Pull', muscle: 'Shoulders', secondary: ['Back'], equipment: 'Cable', aliases: ['rope face pull', 'rope'], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'cable-crunch', name: 'Cable Crunch', muscle: 'Core', secondary: [], equipment: 'Cable', aliases: ['rope crunch', 'rope'], emoji: '🔥', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'squat', name: 'Back Squat', muscle: 'Legs', secondary: ['Glutes', 'Core'], equipment: 'Barbell', aliases: ['squats', 'bb squat'], emoji: '🦵', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'deadlift', name: 'Deadlift', muscle: 'Back', secondary: ['Legs', 'Glutes'], equipment: 'Barbell', aliases: ['conventional deadlift', 'dl'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'shoulder-press', name: 'Overhead Shoulder Press', muscle: 'Shoulders', secondary: ['Triceps'], equipment: 'Dumbbell', aliases: ['ohp', 'military press'], emoji: '🏋️', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'bicep-curl', name: 'Bicep Curl', muscle: 'Arms', secondary: ['Biceps'], equipment: 'Dumbbell', aliases: ['db curl'], emoji: '💪', tracking_type: TRACKING.WEIGHT_REPS },
  { id: 'leg-press', name: 'Leg Press', muscle: 'Legs', secondary: ['Glutes'], equipment: 'Machine', aliases: [], emoji: '🦵', tracking_type: TRACKING.WEIGHT_REPS },

  // — Bodyweight ————————————————————————————————————————
  { id: 'pull-up', name: 'Pull-Up', muscle: 'Back', secondary: ['Biceps'], equipment: 'Bodyweight', aliases: ['chin up', 'pullup'], emoji: '🧗', tracking_type: TRACKING.BODYWEIGHT_REPS },
  { id: 'push-up', name: 'Push-Up', muscle: 'Chest', secondary: ['Triceps', 'Shoulders'], equipment: 'Bodyweight', aliases: ['pushup'], emoji: '💪', tracking_type: TRACKING.BODYWEIGHT_REPS },
  { id: 'dips', name: 'Dips', muscle: 'Chest', secondary: ['Triceps', 'Shoulders'], equipment: 'Bodyweight', aliases: ['tricep dips', 'parallel bar dips'], emoji: '💪', tracking_type: TRACKING.BODYWEIGHT_REPS },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscle: 'Core', secondary: [], equipment: 'Bodyweight', aliases: ['leg raise', 'toes to bar'], emoji: '🔥', tracking_type: TRACKING.BODYWEIGHT_REPS },

  // — Timed holds ————————————————————————————————————————
  { id: 'plank', name: 'Plank', muscle: 'Core', secondary: [], equipment: 'Bodyweight', aliases: ['front plank'], emoji: '🔥', tracking_type: TRACKING.TIMED_HOLD },
  { id: 'side-plank', name: 'Side Plank', muscle: 'Core', secondary: [], equipment: 'Bodyweight', aliases: [], emoji: '🔥', tracking_type: TRACKING.TIMED_HOLD },
  { id: 'wall-sit', name: 'Wall Sit', muscle: 'Legs', secondary: ['Glutes'], equipment: 'Bodyweight', aliases: ['wall squat'], emoji: '🦵', tracking_type: TRACKING.TIMED_HOLD },

  // — Cardio ————————————————————————————————————————————
  { id: 'treadmill-run', name: 'Treadmill Run', muscle: 'Cardio', secondary: [], equipment: 'Treadmill', aliases: ['run', 'running'], emoji: '🏃', tracking_type: TRACKING.CARDIO },
  { id: 'stationary-bike', name: 'Stationary Bike', muscle: 'Cardio', secondary: [], equipment: 'Bike', aliases: ['bike', 'cycling'], emoji: '🚴', tracking_type: TRACKING.CARDIO },
  { id: 'rowing-machine', name: 'Rowing Machine', muscle: 'Cardio', secondary: [], equipment: 'Rower', aliases: ['row', 'erg'], emoji: '🚣', tracking_type: TRACKING.CARDIO },
  { id: 'stairmaster', name: 'Stairmaster', muscle: 'Cardio', secondary: [], equipment: 'Stairmaster', aliases: ['stair climber', 'stairs'], emoji: '🪜', tracking_type: TRACKING.CARDIO },
  { id: 'jump-rope', name: 'Jump Rope', muscle: 'Cardio', secondary: [], equipment: 'Rope', aliases: ['skipping'], emoji: '🪢', tracking_type: TRACKING.CARDIO },
];

export function searchExercises(query) {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISES;
  return EXERCISES.filter((e) => {
    const haystack = [e.name, e.muscle, e.equipment, ...e.aliases]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function getExerciseById(id) {
  return EXERCISES.find((e) => e.id === id);
}

export const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Arms', 'Shoulders', 'Core', 'Cardio'];

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
