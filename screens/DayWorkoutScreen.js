import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Card } from '../components/UI';
import MuscleIcon from '../components/MuscleIcon';
import { colors, spacing } from '../utils/theme';
import { getExerciseById } from '../data/exercises';
import { getWorkouts, getWeightUnit } from '../utils/storage';
import { formatWeight } from '../utils/units';

// route.params: { date: 'YYYY-MM-DD' }
export default function DayWorkoutScreen({ route, navigation }) {
  const { date } = route.params;
  const [sessions, setSessions] = useState([]);
  const [unit, setUnit] = useState('kg');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const readable = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    navigation.setOptions({ title: readable });

    (async () => {
      const [all, weightUnit] = await Promise.all([getWorkouts(), getWeightUnit()]);
      const matches = all.filter((w) => new Date(w.date).toISOString().slice(0, 10) === date);
      setSessions(matches);
      setUnit(weightUnit);
      setLoading(false);
    })();
  }, [date]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Loading…</Text>
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>No workout logged on this day.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      {sessions.map((session) => (
        <Card key={session.id} style={{ marginBottom: spacing.md }}>
          <Text style={styles.sessionName}>{session.name}</Text>
          <Text style={styles.sessionTime}>
            {new Date(session.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </Text>

          {session.exercises.map((ex) => {
            const exercise = getExerciseById(ex.exerciseId);
            if (!exercise) return null;
            return (
              <View key={ex.exerciseId} style={styles.exerciseBlock}>
                <View style={styles.exerciseHeader}>
                  <MuscleIcon equipment={exercise.equipment} size={20} />
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                </View>
                {ex.sets.map((set, i) => (
                  <Text key={i} style={styles.setLine}>
                    Set {i + 1}: {formatWeight(set.weight, unit)} × {set.reps}
                  </Text>
                ))}
              </View>
            );
          })}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.lg },
  sessionName: { color: colors.text, fontSize: 19, fontWeight: '800' },
  sessionTime: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: spacing.md },
  exerciseBlock: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  exerciseName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  setLine: { color: colors.muted, fontSize: 14, fontWeight: '600', marginLeft: 28 },
});
