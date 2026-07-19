// Given a list of past sessions for an exercise (most recent first) and the
// original target reps, suggest the next weight/reps goal.
//
// Rules (simplified per PRD section F):
// - Completed all sets at/above target reps -> increase weight (~2.5-5%)
// - Missed target on some sets -> repeat same weight
// - Missed target twice in a row -> suggest a small deload (~10%)

export function suggestNextTarget(pastSessions, targetReps = 8) {
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
    const deload = round(lastTopWeight * 0.9);
    return { weight: deload, reps: targetReps, note: 'Missed target twice — slight deload recommended.' };
  }

  if (missedLast) {
    return { weight: lastTopWeight, reps: targetReps, note: 'Repeat this weight and aim to hit all reps.' };
  }

  const increase = lastTopWeight < 20 ? 1.25 : lastTopWeight * 0.035;
  const nextWeight = round(lastTopWeight + increase);
  return { weight: nextWeight, reps: targetReps, note: 'All sets hit — increase the weight.' };
}

function round(n) {
  return Math.round(n * 4) / 4; // round to nearest 0.25
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
