// Given a list of past sessions for an exercise (most recent first) and the
// original target reps, suggest the next weight/reps goal.
//
// Rules (simplified per PRD section F):
// - Completed all sets at/above target reps -> increase weight (~2.5-5%)
// - Missed target on some sets -> repeat same weight
// - Missed target twice in a row -> suggest a small deload (~10%)

// Working-set filter: warmups and drop sets never count toward volume or PRs.
export function isWorkingSet(set) {
  const type = set?.type || 'N';
  return type === 'N';
}

function workingSets(sets) {
  return (sets || []).filter(isWorkingSet);
}

function sessionAllHit(session, targetReps) {
  const w = workingSets(session.sets);
  return w.length > 0 && w.every((s) => s.reps >= targetReps);
}

export function suggestNextTarget(pastSessions, targetReps = 8, increment = 2.5) {
  if (!pastSessions || pastSessions.length === 0) {
    return { weight: null, reps: targetReps, note: 'No history yet — log your first set!' };
  }

  const last = pastSessions[0];
  const secondLast = pastSessions[1];
  const thirdLast = pastSessions[2];

  const lastWorking = workingSets(last.sets);
  if (lastWorking.length === 0) {
    return { weight: null, reps: targetReps, note: 'Last session had only warmups — log a working set!' };
  }
  const lastTopWeight = Math.max(...lastWorking.map((s) => s.weight));

  const missedLast = !sessionAllHit(last, targetReps);
  const missedSecondLast = secondLast && !sessionAllHit(secondLast, targetReps);
  const missedThirdLast = thirdLast && !sessionAllHit(thirdLast, targetReps);

  if (missedLast && missedSecondLast && missedThirdLast) {
    const deload = roundToIncrement(lastTopWeight * 0.9, increment);
    return {
      weight: deload,
      reps: targetReps,
      note: 'Plateau: 3 sessions in a row missed. Try a 10% deload or drop a rep.',
      alert: 'plateau',
    };
  }

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

// PR detection is per-tracking-type. Weighted lifts get weight+volume PRs;
// bodyweight lifts get reps PRs; timed holds get duration PRs; cardio is
// intentionally not scored (too many axes — pace/dist/duration — to pick a
// meaningful "PR" without user input).
export function detectPRs(pastSessions, newSets, trackingType = 'WEIGHT_REPS') {
  const prs = [];
  const newWorking = workingSets(newSets);
  if (newWorking.length === 0) return prs;

  const pastWorking = (pastSessions || []).map((s) => workingSets(s.sets)).filter((w) => w.length);

  if (trackingType === 'CARDIO') return prs;

  if (trackingType === 'BODYWEIGHT_REPS') {
    const bestRepsEver = pastWorking.length
      ? Math.max(...pastWorking.flatMap((w) => w.map((x) => x.reps || 0)))
      : 0;
    const newTopReps = Math.max(...newWorking.map((s) => s.reps || 0));
    if (newTopReps > bestRepsEver) {
      prs.push({ type: 'reps', label: `New reps PR: ${newTopReps} reps` });
    }
    return prs;
  }

  if (trackingType === 'TIMED_HOLD') {
    const bestDurEver = pastWorking.length
      ? Math.max(...pastWorking.flatMap((w) => w.map((x) => x.durationSec || 0)))
      : 0;
    const newTopDur = Math.max(...newWorking.map((s) => s.durationSec || 0));
    if (newTopDur > bestDurEver) {
      const mm = Math.floor(newTopDur / 60);
      const ss = String(newTopDur % 60).padStart(2, '0');
      prs.push({ type: 'duration', label: `New hold PR: ${mm}:${ss}` });
    }
    return prs;
  }

  // WEIGHT_REPS
  if (pastWorking.length === 0) {
    prs.push({ type: 'weight', label: 'First working set!' });
    return prs;
  }

  const bestWeightEver = Math.max(...pastWorking.flatMap((w) => w.map((x) => x.weight || 0)));
  const bestVolumeEver = Math.max(
    ...pastWorking.map((w) => w.reduce((a, x) => a + (x.weight || 0) * (x.reps || 0), 0))
  );

  const newTopWeight = Math.max(...newWorking.map((s) => s.weight || 0));
  const newVolume = newWorking.reduce((a, x) => a + (x.weight || 0) * (x.reps || 0), 0);

  if (newTopWeight > bestWeightEver) {
    prs.push({ type: 'weight', label: `New weight PR: ${newTopWeight}kg` });
  }
  if (newVolume > bestVolumeEver) {
    prs.push({ type: 'volume', label: `New volume PR: ${Math.round(newVolume)}kg total` });
  }
  return prs;
}
