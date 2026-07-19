export const EXERCISES = [
  {
    id: 'bench-press',
    name: 'Bench Press',
    muscle: 'Chest',
    secondary: ['Triceps', 'Shoulders'],
    equipment: 'Barbell',
    aliases: ['flat bench', 'bb bench'],
    emoji: '🏋️',
  },
  {
    id: 'incline-db-press',
    name: 'Incline Dumbbell Press',
    muscle: 'Chest',
    secondary: ['Shoulders'],
    equipment: 'Dumbbell',
    aliases: ['incline press', 'db incline'],
    emoji: '🏋️',
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    muscle: 'Back',
    secondary: ['Biceps'],
    equipment: 'Machine',
    aliases: ['lat machine', 'pulldown'],
    emoji: '🧗',
  },
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    muscle: 'Arms',
    secondary: ['Triceps'],
    equipment: 'Cable',
    aliases: ['rope pushdown', 'rope'],
    emoji: '💪',
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    muscle: 'Shoulders',
    secondary: ['Back'],
    equipment: 'Cable',
    aliases: ['rope face pull', 'rope'],
    emoji: '💪',
  },
  {
    id: 'cable-crunch',
    name: 'Cable Crunch',
    muscle: 'Core',
    secondary: [],
    equipment: 'Cable',
    aliases: ['rope crunch', 'rope'],
    emoji: '🔥',
  },
  {
    id: 'squat',
    name: 'Back Squat',
    muscle: 'Legs',
    secondary: ['Glutes', 'Core'],
    equipment: 'Barbell',
    aliases: ['squats', 'bb squat'],
    emoji: '🦵',
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    muscle: 'Back',
    secondary: ['Legs', 'Glutes'],
    equipment: 'Barbell',
    aliases: ['conventional deadlift', 'dl'],
    emoji: '🏋️',
  },
  {
    id: 'shoulder-press',
    name: 'Overhead Shoulder Press',
    muscle: 'Shoulders',
    secondary: ['Triceps'],
    equipment: 'Dumbbell',
    aliases: ['ohp', 'military press'],
    emoji: '🏋️',
  },
  {
    id: 'bicep-curl',
    name: 'Bicep Curl',
    muscle: 'Arms',
    secondary: ['Biceps'],
    equipment: 'Dumbbell',
    aliases: ['db curl'],
    emoji: '💪',
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    muscle: 'Legs',
    secondary: ['Glutes'],
    equipment: 'Machine',
    aliases: [],
    emoji: '🦵',
  },
  {
    id: 'pull-up',
    name: 'Pull-Up',
    muscle: 'Back',
    secondary: ['Biceps'],
    equipment: 'Bodyweight',
    aliases: ['chin up', 'pullup'],
    emoji: '🧗',
  },
];

export function searchExercises(query) {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISES;
  return EXERCISES.filter((e) => {
    const haystack = [e.name, e.muscle, e.equipment, ...e.aliases]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function getExerciseById(id) {
  return EXERCISES.find((e) => e.id === id);
}

export const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Arms', 'Shoulders', 'Core'];
