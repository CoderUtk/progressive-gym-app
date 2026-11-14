import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXERCISES, getAllExercises, searchExercises, getExerciseById, isBuiltInExercise,
  setCustomExercisesInMemory, setHiddenExercisesInMemory, hideExerciseInMemory,
} from '../data/exercises.js';

test('catalogue grows past 1000 and built-ins come first', () => {
  const all = getAllExercises();
  assert.ok(all.length > 1000);
  assert.equal(all[0].id, EXERCISES[0].id);
  assert.ok(all.findIndex(e => e.id.startsWith('edb-')) >= EXERCISES.length);
});
test('custom exercises sit between built-ins and dataset', () => {
  setCustomExercisesInMemory([{ id: 'custom-x', name: 'Zzz', muscle: 'Core' }]);
  try {
    assert.equal(getAllExercises()[EXERCISES.length].id, 'custom-x');
  } finally {
    setCustomExercisesInMemory([]);
  }
});
test('barbell bench press duplicate dropped, dumbbell variant kept', () => {
  const names = getAllExercises().map(e => e.name.toLowerCase());
  assert.equal(names.filter(n => n === 'barbell bench press').length, 0);
  assert.ok(searchExercises('dumbbell bench press').length >= 1);
});
test('hidden dataset exercise disappears from list but resolves by id', () => {
  const id = getAllExercises().find(e => e.id.startsWith('edb-')).id;
  try {
    hideExerciseInMemory(id);
    assert.ok(!getAllExercises().some(e => e.id === id));
    assert.equal(getExerciseById(id).id, id);
  } finally {
    setHiddenExercisesInMemory([]);
  }
});
test('distinct variants are kept', () => {
  assert.ok(searchExercises('diamond push').length >= 1);
  assert.ok(searchExercises('archer pull').length >= 1);
  assert.ok(searchExercises('3/4 sit').length >= 1);
});
test('dataset exercises are hide-not-delete', () => {
  assert.equal(isBuiltInExercise(getAllExercises().find(e => e.id.startsWith('edb-')).id), true);
});
