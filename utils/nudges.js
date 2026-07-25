import { computeStreaks } from './streaks';
import { computeMilestones, nextMilestoneSummary } from './milestones';
import { getExerciseById } from '../data/exercises';

// Pure notification rule-engine. Given the raw workout data it returns a
// prioritized, capped list of nudges — no native modules, no side effects.
// Keeping this separate from the scheduling layer means the exact same rules
// can later run inside a Supabase Edge Function for true server push, without
// a rewrite: feed it a user's workouts and read back the nudges to dispatch.

const MAJOR_MUSCLES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms'];
const NEGLECT_DAYS = 7; // muscle untrained this long → nudge
const STREAK_MIN = 3; // only defend streaks worth defending
const MILESTONE_NEAR = 0.85; // ≥85% of the way → "so close"
const MAX_PER_REFRESH = 2; // frequency cap: at most 2 scheduled at a time

function localDayKey(d) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
}

function atTime(base, hour, minute) {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Compute up to MAX_PER_REFRESH nudges from local data.
 * Each nudge: { id, category, priority, title, body, fireAt: Date }.
 * `now` is injectable so this stays deterministic and unit-testable.
 */
export function computeNudges({ workouts, bodyweight = 70, now = new Date() }) {
  const out = [];
  const list = workouts || [];
  const streaks = computeStreaks(list);
  const trainedToday = !!streaks.byDay[
    // computeStreaks keys byDay with YYYY-MM-DD; rebuild the same shape here.
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  ];

  // ── Rule A: streak at risk ───────────────────────────────────────────
  if (streaks.current >= STREAK_MIN && !trainedToday) {
    let fireAt = atTime(now, 19, 0); // nudge this evening
    if (fireAt <= now) fireAt = new Date(now.getTime() + 60 * 60 * 1000);
    out.push({
      id: 'streak-risk',
      category: 'streak',
      priority: 3,
      title: 'Keep your streak alive 🔥',
      body: `You're on a ${streaks.current}-day streak. A quick session today keeps it going.`,
      fireAt,
    });
  }

  // ── Rule B: most-neglected major muscle ──────────────────────────────
  const lastByMuscle = {};
  for (const w of list) {
    const t = new Date(w.date).getTime();
    for (const ex of w.exercises || []) {
      const muscle = getExerciseById(ex.exerciseId)?.muscle;
      if (!MAJOR_MUSCLES.includes(muscle)) continue;
      if (!lastByMuscle[muscle] || t > lastByMuscle[muscle]) lastByMuscle[muscle] = t;
    }
  }
  let worst = null;
  for (const muscle of MAJOR_MUSCLES) {
    const last = lastByMuscle[muscle];
    if (!last) continue; // never trained → don't nag about it yet
    const days = Math.floor((now.getTime() - last) / 86400000);
    if (days >= NEGLECT_DAYS && (!worst || days > worst.days)) worst = { muscle, days };
  }
  if (worst) {
    out.push({
      id: 'muscle-neglect',
      category: 'muscle',
      priority: 2,
      title: `${worst.muscle} is falling behind`,
      body: `Your ${worst.muscle.toLowerCase()} hasn't been trained in ${worst.days} days.`,
      fireAt: atTime(addDays(now, 1), 9, 0), // tomorrow morning
    });
  }

  // ── Rule C: within reach of a strength milestone ─────────────────────
  const { nextUp } = computeMilestones(list, bodyweight);
  if (nextUp && nextUp.pct >= MILESTONE_NEAR && nextUp.pct < 1) {
    out.push({
      id: 'near-milestone',
      category: 'milestone',
      priority: 2,
      title: 'So close 💪',
      body: nextMilestoneSummary(nextUp),
      fireAt: atTime(addDays(now, 1), 18, 0),
    });
  }

  // Highest priority first, capped. Spread across times so two never collide
  // on the same minute.
  return out.sort((a, b) => b.priority - a.priority).slice(0, MAX_PER_REFRESH);
}
