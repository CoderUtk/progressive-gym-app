import { detectPRs } from './progressiveOverload';

// Walks every logged workout in chronological order and tallies totals used
// for the profile screen and badge unlocking. Everything starts at zero for
// a brand-new profile — nothing here is seeded or assumed.
export function computeStats(workouts) {
  const sorted = [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date));
  const totalWorkouts = sorted.length;
  const totalSets = sorted.reduce(
    (sum, w) => sum + w.exercises.reduce((s, e) => s + e.sets.length, 0),
    0
  );
  const totalWeight = sorted.reduce(
    (sum, w) =>
      sum + w.exercises.reduce((s, e) => s + e.sets.reduce((ss, x) => ss + x.weight * x.reps, 0), 0),
    0
  );

  const historyByExercise = {};
  let totalPRs = 0;
  sorted.forEach((w) => {
    w.exercises.forEach((ex) => {
      const hist = historyByExercise[ex.exerciseId] || [];
      totalPRs += detectPRs(hist, ex.sets).length;
      historyByExercise[ex.exerciseId] = [{ date: w.date, sets: ex.sets }, ...hist];
    });
  });

  return { totalWorkouts, totalSets, totalWeight, totalPRs };
}

// Experience level, purely based on workouts logged so far.
export function computeLevel(totalWorkouts) {
  if (totalWorkouts >= 60) return 'Advanced';
  if (totalWorkouts >= 20) return 'Intermediate';
  if (totalWorkouts >= 1) return 'Beginner';
  return 'New';
}

export const BADGE_DEFS = [
  { id: 'first-workout', label: 'First Workout', emoji: '🎬', check: (s) => s.totalWorkouts >= 1 },
  { id: 'ten-workouts', label: '10 Workouts', emoji: '🏋️', check: (s) => s.totalWorkouts >= 10 },
  { id: 'hundred-workouts', label: '100 Workouts', emoji: '💯', check: (s) => s.totalWorkouts >= 100 },
  { id: 'first-pr', label: 'First PR', emoji: '⭐', check: (s) => s.totalPRs >= 1 },
  { id: 'ten-prs', label: '10 PRs', emoji: '🌟', check: (s) => s.totalPRs >= 10 },
  { id: 'hundred-sets', label: '100 Sets Logged', emoji: '🔥', check: (s) => s.totalSets >= 100 },
  { id: 'thousand-sets', label: '1000 Sets Logged', emoji: '🚀', check: (s) => s.totalSets >= 1000 },
];

export function getBadgeStatus(stats) {
  return BADGE_DEFS.map((b) => ({ ...b, earned: b.check(stats) }));
}
