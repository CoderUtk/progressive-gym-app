import { getExerciseById } from '../data/exercises';
import { estimate1RM } from './strength';

// Strength milestones — human-legible strength targets, distinct from the
// existing badges (which track workout counts, PRs, cardio totals, etc.).
// Milestones use the user's best-ever heaviest set on the specified lift.
// Two flavors:
//   ABS  — absolute weight, e.g. "100kg bench club"
//   BW   — bodyweight-relative, e.g. "2× bodyweight deadlift"
//   REPS — bodyweight rep milestones (pull-ups, push-ups, dips)

const ABS = 'ABS';
const BW = 'BW';
const REPS = 'REPS';

export const MILESTONES = [
  // ─── Bench ─────────────────────────────────────────────────────────────
  { id: 'bench-40',     lift: 'bench-press',  type: ABS,  target: 40,  emoji: '🏋️', label: '40kg Bench' },
  { id: 'bench-60',     lift: 'bench-press',  type: ABS,  target: 60,  emoji: '🏋️', label: '60kg Bench' },
  { id: 'bench-80',     lift: 'bench-press',  type: ABS,  target: 80,  emoji: '🏋️', label: '80kg Bench' },
  { id: 'bench-100',    lift: 'bench-press',  type: ABS,  target: 100, emoji: '💪', label: '100kg Bench Club' },
  { id: 'bench-bw',     lift: 'bench-press',  type: BW,   target: 1.0, emoji: '⭐', label: '1× BW Bench' },
  { id: 'bench-1.5bw',  lift: 'bench-press',  type: BW,   target: 1.5, emoji: '🌟', label: '1.5× BW Bench' },

  // ─── Squat ─────────────────────────────────────────────────────────────
  { id: 'squat-60',     lift: 'squat',        type: ABS,  target: 60,  emoji: '🦵', label: '60kg Squat' },
  { id: 'squat-100',    lift: 'squat',        type: ABS,  target: 100, emoji: '🦵', label: '100kg Squat' },
  { id: 'squat-140',    lift: 'squat',        type: ABS,  target: 140, emoji: '🦵', label: '140kg Squat' },
  { id: 'squat-180',    lift: 'squat',        type: ABS,  target: 180, emoji: '🔱', label: '180kg Squat' },
  { id: 'squat-1.5bw',  lift: 'squat',        type: BW,   target: 1.5, emoji: '⭐', label: '1.5× BW Squat' },
  { id: 'squat-2bw',    lift: 'squat',        type: BW,   target: 2.0, emoji: '🌟', label: '2× BW Squat' },

  // ─── Deadlift ──────────────────────────────────────────────────────────
  { id: 'dl-60',        lift: 'deadlift',     type: ABS,  target: 60,  emoji: '🏋️', label: '60kg Deadlift' },
  { id: 'dl-100',       lift: 'deadlift',     type: ABS,  target: 100, emoji: '🏋️', label: '100kg Deadlift' },
  { id: 'dl-140',       lift: 'deadlift',     type: ABS,  target: 140, emoji: '🏋️', label: '140kg Deadlift' },
  { id: 'dl-180',       lift: 'deadlift',     type: ABS,  target: 180, emoji: '🔱', label: '180kg Deadlift' },
  { id: 'dl-220',       lift: 'deadlift',     type: ABS,  target: 220, emoji: '🪐', label: '220kg Deadlift' },
  { id: 'dl-1.5bw',     lift: 'deadlift',     type: BW,   target: 1.5, emoji: '⭐', label: '1.5× BW Deadlift' },
  { id: 'dl-2bw',       lift: 'deadlift',     type: BW,   target: 2.0, emoji: '🌟', label: '2× BW Deadlift' },
  { id: 'dl-2.5bw',     lift: 'deadlift',     type: BW,   target: 2.5, emoji: '🏆', label: '2.5× BW Deadlift' },

  // ─── OHP ───────────────────────────────────────────────────────────────
  { id: 'ohp-40',       lift: 'bb-shoulder-press', type: ABS, target: 40, emoji: '💪', label: '40kg Overhead Press' },
  { id: 'ohp-60',       lift: 'bb-shoulder-press', type: ABS, target: 60, emoji: '💪', label: '60kg Overhead Press' },
  { id: 'ohp-bw',       lift: 'bb-shoulder-press', type: BW,  target: 1.0, emoji: '⭐', label: '1× BW Overhead Press' },

  // ─── Bodyweight rep milestones ─────────────────────────────────────────
  { id: 'first-pullup', lift: 'pull-up',      type: REPS, target: 1,   emoji: '🧗', label: 'First Pull-Up' },
  { id: 'pullup-5',     lift: 'pull-up',      type: REPS, target: 5,   emoji: '🧗', label: '5 Pull-Ups Unbroken' },
  { id: 'pullup-10',    lift: 'pull-up',      type: REPS, target: 10,  emoji: '💪', label: '10 Pull-Ups Unbroken' },
  { id: 'pullup-20',    lift: 'pull-up',      type: REPS, target: 20,  emoji: '🌟', label: '20 Pull-Ups Unbroken' },
  { id: 'pushup-20',    lift: 'push-up',      type: REPS, target: 20,  emoji: '💪', label: '20 Push-Ups Unbroken' },
  { id: 'pushup-50',    lift: 'push-up',      type: REPS, target: 50,  emoji: '🔥', label: '50 Push-Ups Unbroken' },
  { id: 'dips-10',      lift: 'dips',         type: REPS, target: 10,  emoji: '💪', label: '10 Dips Unbroken' },
];

