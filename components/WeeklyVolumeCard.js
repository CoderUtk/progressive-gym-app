import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './UI';
import { colors, spacing } from '../utils/theme';
import { getExerciseById, WEEKLY_SET_TARGETS, TRACKING } from '../data/exercises';
import { isWorkingSet } from '../utils/progressiveOverload';

const ORDER = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];

// Rolls the last 7 days of sessions up by muscle group. Cardio is counted in
// SESSIONS (not sets) — one treadmill run is one, not "however many bouts
// you logged" — which matches how lifters intuitively plan cardio.
export default function WeeklyVolumeCard({ workouts }) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const byMuscle = {};
  ORDER.forEach((m) => (byMuscle[m] = 0));

  const cardioSessionsSeen = new Set();

  for (const w of workouts) {
    if (new Date(w.date).getTime() < cutoff) continue;
    for (const ex of w.exercises) {
      const exercise = getExerciseById(ex.exerciseId);
      if (!exercise) continue;
      const isCardio = exercise.tracking_type === TRACKING.CARDIO;
      const muscle = exercise.muscle;
      if (!(muscle in byMuscle)) continue;

      if (isCardio) {
        // One tally per (session, exerciseId) so multiple cardio sets logged
        // within the same session count as one bout.
        const key = `${w.id}:${ex.exerciseId}`;
        if (!cardioSessionsSeen.has(key)) {
          cardioSessionsSeen.add(key);
          byMuscle[muscle] += 1;
        }
      } else {
        byMuscle[muscle] += (ex.sets || []).filter(isWorkingSet).length;
      }
    }
  }

  return (
    <Card style={{ marginTop: spacing.md }}>
      <Text style={styles.title}>Weekly Volume Breakdown</Text>
      <Text style={styles.hint}>Working sets in the last 7 days · cardio counted as sessions</Text>

      {ORDER.map((muscle) => {
        const count = byMuscle[muscle];
        const target = WEEKLY_SET_TARGETS[muscle] || 10;
        const pct = Math.min(1, count / target);
        const met = count >= target;
        return (
          <View key={muscle} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.muscleLabel}>{muscle}</Text>
              <Text style={[styles.count, met && { color: colors.accent }]}>
                {count} / {target}{muscle === 'Cardio' ? ' sessions' : ' sets'}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.max(2, pct * 100)}%` },
                  met && styles.fillMet,
                ]}
              />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  hint: { color: colors.mutedDim, fontSize: 11, marginBottom: spacing.md },
  row: { marginBottom: spacing.sm },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  muscleLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  count: { color: colors.muted, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  fill: {
    height: '100%',
    backgroundColor: 'rgba(62,224,158,0.5)',
    borderRadius: 3,
  },
  fillMet: { backgroundColor: colors.accent },
});
