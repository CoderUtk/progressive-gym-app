import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, PrimaryButton } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { getWorkoutDates, getWorkouts, getWeightUnit } from '../utils/storage';
import { formatWeight } from '../utils/units';
import WorkoutCalendar from '../components/WorkoutCalendar';

function shortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function shortTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// Builds one label per workout using its own logged date. If two or more
// recent workouts fall on the same calendar day, appends the time so the
// x-axis doesn't show the same date repeated with no way to tell bars apart.
function buildChartLabels(items) {
  const dateCounts = {};
  items.forEach((item) => {
    const key = shortDate(item.date);
    dateCounts[key] = (dateCounts[key] || 0) + 1;
  });
  return items.map((item) => {
    const key = shortDate(item.date);
    return dateCounts[key] > 1 ? `${key}\n${shortTime(item.date)}` : key;
  });
}

export default function AnalyticsScreen({ navigation }) {
  const [workouts, setWorkouts] = useState([]);
  const [workoutDates, setWorkoutDates] = useState([]);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [unit, setUnit] = useState('kg');

  useFocusEffect(
    useCallback(() => {
      Promise.all([getWorkouts(), getWorkoutDates(), getWeightUnit()]).then(([w, dates, weightUnit]) => {
        setWorkouts(w.sort((a, b) => new Date(a.date) - new Date(b.date)));
        setWorkoutDates(dates);
        setUnit(weightUnit);
      });
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
    name: w.name,
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

  const recentVolumes = volumeByWorkout.slice(-6);
  const maxVolume = Math.max(...recentVolumes.map((item) => item.volume), 1);
  const chartLabels = buildChartLabels(recentVolumes);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      <Card style={{ marginBottom: spacing.md, alignItems: 'center', minHeight: 180 }}>
        <View style={styles.scoreLabelRow}>
          <Text style={styles.scoreLabel}>Progress Score</Text>
          <Pressable onPress={() => setShowScoreInfo(true)} hitSlop={8}>
            <Text style={styles.infoIcon}>ⓘ</Text>
          </Pressable>
        </View>
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
          <Text style={styles.statValue}>{formatWeight(totalWeightLifted, unit)}</Text>
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

      {recentVolumes.length > 1 && (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.chartTitle}>Volume Per Workout (recent)</Text>
          <View style={styles.chartBars}>
            {recentVolumes.map((item, index) => (
              <View key={index} style={styles.barColumn}>
                <View style={[styles.barFill, { height: Math.max(24, (item.volume / maxVolume) * 120) }]} />
                <Text style={styles.barLabel} numberOfLines={2}>{chartLabels[index]}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.chartHint}>Recent loads are shown in a simple bar chart based on your logged volume.</Text>
        </Card>
      )}

      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.chartTitle}>Workout Calendar</Text>
        <Text style={styles.calendarHint}>Tap any day to see what you did.</Text>
        <WorkoutCalendar
          workoutDates={workoutDates}
          onDayPress={(date) => navigation.navigate('DayWorkout', { date })}
        />
      </Card>

      <Modal visible={showScoreInfo} transparent animationType="fade" onRequestClose={() => setShowScoreInfo(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowScoreInfo(false)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>How Progress Score is calculated</Text>
            <Text style={styles.modalBody}>
              For every exercise you've logged more than once, we compare the
              heaviest weight from your first session to the heaviest weight
              from your most recent session.
            </Text>
            <Text style={styles.modalBody}>
              • Went up → counted as improved{'\n'}
              • Stayed the same → counted as maintained{'\n'}
              • Went down → counted as declined
            </Text>
            <Text style={styles.modalBody}>
              Progress Score is the percentage of tracked exercises that improved.
            </Text>
            <PrimaryButton title="Got it" onPress={() => setShowScoreInfo(false)} style={{ marginTop: spacing.sm }} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.lg },
  scoreLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  scoreLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  infoIcon: { color: colors.muted, fontSize: 14 },
  scoreValue: { color: colors.accent, fontSize: 48, fontWeight: '900', marginVertical: spacing.xs },
  scoreBreakdown: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  breakdownText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, alignItems: 'center' },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '800' },
  chartTitle: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm, textTransform: 'uppercase' },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, marginTop: spacing.sm },
  barColumn: { flex: 1, alignItems: 'center', marginHorizontal: 4 },
  barFill: { width: '100%', maxWidth: 24, borderRadius: 8, backgroundColor: colors.accent, minHeight: 12 },
  barLabel: { color: colors.muted, fontSize: 10, marginTop: spacing.xs, textAlign: 'center' },
  chartHint: { color: colors.muted, fontSize: 12, marginTop: spacing.sm },
  calendarHint: { color: colors.muted, fontSize: 11, marginBottom: spacing.sm },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: spacing.sm },
  modalBody: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: spacing.sm },
});
