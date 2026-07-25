import AsyncStorage from '@react-native-async-storage/async-storage';

// Debounced cloud backup. Called after every local mutation; the safe wrapper
// no-ops when the user isn't signed in, so we don't gate on auth here. Lazy-
// require breaks the storage↔cloudSync import cycle without adding another
// module.
let autoBackupTimer = null;
const AUTO_BACKUP_DELAY_MS = 8000;
function scheduleAutoBackup() {
  if (autoBackupTimer) clearTimeout(autoBackupTimer);
  autoBackupTimer = setTimeout(() => {
    autoBackupTimer = null;
    try {
      const { backupToCloudSafe } = require('./cloudSync');
      backupToCloudSafe();
    } catch (e) {
      // never let a sync failure surface into a write path
    }
  }, AUTO_BACKUP_DELAY_MS);
}

const KEYS = {
  WORKOUTS: 'progressive:workouts', // array of completed workout sessions
  TEMPLATES: 'progressive:templates',
  ACTIVE_TEMPLATE: 'progressive:activeTemplateId',
  PROFILE: 'progressive:profile',
  HAS_SEEN_ONBOARDING: 'progressive:hasSeenOnboarding',
  HAS_SEEN_TOUR: 'progressive:hasSeenTour',
  WEIGHT_UNIT: 'progressive:weightUnit',
  PLATE_INCREMENT: 'progressive:plateIncrement',
  EXERCISE_NOTES: 'progressive:exerciseNotes',
};

// Per-exercise machine-setup memo (e.g. "Seat height 3", "Green band"). Keyed
// by exerciseId so it re-populates automatically next session.
export async function getExerciseNotes() {
  const raw = await AsyncStorage.getItem(KEYS.EXERCISE_NOTES);
  return raw ? JSON.parse(raw) : {};
}

export async function setExerciseNote(exerciseId, note) {
  const notes = await getExerciseNotes();
  const trimmed = (note || '').trim();
  if (trimmed) notes[exerciseId] = trimmed;
  else delete notes[exerciseId];
  await AsyncStorage.setItem(KEYS.EXERCISE_NOTES, JSON.stringify(notes));
  scheduleAutoBackup();
  return notes;
}

// App-wide display unit — 'kg' or 'lb'. Everything is stored internally in
// kg regardless of this setting; screens convert for display only.
export async function getWeightUnit() {
  const raw = await AsyncStorage.getItem(KEYS.WEIGHT_UNIT);
  return raw === 'lb' ? 'lb' : 'kg';
}

export async function setWeightUnit(unit) {
  await AsyncStorage.setItem(KEYS.WEIGHT_UNIT, unit === 'lb' ? 'lb' : 'kg');
  scheduleAutoBackup();
}

// Smallest available plate increment at the user's gym (kg). Used for
// barbell/machine/cable steps and target rounding; dumbbells use a fixed
// pair-jump regardless of this setting (see utils/increments.js).
export async function getPlateIncrement() {
  const raw = await AsyncStorage.getItem(KEYS.PLATE_INCREMENT);
  const val = raw ? Number(raw) : 2.5;
  return Number.isFinite(val) && val > 0 ? val : 2.5;
}

export async function setPlateIncrement(value) {
  await AsyncStorage.setItem(KEYS.PLATE_INCREMENT, String(value));
  scheduleAutoBackup();
}

// Built-in starter templates. Users can edit these (which forks them into
// storage) or create brand new custom ones.
export const DEFAULT_TEMPLATES = [
  { id: 'push-day', name: 'Push Day', exerciseIds: ['bench-press', 'incline-db-press', 'shoulder-press'] },
  { id: 'pull-day', name: 'Pull Day', exerciseIds: ['deadlift', 'lat-pulldown', 'pull-up', 'bicep-curl'] },
  { id: 'leg-day', name: 'Leg Day', exerciseIds: ['squat', 'leg-press'] },
  { id: 'upper', name: 'Upper Body', exerciseIds: ['bench-press', 'lat-pulldown', 'shoulder-press', 'bicep-curl'] },
  { id: 'lower', name: 'Lower Body', exerciseIds: ['squat', 'deadlift', 'leg-press'] },
];

