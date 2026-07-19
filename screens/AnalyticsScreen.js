import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { Card } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { getWorkouts } from '../utils/storage';
import { getExerciseById } from '../data/exercises';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const [workouts, setWorkouts] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getWorkouts().then((w) => setWorkouts(w.sort((a, b) => new Date(a.date) - new Date(b.date))));
    }, [])
  );

  if (workouts.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Log a few workouts to see analytics.</Text>
      </View>
    );
  }

  // Total volume per workout
  const volumeByWorkout = workouts.map((w) => ({
    date: w.date,
    volume: w.exercises.reduce(
      (sum, e) => sum + e.sets.reduce((s, x) => s + x.weight * x.reps, 0),
      0
    ),
  }));

  const totalWeightLifted = volumeByWorkout.reduce((a, w) => a + w.volume, 0);
  const totalSets = workouts.reduce(
    (a, w) => a + w.exercises.reduce((s, e) => s + e.sets.length, 0),
    0
  );

  // Progress score: compare each exercise's most recent top weight vs its first recorded top weight
  const exerciseIds = [...new Set(workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId)))];
  let improved = 0, maintained = 0, declined = 0;
  exerciseIds.forEach((id) => {
    const sessions = workouts
      .filter((w) => w.exercises.some((e) => e.exerciseId === id))
      .map((w) => w.exercises.find((e) => e.exerciseId === id));
    if (sessions.length < 2) { maintained++; return; }
    const first = Math.max(...sessions[0].sets.map((s) => s.weight));
    const last = Math.max(...sessions[sessions.length - 1].sets.map((s) => s.weight));
    if (last > first) improved++;
    else if (last < first) declined++;
    else maintained++;
  });
  const totalTracked = improved + maintained + declined;
  const progressScore = totalTracked ? Math.round((improved / totalTracked) * 100) : 0;

  const chartData = {
    labels: volumeByWorkout.slice(-6).map((_, i) => `${i + 1}`),
    datasets: [{ data: volumeByWorkout.slice(-6).map((w) => Math.round(w.volume)) }],
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      <Card style={{ marginBottom: spacing.md, alignItems: 'center' }}>
        <Text style={styles.scoreLabel}>Progress Score</Text>
        <Text style={styles.scoreValue}>{progressScore}%</Text>
        <View style={styles.scoreBreakdown}>
          <Text style={styles.breakdownText}>↑ {improved} improved</Text>
          <Text style={styles.breakdownText}>→ {maintained} maintained</Text>
          <Text style={styles.breakdownText}>↓ {declined} declined</Text>
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Total Weight Lifted</Text>
          <Text style={styles.statValue}>{Math.round(totalWeightLifted).toLocaleString()}kg</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Total Sets</Text>
          <Text style={styles.statValue}>{totalSets}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Workouts</Text>
          <Text style={styles.statValue}>{workouts.length}</Text>
        </Card>
      </View>

      {chartData.datasets[0].data.length > 1 && (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.chartTitle}>Volume Per Workout (recent)</Text>
          <LineChart
            data={chartData}
            width={screenWidth - spacing.md * 4}
            height={180}
            withInnerLines={false}
            chartConfig={{
              backgroundColor: colors.card,
              backgroundGradientFrom: colors.card,
              backgroundGradientTo: colors.card,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(79, 224, 164, ${opacity})`,
              labelColor: () => colors.muted,
              propsForDots: { r: '4', strokeWidth: '2', stroke: colors.accent },
            }}
            bezier
            style={{ borderRadius: 12 }}
          />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.lg },
  scoreLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  scoreValue: { color: colors.accent, fontSize: 48, fontWeight: '900', marginVertical: spacing.xs },
  scoreBreakdown: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  breakdownText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, alignItems: 'center' },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '800' },
  chartTitle: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm, textTransform: 'uppercase' },
});
