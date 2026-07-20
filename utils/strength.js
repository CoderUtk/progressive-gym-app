// Epley formula — a widely used estimate, not a substitute for an actual
// tested 1RM.
export function estimate1RM(weightKg, reps) {
  if (!weightKg || !reps) return null;
  return weightKg * (1 + reps / 30);
}

// Rough, commonly cited bodyweight-ratio strength standards for the three
// main barbell lifts. These are general reference points (not adjusted for
// sex, age, or training history) — shown as a fun gauge, not a verified
// benchmark.
export const STRENGTH_STANDARDS = {
  'bench-press': { Novice: 0.5, Intermediate: 1.0, Advanced: 1.5, Elite: 2.0 },
  squat: { Novice: 0.75, Intermediate: 1.25, Advanced: 1.75, Elite: 2.25 },
  deadlift: { Novice: 1.0, Intermediate: 1.5, Advanced: 2.0, Elite: 2.5 },
};

export const STRENGTH_LIFT_LABELS = {
  'bench-press': 'Bench Press',
  squat: 'Squat',
  deadlift: 'Deadlift',
};

// Returns the highest tier whose ratio the lifter's best e1RM clears, or
// null if bodyweight/e1RM data isn't available yet.
export function computeStrengthTier(exerciseId, best1RM, bodyweightKg) {
  const standards = STRENGTH_STANDARDS[exerciseId];
  if (!standards || !best1RM || !bodyweightKg) return null;
  const ratio = best1RM / bodyweightKg;
  const tiers = ['Elite', 'Advanced', 'Intermediate', 'Novice'];
  for (const tier of tiers) {
    if (ratio >= standards[tier]) return tier;
  }
  return null;
}
