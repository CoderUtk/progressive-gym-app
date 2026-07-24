import { volumeForSet } from './setSchema';
import { getExerciseById } from '../data/exercises';

// Volume-and-effort personal records — distinct from weight-based PRs.
// Weight PRs live in progressiveOverload.js and answer "did you lift more
// than ever before?". These records answer "was this workout the biggest /
// longest / densest one you've ever had?" — a different kind of trophy.

const MUSCLES_FOR_RECORDS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

function workoutVolume(w, bodyweight = 70) {
  return (w.exercises || []).reduce((sum, ex) => {
    const exercise = getExerciseById(ex.exerciseId);
    return sum + (ex.sets || []).reduce(
      (s, x) => s + volumeForSet(exercise, x, bodyweight),
      0
    );
  }, 0);
}

function workoutSetCount(w) {
  return (w.exercises || []).reduce(
    (s, e) => s + (e.sets?.length || 0),
    0
  );
}

function workoutRepCount(w) {
  return (w.exercises || []).reduce(
    (s, e) => s + (e.sets || []).reduce(
      (r, x) => r + (Number(x.reps) || 0),
      0
    ),
    0
  );
}

function workoutDurationSec(w) {
  return Number(w.durationSec) || 0;
}

// Volume attributable to a specific muscle group, counting a set only when
// the exercise's primary muscle matches. Secondary muscles are intentionally
// excluded — otherwise "chest volume" would balloon from every triceps or
// shoulder work set.
function workoutVolumeForMuscle(w, muscle, bodyweight = 70) {
  return (w.exercises || []).reduce((sum, ex) => {
    const exercise = getExerciseById(ex.exerciseId);
    if (exercise?.muscle !== muscle) return sum;
    return sum + (ex.sets || []).reduce(
      (s, x) => s + volumeForSet(exercise, x, bodyweight),
      0
    );
  }, 0);
}

// Group by ISO week (Monday-based). Returns { [weekKey]: [workouts...] }.
function groupByWeek(workouts) {
  const groups = {};
  for (const w of workouts) {
    const d = new Date(w.date);
    // Rewind to Monday of that week.
    const day = d.getDay() || 7; // Sunday = 7
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().slice(0, 10);
    (groups[key] = groups[key] || []).push(w);
  }
  return groups;
}

