import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  WORKOUTS: 'progressive:workouts', // array of completed workout sessions
  TEMPLATES: 'progressive:templates',
  ACTIVE_TEMPLATE: 'progressive:activeTemplateId',
};

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

export async function clearAllData() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

export async function seedIfEmpty() {
  const existing = await getWorkouts();
  if (existing.length > 0) return;
  const now = Date.now();
  const day = 86400000;
  const demo = [
    {
      id: 'demo1',
      date: new Date(now - 9 * day).toISOString(),
      name: 'Push Day',
      exercises: [
        { exerciseId: 'bench-press', sets: [{ weight: 65, reps: 9 }, { weight: 65, reps: 8 }, { weight: 60, reps: 10 }] },
        { exerciseId: 'incline-db-press', sets: [{ weight: 20, reps: 10 }, { weight: 20, reps: 9 }] },
      ],
    },
    {
      id: 'demo2',
      date: new Date(now - 6 * day).toISOString(),
      name: 'Push Day',
      exercises: [
        { exerciseId: 'bench-press', sets: [{ weight: 70, reps: 8 }, { weight: 70, reps: 8 }, { weight: 65, reps: 9 }] },
        { exerciseId: 'incline-db-press', sets: [{ weight: 22.5, reps: 10 }, { weight: 22.5, reps: 8 }] },
      ],
    },
  ];
  await AsyncStorage.setItem(KEYS.WORKOUTS, JSON.stringify(demo));
}
