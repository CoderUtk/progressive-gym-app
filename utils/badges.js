import { detectPRs } from './progressiveOverload';
import { volumeForSet } from './setSchema';
import { getExerciseById, TRACKING } from '../data/exercises';

// A cardio set carries distance in either km or mi. Normalize to km so
// totals across mixed logs (treadmill in mi, bike in km) are comparable.
function distanceKm(set) {
  const d = Number(set?.distance) || 0;
  if (!d) return 0;
  return set.distanceUnit === 'mi' ? d * 1.60934 : d;
}

// Walks every logged workout in chronological order and tallies totals used
// for the profile screen and badge unlocking. Everything starts at zero for
// a brand-new profile — nothing here is seeded or assumed.
export function computeStats(workouts, bodyweightKg = 70) {
  const sorted = [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date));
  const totalWorkouts = sorted.length;
  const totalSets = sorted.reduce(
    (sum, w) => sum + w.exercises.reduce((s, e) => s + e.sets.length, 0),
    0
  );
  const totalWeight = sorted.reduce(
    (sum, w) =>
      sum + w.exercises.reduce((s, e) => {
        const exercise = getExerciseById(e.exerciseId);
        return s + e.sets.reduce((ss, x) => ss + volumeForSet(exercise, x, bodyweightKg), 0);
      }, 0),
    0
  );

  const historyByExercise = {};
  let totalPRs = 0;
  // Cardio: session = any workout that includes at least one cardio-tracked
  // exercise. Duration and distance summed across every cardio set logged.
  let totalCardioSessions = 0;
  let totalCardioSecs = 0;
  let totalCardioKm = 0;
  sorted.forEach((w) => {
    let hasCardio = false;
    w.exercises.forEach((ex) => {
      const hist = historyByExercise[ex.exerciseId] || [];
      const exercise = getExerciseById(ex.exerciseId);
      const trackingType = exercise?.tracking_type || 'WEIGHT_REPS';
      totalPRs += detectPRs(hist, ex.sets, trackingType).length;
      historyByExercise[ex.exerciseId] = [{ date: w.date, sets: ex.sets }, ...hist];
      if (trackingType === TRACKING.CARDIO) {
        hasCardio = true;
        ex.sets.forEach((s) => {
          totalCardioSecs += Number(s.durationSec) || 0;
          totalCardioKm += distanceKm(s);
        });
      }
    });
    if (hasCardio) totalCardioSessions += 1;
  });

  return {
    totalWorkouts,
    totalSets,
    totalWeight,
    totalPRs,
    totalCardioSessions,
    totalCardioSecs,
    totalCardioKm,
  };
}

// Experience level, purely based on workouts logged so far.
export function computeLevel(totalWorkouts) {
  if (totalWorkouts >= 60) return 'Advanced';
  if (totalWorkouts >= 20) return 'Intermediate';
  if (totalWorkouts >= 1) return 'Beginner';
  return 'New';
}

export const BADGE_DEFS = [
  // ─── Workouts ────────────────────────────────────────────────────────
  { id: 'first-workout', label: 'First Workout', emoji: '🏆', check: (s) => s.totalWorkouts >= 1 },
  { id: 'five-workouts', label: '5 Workouts', emoji: '🎯', check: (s) => s.totalWorkouts >= 5 },
  { id: 'ten-workouts', label: '10 Workouts', emoji: '🏋️', check: (s) => s.totalWorkouts >= 10 },
  { id: 'thirty-workouts', label: '30 Workouts', emoji: '🔱', check: (s) => s.totalWorkouts >= 30 },
  { id: 'hundred-workouts', label: '100 Workouts', emoji: '💯', check: (s) => s.totalWorkouts >= 100 },
  // ─── PRs ─────────────────────────────────────────────────────────────
  { id: 'first-pr', label: 'First PR', emoji: '⭐', check: (s) => s.totalPRs >= 1 },
  { id: 'ten-prs', label: '10 PRs', emoji: '🌟', check: (s) => s.totalPRs >= 10 },
  { id: 'twenty-five-prs', label: '25 PRs', emoji: '🏅', check: (s) => s.totalPRs >= 25 },
  // ─── Volume ──────────────────────────────────────────────────────────
  { id: 'hundred-sets', label: '100 Sets Logged', emoji: '🔥', check: (s) => s.totalSets >= 100 },
  { id: 'five-hundred-sets', label: '500 Sets Logged', emoji: '⚡', check: (s) => s.totalSets >= 500 },
  { id: 'thousand-sets', label: '1000 Sets Logged', emoji: '🚀', check: (s) => s.totalSets >= 1000 },
  { id: 'ten-thousand-kg', label: '10,000kg Lifted', emoji: '🏔️', check: (s) => s.totalWeight >= 10000 },
  { id: 'fifty-thousand-kg', label: '50,000kg Lifted', emoji: '🌋', check: (s) => s.totalWeight >= 50000 },
  { id: 'hundred-thousand-kg', label: '100,000kg Lifted', emoji: '🪐', check: (s) => s.totalWeight >= 100000 },
  // ─── Cardio ──────────────────────────────────────────────────────────
  { id: 'first-cardio', label: 'First Cardio', emoji: '🏃', check: (s) => (s.totalCardioSessions || 0) >= 1 },
  { id: 'ten-cardio', label: '10 Cardio Sessions', emoji: '🚴', check: (s) => (s.totalCardioSessions || 0) >= 10 },
  { id: 'fifty-cardio', label: '50 Cardio Sessions', emoji: '🚣', check: (s) => (s.totalCardioSessions || 0) >= 50 },
  { id: 'sixty-min-cardio', label: '1 Hour of Cardio', emoji: '⏱️', check: (s) => (s.totalCardioSecs || 0) >= 3600 },
  { id: 'five-hr-cardio', label: '5 Hours of Cardio', emoji: '⏰', check: (s) => (s.totalCardioSecs || 0) >= 5 * 3600 },
  { id: 'twenty-hr-cardio', label: '20 Hours of Cardio', emoji: '📅', check: (s) => (s.totalCardioSecs || 0) >= 20 * 3600 },
  { id: 'five-km', label: '5 km Total', emoji: '🥾', check: (s) => (s.totalCardioKm || 0) >= 5 },
  { id: 'twenty-km', label: '20 km Total', emoji: '🏞️', check: (s) => (s.totalCardioKm || 0) >= 20 },
  { id: 'hundred-km', label: '100 km Total', emoji: '🗺️', check: (s) => (s.totalCardioKm || 0) >= 100 },
  { id: 'marathon-total', label: 'Marathon Distance', emoji: '🎖️', check: (s) => (s.totalCardioKm || 0) >= 42.195 },
];

export function getBadgeStatus(stats) {
  return BADGE_DEFS.map((b) => ({ ...b, earned: b.check(stats) }));
}
