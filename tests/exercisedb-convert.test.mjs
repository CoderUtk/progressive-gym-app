import test from 'node:test';
import assert from 'node:assert/strict';
import { convertRecord, titleCase } from '../scripts/exercisedb-convert.mjs';

test('converts a bodyweight core record', () => {
  const e = convertRecord({ id: '0001', name: '3/4 sit-up', category: 'waist', equipment: 'body weight', target: 'abs', secondary_muscles: ['hip flexors', 'lower back'] });
  assert.deepEqual(e, { id: 'edb-0001', name: '3/4 Sit-Up', muscle: 'Core', secondary: ['Legs', 'Back'], equipment: 'Bodyweight', aliases: [], emoji: '🧘', tracking_type: 'BODYWEIGHT_REPS' });
});
test('ez barbell maps to Barbell and EZ is uppercased', () => {
  const e = convertRecord({ id: '0100', name: 'ez barbell curl', category: 'upper arms', equipment: 'ez barbell', target: 'biceps', secondary_muscles: ['forearms'] });
  assert.equal(e.name, 'EZ Barbell Curl'); assert.equal(e.equipment, 'Barbell'); assert.equal(e.muscle, 'Arms'); assert.deepEqual(e.secondary, []);
});
test('plank is TIMED_HOLD, cardio is CARDIO', () => {
  const plank = convertRecord({ id: '0464', name: 'front plank', category: 'waist', equipment: 'body weight', target: 'abs', secondary_muscles: [] });
  assert.equal(plank.tracking_type, 'TIMED_HOLD');
  const cardio = convertRecord({ id: '0001', name: 'run', category: 'cardio', equipment: 'body weight', target: 'cardiovascular system', secondary_muscles: [] });
  assert.equal(cardio.tracking_type, 'CARDIO'); assert.equal(cardio.muscle, 'Cardio');
});
test('unknown category/equipment/muscle never yields undefined', () => {
  const e = convertRecord({ id: '9999', name: 'odd thing', category: 'mystery', equipment: 'tire', target: 'x', secondary_muscles: ['nonsense'] });
  assert.equal(e.muscle, 'Core'); assert.equal(e.equipment, 'Tire'); assert.deepEqual(e.secondary, []);
});
test('hang/plank rep movements are not timed holds', () => {
  assert.equal(convertRecord({ id: '1', name: 'kettlebell hang clean', category: 'upper legs', equipment: 'kettlebell', target: 'glutes', secondary_muscles: [] }).tracking_type, 'WEIGHT_REPS');
  assert.equal(convertRecord({ id: '2', name: 'push-up to side plank', category: 'waist', equipment: 'body weight', target: 'abs', secondary_muscles: [] }).tracking_type, 'BODYWEIGHT_REPS');
});
test('titleCase capitalizes after parenthesis', () => {
  assert.equal(titleCase('assisted chest dip (kneeling)'), 'Assisted Chest Dip (Kneeling)');
});