export async function getTemplates() {
  const raw = await AsyncStorage.getItem(KEYS.TEMPLATES);
  const saved = raw ? JSON.parse(raw) : {};
  // Merge: saved templates override built-ins with the same id, plus any
  // brand-new custom templates the user created.
  const merged = DEFAULT_TEMPLATES.map((t) => saved[t.id] || t);
  const customOnly = Object.values(saved).filter(
    (t) => !DEFAULT_TEMPLATES.some((d) => d.id === t.id)
  );
  return [...merged, ...customOnly];
}

export async function saveTemplate(template) {
  const raw = await AsyncStorage.getItem(KEYS.TEMPLATES);
  const saved = raw ? JSON.parse(raw) : {};
  saved[template.id] = template;
  await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(saved));
  scheduleAutoBackup();
  return getTemplates();
}

export async function deleteTemplate(templateId) {
  const raw = await AsyncStorage.getItem(KEYS.TEMPLATES);
  const saved = raw ? JSON.parse(raw) : {};
  delete saved[templateId];
  await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(saved));
  scheduleAutoBackup();
  return getTemplates();
}

export async function getActiveTemplateId() {
  const id = await AsyncStorage.getItem(KEYS.ACTIVE_TEMPLATE);
  return id || 'push-day';
}

export async function setActiveTemplateId(id) {
  await AsyncStorage.setItem(KEYS.ACTIVE_TEMPLATE, id);
  scheduleAutoBackup();
}

// ─── Weekly scheduling ─────────────────────────────────────────────────────
// A routine can be pinned to weekdays via a `days` array of JS weekday numbers
// (0 = Sun … 6 = Sat). Scheduling is one-routine-per-day: assigning a day to
// a routine removes that day from whatever routine previously held it. On the
// scheduled weekday the Dashboard features that routine automatically.

// Toggle `day` on `templateId`. If the routine already owns that day, clear it;
// otherwise claim it and strip it from any other routine (one-per-day). Built-
// in routines get forked into storage the first time they're scheduled, same
// as editing them — DEFAULT_TEMPLATES stays untouched.
export async function toggleTemplateDay(templateId, day) {
  const raw = await AsyncStorage.getItem(KEYS.TEMPLATES);
  const saved = raw ? JSON.parse(raw) : {};
  const templates = await getTemplates(); // merged built-in + saved + custom
  const target = templates.find((t) => t.id === templateId);
  if (!target) return templates;
  const claiming = !(target.days || []).includes(day);

  for (const t of templates) {
    const days = t.days || [];
    let nextDays = days;
    if (t.id === templateId) {
      nextDays = claiming ? [...days, day] : days.filter((d) => d !== day);
    } else if (claiming && days.includes(day)) {
      // Someone else held this day — release it (one-per-day rule).
      nextDays = days.filter((d) => d !== day);
    } else {
      continue; // untouched — don't fork it into storage needlessly
    }
    saved[t.id] = { ...t, days: nextDays };
  }
  await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(saved));
  scheduleAutoBackup();
  return getTemplates();
}

// The routine scheduled for today's weekday, or null if it's an unscheduled
// (rest) day. One-per-day guarantees at most one match.
export async function getScheduledTemplateForToday() {
  const templates = await getTemplates();
  const today = new Date().getDay();
  return templates.find((t) => (t.days || []).includes(today)) || null;
}

// Workout session shape:
// { id, date (ISO), name, exercises: [ { exerciseId, sets: [ {weight, reps} ] } ] }

