import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  WORKOUTS: 'progressive:workouts', // array of completed workout sessions
  TEMPLATES: 'progressive:templates',
  ACTIVE_TEMPLATE: 'progressive:activeTemplateId',
  PROFILE: 'progressive:profile',
  HAS_SEEN_ONBOARDING: 'progressive:hasSeenOnboarding',
  WEIGHT_UNIT: 'progressive:weightUnit',
};

// App-wide display unit — 'kg' or 'lb'. Everything is stored internally in
// kg regardless of this setting; screens convert for display only.
export async function getWeightUnit() {
  const raw = await AsyncStorage.getItem(KEYS.WEIGHT_UNIT);
  return raw === 'lb' ? 'lb' : 'kg';
}

export async function setWeightUnit(unit) {
  await AsyncStorage.setItem(KEYS.WEIGHT_UNIT, unit === 'lb' ? 'lb' : 'kg');
}

// Built-in starter templates. Users can edit these (which forks them into
// storage) or create brand new custom ones.
export const DEFAULT_TEMPLATES = [
  { id: 'push-day', name: 'Push Day', exerciseIds: ['bench-press', 'incline-db-press', 'shoulder-press'] },
  { id: 'pull-day', name: 'Pull Day', exerciseIds: ['deadlift', 'lat-pulldown', 'pull-up', 'bicep-curl'] },
  { id: 'leg-day', name: 'Leg Day', exerciseIds: ['squat', 'leg-press'] },
  { id: 'upper', name: 'Upper', exerciseIds: ['bench-press', 'lat-pulldown', 'shoulder-press', 'bicep-curl'] },
  { id: 'lower', name: 'Lower', exerciseIds: ['squat', 'deadlift', 'leg-press'] },
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
