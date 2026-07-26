# Progressive — Post-v1.0 Roadmap

> **Status: COMPLETE.** Every item below (v1.1–v1.4) shipped. For what's next,
> see [`roadmap-post-v2.md`](./roadmap-post-v2.md).

Features queued for after Play Store submission. Ordered by (a) unlock value
for early retention and (b) technical dependency chain.

Each release should ship one clear theme so store update notes have a
compelling hook.

---

## v1.1 — "Every rep counts" (client-only, no infra)

Three quick wins that boost retention in the crucial first-week window.

### #15 — Streak Calendar
GitHub-style contribution grid on Analytics (or its own tab).
- Color intensity per day = number of working sets logged that day.
- Header shows: **current streak**, **longest streak**, **total workout days**.
- Tap a filled square → jump to that day's `DayWorkoutScreen`.
- Data source: existing `workouts` array; compute in memory. No new storage.

### #6 — Volume Personal Records
New **Records** screen (link from Profile) tracking non-1RM PRs:
- Highest single-workout volume (kg × reps summed)
- Highest weekly volume
- Highest monthly volume
- Longest workout (duration)
- Fastest workout (duration for equivalent volume)
- Most sets in a single workout
- Most reps in a single workout
- Highest single-workout volume per major muscle (chest / back / legs)

Each row shows the value + the date + the workout it came from.

### #7 — Strength Milestones
Extend the existing badge system with **weight-club** milestones:
- 40 / 60 / 80 / 100 kg bench, 60 / 100 / 140 / 180 kg squat, 60 / 100 / 140 / 200 kg deadlift
- Bodyweight-relative: **1× / 1.5× / 2× BW deadlift**, **1× BW bench**, **1.5× BW squat**
- Rep milestones: **First pull-up**, **10 unbroken pull-ups**, **20 push-ups**

Display: earned + upcoming + % progress toward next.

---

## v1.2 — "Look how far you've come" (client-only, medium refactor)

### #1 — Time Machine ⭐
Per-exercise comparison screen. Entry point: a clock-rewind icon in the
`ExerciseHistoryScreen` header.

- Comparison anchors: Last Session · 1 mo ago · 3 mo ago · 6 mo ago · 1 yr ago · Custom date
- Side-by-side rows for each metric: **weight**, **reps**, **est. 1RM (Epley)**, **volume**
- % improvement per metric
- Summary line: *"Bench Press improved from 40kg × 8 to 75kg × 8 — +87.5% strength."*
- Uses existing per-exercise history; no new storage.

### #8 — Plateau Detection
In-app banners (no push required):

- **Trigger**: 3+ consecutive sessions where all working sets failed to hit their target reps OR total volume declined for 3+ weeks.
- **UI**: soft banner on the exercise's history screen and on the Workout Logger for that exercise.
- **Recommendation**: reduce working weight 5–10% and rebuild.
- Explains **why** the recommendation was made (which sessions triggered it).

Algorithm lives in `utils/plateau.js`; no server component.

---

## v1.3 — "Head down, get to work" (UX refactor)

### #3 — Gym Mode
Big rewrite of `WorkoutLoggerScreen` for the "phone on the bench" use case.

- Full-screen, no bottom tabs, no status-bar chrome (immersive mode via `expo-navigation-bar`).
- Layout: current exercise name (huge), last session (medium), suggested target (mint), weight stepper, reps stepper, **big log-set button** (bottom third of screen, one-handed reach).
- Between-set state shows a **large rest timer** dominating the screen.
- Swipe left/right to change exercise (no scrolling to a menu).
- Optional wake-lock so the screen doesn't sleep between sets.
- Small collapsed pill returns to normal mode.

Should let a user log a set in ≤ 3 seconds without looking twice.

---

## v1.4 — "Your coach in your pocket" (needs push infrastructure)

Bundling both push-dependent features into one release since they share the same backend groundwork.

### Infra prerequisites
- **Expo Push tokens** — register via `expo-notifications` on app start (once authorization is granted).
- **Supabase table** `push_tokens (user_id, token, platform, updated_at)`.
- **Supabase Edge Function** `daily-notifications` scheduled by `pg_cron` — runs every 6 h, queries every user's recent workouts + last-notified timestamps, decides who to nudge, dispatches via Expo Push.
- Play Console **notification categories** declaration for new-listing compliance.

### #2 — Smart Notifications
Rule-based nudges (LLM would be overkill and cost per-user):
- Muscle group untouched N days → *"Chest hasn't been trained in 8 days."*
- Streak at risk → *"One workout tonight keeps your 12-day streak alive."*
- Volume dropped week-over-week → *"Back volume is down 30% this week."*
- Close to a strength-milestone → *"You're 2.5 kg from the 100 kg bench club."*
- Deload recommended (from plateau engine) → *"Consider a deload — 4 stalled bench sessions."*

Frequency cap: **max 2 nudges/day, 5/week** to stay motivating not annoying.
User can mute categories individually in Settings.

### #4 — Weekly AI Progress Review
Every Monday 08:00 local time, generate + push a summary of the last 7 days.

Report includes:
- **Overall Progress Score** (0–100, weighted: improved lifts +, plateaued +/-, declined -, missed workouts -)
- Top 3 improved exercises (+% e1RM)
- Any plateaued exercises
- Volume by muscle group (+/- vs previous week)
- New PRs hit
- Least-trained muscle group with a suggestion
- **Single actionable recommendation** for the next week

Rendered as a native modal + a persistent "This week's review" card on Analytics until dismissed. Tap → full-screen breakdown that can be shared as an image (reuse the ShareCard rig).

Content is rule-based; no LLM API key needed. "AI" in the marketing sense = "smart algorithm", which is honest.

---

## Not on this roadmap

Features I'd defer even further, or drop:

- **Video demos for every exercise** — great UX, but hosting video pushes app size + Supabase egress. Consider linking to YouTube externally.
- **Social features / following friends** — turns product into a social network overnight; scope explosion.
- **Real AI coach via LLM API** — cost per user + moderation liability. Rules cover most needs.
- **HealthKit / Google Fit integration** — nice-to-have, low value for a lifting-first app.