// Best absolute weight ever moved on a lift (any set with weight > 0).
function bestWeight(workouts, exerciseId) {
  let best = 0;
  for (const w of workouts || []) {
    for (const ex of w.exercises || []) {
      if (ex.exerciseId !== exerciseId) continue;
      for (const s of ex.sets || []) {
        const wt = Number(s.weight) || 0;
        if (wt > best) best = wt;
      }
    }
  }
  return best;
}

// Best rep count in a single set for a bodyweight-tracked lift (no added
// weight — unbroken means one set, not cumulative).
function bestReps(workouts, exerciseId) {
  let best = 0;
  for (const w of workouts || []) {
    for (const ex of w.exercises || []) {
      if (ex.exerciseId !== exerciseId) continue;
      for (const s of ex.sets || []) {
        const added = Number(s.addedWeight) || 0;
        // Only count clean bodyweight sets (no assist bands, no added weight)
        // — otherwise "20 pull-ups" could count a 20-rep assisted set.
        if (added <= 0) {
          const r = Number(s.reps) || 0;
          if (r > best) best = r;
        }
      }
    }
  }
  return best;
}

function progressForMilestone(milestone, workouts, bodyweight) {
  if (milestone.type === REPS) {
    const best = bestReps(workouts, milestone.lift);
    return {
      current: best,
      target: milestone.target,
      pct: Math.min(1, best / milestone.target),
      earned: best >= milestone.target,
      display: `${best}/${milestone.target} reps`,
    };
  }
  const best = bestWeight(workouts, milestone.lift);
  if (milestone.type === BW) {
    const bw = bodyweight || 70;
    const targetKg = bw * milestone.target;
    return {
      current: best,
      target: targetKg,
      pct: targetKg > 0 ? Math.min(1, best / targetKg) : 0,
      earned: best >= targetKg,
      display: `${best.toFixed(1)}kg / ${targetKg.toFixed(1)}kg`,
    };
  }
  // ABS
  return {
    current: best,
    target: milestone.target,
    pct: Math.min(1, best / milestone.target),
    earned: best >= milestone.target,
    display: `${best.toFixed(1)}kg / ${milestone.target}kg`,
  };
}

/**
 * Full breakdown of strength milestones — every milestone tagged as earned
 * or not, with progress toward the next unearned one on each lift.
 */
export function computeMilestones(workouts, bodyweight = 70) {
  const all = MILESTONES.map((m) => ({
    ...m,
    ...progressForMilestone(m, workouts, bodyweight),
  }));

  const earned = all.filter((m) => m.earned);
  const unearned = all.filter((m) => !m.earned);

  // Next up = the unearned milestone with the highest current progress.
  // Ties broken by lower target (closer to done wins).
  const nextUp = unearned
    .slice()
    .sort((a, b) => (b.pct - a.pct) || (a.target - b.target))[0] || null;

  return { all, earned, unearned, nextUp };
}

/**
 * Convenience label describing the next milestone in one line, for the
 * card on the Profile screen.
 */
export function nextMilestoneSummary(m) {
  if (!m) return 'Every milestone unlocked.';
  const exercise = getExerciseById(m.lift);
  const liftName = exercise?.name || m.lift;
  const pct = Math.round(m.pct * 100);
  return `${pct}% of the way to ${m.label} on ${liftName}.`;
}
