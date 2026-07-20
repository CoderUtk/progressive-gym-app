import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  WORKOUTS: 'progressive:workouts', // array of completed workout sessions
  TEMPLATES: 'progressive:templates',
  ACTIVE_TEMPLATE: 'progressive:activeTemplateId',
  PROFILE: 'progressive:profile',
  HAS_SEEN_ONBOARDING: 'progressive:hasSeenOnboarding',
  WEIGHT_UNIT: 'progressive:weightUnit',
  PLATE_INCREMENT: 'progressive:plateIncrement',
  GOOGLE_ACCOUNT: 'progressive:googleAccount',
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
}

// Stores the signed-in Google account's basic profile (name/email/picture)
// plus the access token needed for Drive sync calls. The token is short-
// lived, so a stale one just means the next sync prompts a re-connect.
export async function getGoogleAccount() {
  const raw = await AsyncStorage.getItem(KEYS.GOOGLE_ACCOUNT);
  return raw ? JSON.parse(raw) : null;
}

export async function setGoogleAccount(account) {
  await AsyncStorage.setItem(KEYS.GOOGLE_ACCOUNT, JSON.stringify(account));
}

export async function clearGoogleAccount() {
  await AsyncStorage.removeItem(KEYS.GOOGLE_ACCOUNT);
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
  return getTemplates();
}

export async function deleteTemplate(templateId) {
  const raw = await AsyncStorage.getItem(KEYS.TEMPLATES);
  const saved = raw ? JSON.parse(raw) : {};
  delete saved[templateId];
  await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(saved));
  return getTemplates();
}

export async function getActiveTemplateId() {
  const id = await AsyncStorage.getItem(KEYS.ACTIVE_TEMPLATE);
  return id || 'push-day';
}

export async function setActiveTemplateId(id) {
  await AsyncStorage.setItem(KEYS.ACTIVE_TEMPLATE, id);
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
  return profile;
}

// Partial merge — used for single-field updates (e.g. avatarUri) so a picker
// callback doesn't have to know or re-supply the rest of the profile.
export async function updateProfile(patch) {
  const current = await getProfile();
  const next = { ...(current || {}), ...patch };
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(next));
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

// Kept as a no-op so older screens that still call it don't break; the app
// no longer auto-seeds demo workouts — every new profile starts at zero.
export async function seedIfEmpty() {
  return;
}
