// Streak + consistency stats derived from the workout log. All computed in
// memory each render; the workout array is small enough (a few hundred rows
// at most) that memoization would be premature.

const DAY_MS = 24 * 60 * 60 * 1000;

// ISO date (YYYY-MM-DD) in the *user's local* timezone, not UTC. Doing this
// in UTC would push late-evening workouts onto the next calendar day for
// anyone east of Greenwich, breaking streaks unfairly.
function dayKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Rewinds a Date by N days without mutating the input.
function shiftDays(date, delta) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

/**
 * Given the workouts array, returns:
 *   {
 *     current:   consecutive days ending today (or yesterday) with a workout
 *     longest:   the all-time longest run of consecutive workout days
 *     totalDays: distinct days with at least one workout
 *     byDay:     { [dayKey]: setCount }   // for the contribution-grid tint
 *   }
 *
 * Two rules that keep streaks feeling fair:
 *   - Rest days do NOT break the streak. Only a day when the user was
 *     "supposed to work out" (i.e., a full calendar day without any log)
 *     between two logged days breaks it. In practice: current streak counts
 *     the days from the most recent workout backward, allowing one grace
 *     day if the most recent workout was yesterday (people log the morning
 *     after sometimes).
 *   - Longest is measured against *unique days*, so two workouts on the
 *     same day count once.
 */
export function computeStreaks(workouts) {
  const byDay = {};
  for (const w of workouts || []) {
    if (!w?.date) continue;
    const k = dayKey(w.date);
    const sets = (w.exercises || []).reduce(
      (s, e) => s + (e.sets?.length || 0),
      0
    );
    byDay[k] = (byDay[k] || 0) + sets;
  }
  const uniqueDays = Object.keys(byDay).sort(); // ascending
  const totalDays = uniqueDays.length;

  // Longest — walk the sorted list once, counting consecutive days.
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const k of uniqueDays) {
    const d = new Date(k);
    if (prev && (d - prev) === DAY_MS) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = d;
  }

  // Current — count backward from today.
  const todayKey = dayKey(new Date());
  const yesterdayKey = dayKey(shiftDays(new Date(), -1));
  let current = 0;
  let cursor = null;
  if (byDay[todayKey]) cursor = new Date();
  else if (byDay[yesterdayKey]) cursor = shiftDays(new Date(), -1);
  while (cursor && byDay[dayKey(cursor)]) {
    current += 1;
    cursor = shiftDays(cursor, -1);
  }

  return { current, longest, totalDays, byDay };
}

/**
 * Materialize the last N weeks as a 2-D array of columns × 7 rows for the
 * contribution grid. Each cell is { key, day, sets, isToday, isFuture }.
 * The rightmost column always ends on today. Week columns are Monday-first.
 */
export function buildStreakGrid(byDay, weeks = 26) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat. We want Monday as row 0.
  const dowToRow = [6, 0, 1, 2, 3, 4, 5]; // Sun→6, Mon→0, Tue→1, ...
  const columns = [];
  // Anchor the LAST column to the week that contains today, then walk back
  // `weeks-1` weeks to find column 0. This guarantees today (and this week's
  // remaining, future-tinted days) always sit in the rightmost column — the
  // earlier version built forward from an old date and cut the current week
  // off the right edge, so recent workouts and today's cell went missing.
  const mondayThisWeek = shiftDays(today, -dowToRow[today.getDay()]);
  const gridStart = shiftDays(mondayThisWeek, -(weeks - 1) * 7);
  for (let c = 0; c < weeks; c += 1) {
    const col = [];
    for (let r = 0; r < 7; r += 1) {
      const d = shiftDays(gridStart, c * 7 + r);
      const key = dayKey(d);
      col.push({
        key,
        date: new Date(d),
        sets: byDay[key] || 0,
        isToday: key === dayKey(today),
        isFuture: d > today,
      });
    }
    columns.push(col);
  }
  return columns;
}
