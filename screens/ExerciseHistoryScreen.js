import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Card } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { getExerciseById } from '../data/exercises';
import { getWorkoutsForExercise } from '../utils/storage';

function daysAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

export default function ExerciseHistoryScreen({ route, navigation }) {
  const { exerciseId } = route.params;
  const exercise = getExerciseById(exerciseId);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    navigation.setOptions({ title: exercise.name });
    getWorkoutsForExercise(exerciseId).then(setSessions);
  }, []);

  const bestWeight = sessions.length
    ? Math.max(...sessions.flatMap((s) => s.sets.map((x) => x.weight)))
    : null;
  const bestSet = sessions.length
    ? sessions.flatMap((s) => s.sets).sort((a, b) => b.weight - a.weight)[0]
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.statsRow}>
          <Stat label="Last Workout" value={sessions[0] ? `${daysAgo(sessions[0].date)}` : '—'} />
          <Stat label="Total Sessions" value={String(sessions.length)} />
        </View>
        <View style={styles.statsRow}>
          <Stat label="Best Ever" value={bestSet ? `${bestSet.weight}kg × ${bestSet.reps}` : '—'} accent />
          <Stat label="Max Weight" value={bestWeight ? `${bestWeight}kg` : '—'} />
        </View>
      </Card>

      <Text style={styles.sectionLabel}>Session History</Text>
      {sessions.length === 0 && <Text style={styles.empty}>No sessions logged yet for this exercise.</Text>}
      {sessions.map((s, i) => (
        <Card key={i} style={{ marginBottom: spacing.sm }}>
          <Text style={styles.dateLabel}>{new Date(s.date).toDateString()} · {daysAgo(s.date)}</Text>
          {s.sets.map((set, j) => (
            <Text key={j} style={styles.setLine}>{set.weight}kg × {set.reps}</Text>
          ))}
        </Card>
      ))}
    </ScrollView>
  );
}

function Stat({ label, value, accent }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: colors.accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statsRow: { flexDirection: 'row', marginBottom: spacing.sm },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 2 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sectionLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.sm },
  dateLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: spacing.xs },
  setLine: { color: colors.text, fontSize: 15, fontWeight: '600' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 20 },
});
