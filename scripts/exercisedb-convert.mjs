// Maps one MIT ExerciseDB record to the app's exercise shape.
const MUSCLE = { chest: 'Chest', back: 'Back', 'upper legs': 'Legs', 'lower legs': 'Legs', 'upper arms': 'Arms', 'lower arms': 'Arms', shoulders: 'Shoulders', neck: 'Shoulders', waist: 'Core', cardio: 'Cardio' };

const SECONDARY = {};
const group = (name, keys) => keys.forEach((k) => { SECONDARY[k] = name; });
group('Chest', ['pectorals', 'chest']);
group('Back', ['lats', 'upper back', 'traps', 'rhomboids', 'lower back', 'spine']);
group('Legs', ['quads', 'quadriceps', 'hamstrings', 'calves', 'adductors', 'abductors', 'hip flexors', 'inner thighs']);
group('Glutes', ['glutes']);
group('Biceps', ['biceps']);
group('Triceps', ['triceps']);
group('Arms', ['forearms', 'wrists', 'grip muscles']);
group('Shoulders', ['delts', 'deltoids', 'shoulders', 'rear deltoids', 'rotator cuff']);
group('Core', ['abs', 'obliques', 'core']);

const EQUIPMENT = {};
const eq = (name, keys) => keys.forEach((k) => { EQUIPMENT[k] = name; });
eq('Barbell', ['barbell', 'ez barbell', 'olympic barbell', 'trap bar']);
eq('Dumbbell', ['dumbbell']);
eq('Cable', ['cable']);
eq('Machine', ['leverage machine', 'sled machine', 'smith machine', 'assisted', 'skierg machine', 'elliptical machine', 'stepmill machine', 'upper body ergometer']);
eq('Bodyweight', ['body weight', 'weighted']);
eq('Bike', ['stationary bike']);
eq('Rope', ['rope']);

const EMOJI = { Chest: '🏋️', Back: '🏋️', Shoulders: '🏋️', Legs: '🦵', Arms: '💪', Core: '🧘', Cardio: '🏃' };

export function titleCase(str) {
  return str
    .split(/([ -])/)
    .map((t) => (t === 'ez' ? 'EZ' : /^\d/.test(t) ? t : t.charAt(0).toUpperCase() + t.slice(1)))
    .join('');
}

export function convertRecord(rec) {
  const muscle = MUSCLE[rec.category] ?? 'Core';
  const secondary = [...new Set((rec.secondary_muscles ?? []).map((m) => SECONDARY[m.toLowerCase()]).filter(Boolean))].filter((m) => m !== muscle);
  const tracking_type = rec.category === 'cardio' ? 'CARDIO'
    : /\b(plank|hold|hang)\b/i.test(rec.name) ? 'TIMED_HOLD'
    : rec.equipment === 'body weight' ? 'BODYWEIGHT_REPS'
    : 'WEIGHT_REPS';
  return {
    id: `edb-${rec.id}`,
    name: titleCase(rec.name),
    muscle,
    secondary,
    equipment: EQUIPMENT[rec.equipment] ?? titleCase(rec.equipment),
    aliases: [],
    emoji: EMOJI[muscle],
    tracking_type,
  };
}