export async function getWorkouts() {
  const raw = await AsyncStorage.getItem(KEYS.WORKOUTS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveWorkout(session) {
  const all = await getWorkouts();
  all.push(session);
  await AsyncStorage.setItem(KEYS.WORKOUTS, JSON.stringify(all));
  scheduleAutoBackup();
  return all;
}

export async function getWorkoutsForExercise(exerciseId) {
  const all = await getWorkouts();
  const out = [];
  for (const w of all) {
    const match = w.exercises.find((e) => e.exerciseId === exerciseId);
    if (match) out.push({ date: w.date, sets: match.sets });
  }
  return out.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getWorkoutDates() {
  const all = await getWorkouts();
  return all.map((w) => new Date(w.date).toISOString().slice(0, 10));
}

export async function clearAllData() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

export async function saveProfile(profile) {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  scheduleAutoBackup();
  return profile;
}

// Partial merge — used for single-field updates (e.g. avatarUri) so a picker
// callback doesn't have to know or re-supply the rest of the profile.
export async function updateProfile(patch) {
  const current = await getProfile();
  const next = { ...(current || {}), ...patch };
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(next));
  scheduleAutoBackup();
  return next;
}

export async function getProfile() {
  const raw = await AsyncStorage.getItem(KEYS.PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export async function setHasSeenOnboarding(value = true) {
  await AsyncStorage.setItem(KEYS.HAS_SEEN_ONBOARDING, value ? 'true' : 'false');
}

export async function hasSeenOnboarding() {
  const raw = await AsyncStorage.getItem(KEYS.HAS_SEEN_ONBOARDING);
  return raw === 'true';
}

// True once the user has seen (or skipped) the first-run feature tour — the
// swipeable value carousel shown before the sign-in gate. Kept separate from
// HAS_SEEN_ONBOARDING (which tracks profile completion) so the tour shows
// exactly once, independent of whether profile setup was finished.
export async function setHasSeenTour(value = true) {
  await AsyncStorage.setItem(KEYS.HAS_SEEN_TOUR, value ? 'true' : 'false');
}

export async function hasSeenTour() {
  const raw = await AsyncStorage.getItem(KEYS.HAS_SEEN_TOUR);
  return raw === 'true';
}

// True once the user has explicitly chosen a sign-in path (Google / email /
// anonymous / skip). Separate from onboarding so we don't nag them with the
// sign-in gate on every launch if profile setup got interrupted.
export async function hasChosenAuth() {
  const raw = await AsyncStorage.getItem('progressive:hasChosenAuth');
  return raw === 'true';
}

export async function setHasChosenAuth(value = true) {
  await AsyncStorage.setItem('progressive:hasChosenAuth', value ? 'true' : 'false');
}

// User-added exercises. Stored as an array. Same schema as built-ins from
// data/exercises.js (id, name, muscle, secondary, equipment, aliases, emoji,
// tracking_type). Backed up to the cloud via the standard snapshot flow.
export async function getStoredCustomExercises() {
  const raw = await AsyncStorage.getItem('progressive:customExercises');
  return raw ? JSON.parse(raw) : [];
}

export async function saveCustomExercise(exercise) {
  const list = await getStoredCustomExercises();
  const without = list.filter((e) => e.id !== exercise.id);
  const next = [...without, exercise];
  await AsyncStorage.setItem('progressive:customExercises', JSON.stringify(next));
  scheduleAutoBackup();
  return next;
}

export async function deleteCustomExerciseStored(id) {
  const list = await getStoredCustomExercises();
  const next = list.filter((e) => e.id !== id);
  await AsyncStorage.setItem('progressive:customExercises', JSON.stringify(next));
  scheduleAutoBackup();
  return next;
}

// Smart reminders (local notifications) master switch. Defaults ON so new
// users get the retention nudges; they can mute from Settings. Backed up in
// the standard snapshot so the preference follows the account.
export async function getSmartRemindersEnabled() {
  const raw = await AsyncStorage.getItem('progressive:smartReminders');
  return raw === null ? true : raw === 'true';
}

export async function setSmartRemindersEnabled(value) {
  await AsyncStorage.setItem('progressive:smartReminders', value ? 'true' : 'false');
  scheduleAutoBackup();
}

// Hidden built-in exercises. Built-ins are a hardcoded catalog, so "deleting"
// one means recording its id here and filtering it out of the library/search.
// Lookups by id (getExerciseById) deliberately still resolve hidden built-ins
// so historical workouts that reference them keep rendering correctly.
export async function getHiddenExerciseIds() {
  const raw = await AsyncStorage.getItem('progressive:hiddenExercises');
  return raw ? JSON.parse(raw) : [];
}

export async function hideExerciseStored(id) {
  const list = await getHiddenExerciseIds();
  if (list.includes(id)) return list;
  const next = [...list, id];
  await AsyncStorage.setItem('progressive:hiddenExercises', JSON.stringify(next));
  scheduleAutoBackup();
  return next;
}

export async function unhideExerciseStored(id) {
  const list = await getHiddenExerciseIds();
  const next = list.filter((x) => x !== id);
  await AsyncStorage.setItem('progressive:hiddenExercises', JSON.stringify(next));
  scheduleAutoBackup();
  return next;
}

// Kept as a no-op so older screens that still call it don't break; the app
// no longer auto-seeds demo workouts — every new profile starts at zero.
export async function seedIfEmpty() {
  return;
}
