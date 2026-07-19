# Progressive — Gym Tracker (MVP)

A React Native (Expo) implementation of the core loop described in the PRD:
Dashboard → Workout Logger → Exercise Library → Analytics, all built around
**progressive overload**.

## What's implemented

- **Dashboard**: today's targets pulled from a default "Push Day" template,
  auto-suggested weight/reps based on your last session.
- **Workout Logger**: large-button, few-tap set logging (weight/reps steppers
  + "Done" button), shows last session + suggested target before every
  exercise, detects PRs on finish.
- **Exercise Library**: search by name, muscle, equipment, or alias (e.g.
  "rope" finds Tricep Pushdown, Face Pull, Cable Crunch), filter chips by
  muscle group.
- **Exercise History**: per-exercise stats (best ever, total sessions, last
  trained) and full session log.
- **Analytics**: Progress Score (% of exercises improved), total weight
  lifted, total sets, workout count, and a volume-over-time chart.
- **Local persistence** via AsyncStorage — no backend required. Seeds two
  demo workouts on first launch so the app isn't empty.
- **Automatic progressive overload logic** (`utils/progressiveOverload.js`):
  increases weight when all sets hit target reps, holds weight if missed
  once, suggests a ~10% deload if missed twice in a row.

## Not yet implemented (see PRD sections 10–18)

Rest timer, muscle recovery heatmap, workout templates beyond the single
default, gamification/achievements, social feed, AI plateau-detection
insights, wearable integration. The code is structured (storage layer,
progressive-overload logic, exercise data) so these can be added without
restructuring.

## Setup

Requires Node.js 18+ and the Expo Go app on your phone (or an
iOS/Android simulator).

```bash
cd progressive-app
npm install
npx expo start
```

Then scan the QR code with Expo Go (Android) or the Camera app (iOS), or
press `i` / `a` in the terminal to launch a simulator.

## Project structure

```
progressive-app/
  App.js                     # navigation (bottom tabs + stack)
  app.json                   # Expo config
  screens/
    DashboardScreen.js
    WorkoutLoggerScreen.js
    ExerciseLibraryScreen.js
    ExerciseHistoryScreen.js
    AnalyticsScreen.js
  components/
    UI.js                    # Card, PrimaryButton, IconStepper, Pill
  data/
    exercises.js             # exercise library + alias search
  utils/
    storage.js                # AsyncStorage read/write, demo data seed
    progressiveOverload.js    # weight/rep suggestion + PR detection
    theme.js                  # colors, spacing, radius
```

## Data model

A workout session is stored as:

```js
{
  id: 'uuid',
  date: 'ISO timestamp',
  name: 'Push Day',
  exercises: [
    { exerciseId: 'bench-press', sets: [{ weight: 70, reps: 8 }, ...] }
  ]
}
```

Swap `utils/storage.js` for a real backend (Supabase/Firebase/your API) later
by keeping the same function signatures (`getWorkouts`, `saveWorkout`,
`getWorkoutsForExercise`) — no screen code needs to change.

## Deploying to Android

Icon, splash screen, and adaptive icon placeholders are already set up in
`assets/` and wired into `app.json` (accent-green dumbbell mark on dark
background — swap these files for real branding whenever you're ready).
`eas.json` has three build profiles configured.

1. Install the CLI and log in (free Expo account):
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Link the project to your account (first time only):
   ```bash
   eas build:configure
   ```
3. **Quick APK for testing / sharing directly:**
   ```bash
   eas build --platform android --profile preview
   ```
   Gives you a download link for a `.apk` — install directly on any Android
   phone (enable "install unknown apps"), no Play Store needed.
4. **Play Store release build (AAB):**
   ```bash
   eas build --platform android --profile production
   eas submit --platform android
   ```
   Requires a Google Play Console account ($25 one-time) and, for automated
   `eas submit`, a service account JSON key from the Play Console.

Before your first Play Store submission, double check in the Play Console:
`com.progressive.app` is available as a package name, and you have a
privacy policy URL, screenshots, and a content rating questionnaire ready.

## Next steps to extend

1. **Workout Templates screen** — let users create/save their own splits
   instead of the single hardcoded "Push Day" template in
   `DashboardScreen.js`.
2. **Rest timer** — a simple countdown component triggered after `logSet()`
   in `WorkoutLoggerScreen.js`.
3. **Cloud sync** — replace AsyncStorage calls with API calls once you have
   a backend; the storage.js interface is designed for a drop-in swap.