function groupByMonth(workouts) {
  const groups = {};
  for (const w of workouts) {
    const d = new Date(w.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    (groups[key] = groups[key] || []).push(w);
  }
  return groups;
}

/**
 * Return every records category as { label, value, unit, date, sourceWorkout }.
 * Value is a number (or null if no data); label is short and human-readable;
 * date is the ISO date the record was set (for "on 12 Jul 2026"-style
 * display); unit is a short suffix.
 *
 * Bodyweight defaults to 70 kg so bodyweight-rep sets still contribute a
 * plausible volume when the user hasn't filled in their profile weight yet.
 */
export function computeRecords(workouts, bodyweight = 70) {
  const sorted = [...(workouts || [])].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  if (sorted.length === 0) {
    return { rows: [], sections: [] };
  }

  const rows = [];

  // ─── Whole-workout records ────────────────────────────────────────────
  const bestVolume = sorted.reduce(
    (best, w) => {
      const v = workoutVolume(w, bodyweight);
      return v > best.value ? { value: v, workout: w } : best;
    },
    { value: 0, workout: null }
  );
  rows.push({
    id: 'workout-volume',
    section: 'Workout',
    label: 'Heaviest single workout',
    value: bestVolume.value,
    unit: 'kg',
    date: bestVolume.workout?.date || null,
    format: 'volume',
    sourceWorkout: bestVolume.workout,
  });

  const bestSets = sorted.reduce(
    (best, w) => {
      const s = workoutSetCount(w);
      return s > best.value ? { value: s, workout: w } : best;
    },
    { value: 0, workout: null }
  );
  rows.push({
    id: 'workout-sets',
    section: 'Workout',
    label: 'Most sets in a workout',
    value: bestSets.value,
    unit: 'sets',
    date: bestSets.workout?.date || null,
    format: 'int',
    sourceWorkout: bestSets.workout,
  });

  const bestReps = sorted.reduce(
    (best, w) => {
      const r = workoutRepCount(w);
      return r > best.value ? { value: r, workout: w } : best;
    },
    { value: 0, workout: null }
  );
  rows.push({
    id: 'workout-reps',
    section: 'Workout',
    label: 'Most reps in a workout',
    value: bestReps.value,
    unit: 'reps',
    date: bestReps.workout?.date || null,
    format: 'int',
    sourceWorkout: bestReps.workout,
  });

  // Duration records — only count workouts with a recorded durationSec.
  const timed = sorted.filter((w) => workoutDurationSec(w) > 0);
  if (timed.length > 0) {
    const longest = timed.reduce(
      (best, w) => (workoutDurationSec(w) > best.value
        ? { value: workoutDurationSec(w), workout: w } : best),
      { value: 0, workout: null }
    );
    rows.push({
      id: 'workout-longest',
      section: 'Workout',
      label: 'Longest workout',
      value: longest.value,
      unit: 'min',
      date: longest.workout?.date || null,
      format: 'duration',
      sourceWorkout: longest.workout,
    });
    // "Fastest" only meaningful once you've done a decent chunk of volume,
    // otherwise a 5-minute session with two sets wins by default.
    const fastest = timed
      .filter((w) => workoutVolume(w, bodyweight) >= 1500)
      .reduce(
        (best, w) => {
          const dur = workoutDurationSec(w);
          return dur < best.value ? { value: dur, workout: w } : best;
        },
        { value: Infinity, workout: null }
      );
    if (fastest.workout) {
      rows.push({
        id: 'workout-fastest',
        section: 'Workout',
        label: 'Fastest workout (≥1500kg volume)',
        value: fastest.value,
        unit: 'min',
        date: fastest.workout.date,
        format: 'duration',
        sourceWorkout: fastest.workout,
      });
    }
  }

  // ─── Weekly + monthly volume ──────────────────────────────────────────
  const byWeek = groupByWeek(sorted);
  const weekly = Object.entries(byWeek).map(([key, ws]) => ({
    key,
    value: ws.reduce((s, w) => s + workoutVolume(w, bodyweight), 0),
  }));
  const bestWeek = weekly.reduce(
    (best, w) => (w.value > best.value ? w : best),
    { value: 0, key: null }
  );
  rows.push({
    id: 'week-volume',
    section: 'Period',
    label: 'Highest weekly volume',
    value: bestWeek.value,
    unit: 'kg',
    date: bestWeek.key,
    format: 'volume',
    sourceWorkout: null,
  });

  const byMonth = groupByMonth(sorted);
  const monthly = Object.entries(byMonth).map(([key, ws]) => ({
    key,
    value: ws.reduce((s, w) => s + workoutVolume(w, bodyweight), 0),
  }));
  const bestMonth = monthly.reduce(
    (best, m) => (m.value > best.value ? m : best),
    { value: 0, key: null }
  );
  rows.push({
    id: 'month-volume',
    section: 'Period',
    label: 'Highest monthly volume',
    value: bestMonth.value,
    unit: 'kg',
    date: bestMonth.key ? `${bestMonth.key}-01` : null,
    format: 'volume',
    sourceWorkout: null,
  });

  // ─── Per-muscle records ───────────────────────────────────────────────
  for (const muscle of MUSCLES_FOR_RECORDS) {
    const best = sorted.reduce(
      (b, w) => {
        const v = workoutVolumeForMuscle(w, muscle, bodyweight);
        return v > b.value ? { value: v, workout: w } : b;
      },
      { value: 0, workout: null }
    );
    if (best.value > 0) {
      rows.push({
        id: `muscle-${muscle.toLowerCase()}`,
        section: 'By Muscle',
        label: `Highest ${muscle.toLowerCase()} volume in one workout`,
        value: best.value,
        unit: 'kg',
        date: best.workout?.date || null,
        format: 'volume',
        sourceWorkout: best.workout,
      });
    }
  }

  // Order sections for the screen.
  const sections = ['Workout', 'Period', 'By Muscle']
    .map((s) => ({ title: s, rows: rows.filter((r) => r.section === s) }))
    .filter((s) => s.rows.length > 0);

  return { rows, sections };
}
