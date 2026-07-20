// Given a list of past sessions for an exercise (most recent first) and the
// original target reps, suggest the next weight/reps goal.
//
// Rules (simplified per PRD section F):
// - Completed all sets at/above target reps -> increase weight (~2.5-5%)
// - Missed target on some sets -> repeat same weight
// - Missed target twice in a row -> suggest a small deload (~10%)

export function suggestNextTarget(pastSessions, targetReps = 8, increment = 2.5) {
  if (!pastSessions || pastSessions.length === 0) {
    return { weight: null, reps: targetReps, note: 'No history yet — log your first set!' };
  }

  const last = pastSessions[0];
  const secondLast = pastSessions[1];

  const lastTopWeight = Math.max(...last.sets.map((s) => s.weight));
  const lastAllHitTarget = last.sets.every((s) => s.reps >= targetReps);

  const missedLast = !lastAllHitTarget;
  const missedSecondLast =
    secondLast && !secondLast.sets.every((s) => s.reps >= targetReps);

  if (missedLast && missedSecondLast) {
    const deload = roundToIncrement(lastTopWeight * 0.9, increment);
    return { weight: deload, reps: targetReps, note: 'Missed target twice — slight deload recommended.' };
  }

  if (missedLast) {
    return { weight: roundToIncrement(lastTopWeight, increment), reps: targetReps, note: 'Repeat this weight and aim to hit all reps.' };
  }

  const rawIncrease = lastTopWeight < 20 ? increment : Math.max(increment, lastTopWeight * 0.035);
  const nextWeight = roundToIncrement(lastTopWeight + rawIncrease, increment);
  return { weight: nextWeight, reps: targetReps, note: 'All sets hit — increase the weight.' };
}

// Rounds to the nearest multiple of the gym's smallest available plate
// increment (e.g. 1.25kg, 2.5kg, 5kg) so suggested targets are always
// loadable, instead of odd fractional numbers like 0.75kg.
export function roundToIncrement(n, increment = 2.5) {
  if (!increment || increment <= 0) increment = 2.5;
  return Math.round(n / increment) * increment;
}

export function detectPRs(pastSessions, newSets) {
  const prs = [];
  if (!pastSessions || pastSessions.length === 0) {
    if (newSets.length) prs.push({ type: 'weight', label: 'First recorded set!' });
    return prs;
  }
  const bestWeightEver = Math.max(
    ...pastSessions.flatMap((s) => s.sets.map((x) => x.weight))
  );
  const bestVolumeEver = Math.max(
    ...pastSessions.map((s) => s.sets.reduce((a, x) => a + x.weight * x.reps, 0))
  );

  const newTopWeight = Math.max(...newSets.map((s) => s.weight));
  const newVolume = newSets.reduce((a, x) => a + x.weight * x.reps, 0);

  if (newTopWeight > bestWeightEver) {
    prs.push({ type: 'weight', label: `New weight PR: ${newTopWeight}kg` });
  }
  if (newVolume > bestVolumeEver) {
    prs.push({ type: 'volume', label: `New volume PR: ${newVolume}kg total` });
  }
  return prs;
}
