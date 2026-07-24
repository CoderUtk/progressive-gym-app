import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Alert, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Card, PrimaryButton } from '../components/UI';
import MuscleIcon from '../components/MuscleIcon';
import { colors, spacing } from '../utils/theme';
import { getExerciseById } from '../data/exercises';
import {
  getWorkoutsForExercise,
  getTemplates,
  getActiveTemplateId,
  getScheduledTemplateForToday,
  getWeightUnit,
  getPlateIncrement,
  getProfile,
  getWorkouts,
} from '../utils/storage';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
import { suggestNextTarget } from '../utils/progressiveOverload';
import { formatWeight } from '../utils/units';
import { stepForEquipment } from '../utils/increments';
import { formatSet } from '../utils/setSchema';
import { TRACKING } from '../data/exercises';

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function daysSince(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

// Title Case "Today" / "N days ago" — never dumps a lowercase word into the
// stat card. `d` is the raw day-delta from daysSince(); returns the label
// exactly as it should appear on screen.
function lastSessionLabel(days) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function openVideoGuide(name) {
  const q = encodeURIComponent(`${name} proper form`);
  Linking.openURL(`https://www.youtube.com/results?search_query=${q}`).catch(() =>
    Alert.alert('Video', 'Could not open YouTube.')
  );
}

export default function DashboardScreen({ navigation }) {
  const [template, setTemplate] = useState(null);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState('kg');
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ total: 0, lastDate: null });
  const [isScheduled, setIsScheduled] = useState(false);

  const loadTargetsFor = useCallback(async (tmpl) => {
    const [weightUnit, increment] = await Promise.all([getWeightUnit(), getPlateIncrement()]);
    setUnit(weightUnit);
    const results = [];
    for (const id of tmpl.exerciseIds) {
      const ex = getExerciseById(id);
      if (!ex) continue;
      const step = stepForEquipment(ex.equipment, increment);
      const history = await getWorkoutsForExercise(id);
      const suggestion = suggestNextTarget(history, 8, step);
      const lastSession = history[0];
      results.push({ exercise: ex, lastSession, suggestion });
    }
    setTargets(results);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [scheduled, activeId, all, prof, allWorkouts] = await Promise.all([
      getScheduledTemplateForToday(),
      getActiveTemplateId(),
      getTemplates(),
      getProfile(),
      getWorkouts(),
    ]);
    // A routine pinned to today's weekday wins the Dashboard; otherwise fall
    // back to the last-used (active) routine, preserving prior behaviour.
    const active = scheduled || all.find((t) => t.id === activeId) || all[0];
    setIsScheduled(!!scheduled);
    setTemplate(active);
    setProfile(prof);
    const sorted = [...allWorkouts].sort((a, b) => new Date(b.date) - new Date(a.date));
    setStats({ total: allWorkouts.length, lastDate: sorted[0]?.date || null });
    await loadTargetsFor(active);
    setLoading(false);
  }, [loadTargetsFor]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openTemplatePicker() {
    navigation.navigate('TemplateSelect', { activeTemplateId: template?.id });
  }

  if (loading || !template) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Loading…</Text>
      </View>
    );
  }

  const firstName = profile?.name ? profile.name.split(/\s+/)[0] : null;
  const lastLabel = stats.lastDate ? lastSessionLabel(daysSince(stats.lastDate)) : '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      <View style={styles.greetBlock}>
        <Text style={styles.greetSmall}>{greetingFor()}</Text>
        <Text style={styles.greetName}>{firstName ? `${firstName} 👋` : 'Welcome back'}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Sessions Completed</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{lastLabel}</Text>
          <Text style={styles.statLabel}>Last Session</Text>
        </View>
      </View>

      <View style={styles.todayCard}>
        <Text style={styles.todayEyebrow}>
          {isScheduled ? `${WEEKDAY_NAMES[new Date().getDay()].toUpperCase()}'S PLAN` : "TODAY'S TARGETS"}
        </Text>
        <View style={styles.todayTitleRow}>
          <Text style={styles.todayTitle} numberOfLines={2}>{template.name}</Text>
          <Pressable style={styles.changeBtn} onPress={openTemplatePicker}>
            <Feather name="repeat" size={12} color={colors.text} />
            <Text style={styles.changeBtnText}>Change</Text>
          </Pressable>
        </View>
      </View>

      {targets.length === 0 && (
        <Card style={{ marginBottom: spacing.sm }}>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>
            This workout has no exercises yet. Tap "Change Workout" to add some.
          </Text>
        </Card>
      )}

      {targets.map(({ exercise, lastSession, suggestion }) => (
        <Card key={exercise.id} style={{ marginBottom: spacing.sm }}>
          <View style={styles.exerciseHeader}>
            <MuscleIcon equipment={exercise.equipment} size={22} />
            <Text style={styles.exerciseName} numberOfLines={2}>{exercise.name}</Text>
            <Pressable onPress={() => openVideoGuide(exercise.name)} style={styles.videoBtn} hitSlop={6}>
              <Feather name="play-circle" size={14} color={colors.accent} />
              <Text style={styles.videoBtnText}>Video</Text>
            </Pressable>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.label}>Last</Text>
              <Text style={styles.value} numberOfLines={1}>
                {lastSession && lastSession.sets.length
                  ? formatSet(exercise, [...lastSession.sets].sort((a, b) => (b.weight || b.reps || b.durationSec || 0) - (a.weight || a.reps || a.durationSec || 0))[0], unit)
                  : '—'}
              </Text>
            </View>
            {exercise.tracking_type === TRACKING.WEIGHT_REPS && (
              <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
                <Text style={styles.label}>Today's Goal</Text>
                <Text style={[styles.value, { color: colors.accent }]} numberOfLines={1}>
                  {suggestion.weight ? `${formatWeight(suggestion.weight, unit)} × ${suggestion.reps}` : 'Log first set'}
                </Text>
              </View>
            )}
          </View>
          {suggestion.alert === 'plateau' && (
            <View style={styles.plateauBanner}>
              <Feather name="alert-triangle" size={13} color={colors.gold} />
              <Text style={styles.plateauText} numberOfLines={2}>{suggestion.note}</Text>
            </View>
          )}
        </Card>
      ))}

      <PrimaryButton
        title="Start Workout"
        disabled={targets.length === 0}
        style={{ marginTop: spacing.md }}
        onPress={() => navigation.navigate('WorkoutLogger', { template })}
      />
      <PrimaryButton
        title="Edit Workout"
        variant="secondary"
        style={{ marginTop: spacing.sm }}
        onPress={openTemplatePicker}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  greetBlock: { marginBottom: spacing.md },
  greetSmall: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  greetName: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statPill: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statValue: { color: colors.accent, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  todayCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  todayEyebrow: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: spacing.xs,
  },
  todayTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  todayTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    flex: 1,
    lineHeight: 34,
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  changeBtnText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  exerciseHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' },
  exerciseName: { color: colors.text, fontSize: 17, fontWeight: '700', flex: 1, minWidth: 0, lineHeight: 22 },
  videoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  },
  videoBtnText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  plateauBanner: {
    marginTop: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(245,197,66,0.10)',
    borderWidth: 1, borderColor: 'rgba(245,197,66,0.35)',
  },
  plateauText: { color: colors.gold, fontSize: 12, fontWeight: '600', flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 2 },
  value: { color: colors.text, fontSize: 18, fontWeight: '800' },
});
