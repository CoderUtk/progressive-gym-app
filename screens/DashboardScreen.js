import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Alert, StyleSheet, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { PrimaryButton } from '../components/UI';
import MuscleIcon from '../components/MuscleIcon';
import { colors, spacing, radius, fonts } from '../utils/theme';
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
import { suggestNextTarget } from '../utils/progressiveOverload';
import { formatWeight } from '../utils/units';
import { stepForEquipment } from '../utils/increments';
import { formatSet } from '../utils/setSchema';
import { TRACKING } from '../data/exercises';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

function lastSessionLabel(days) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d`;
}

function openVideoGuide(name) {
  const q = encodeURIComponent(`${name} proper form`);
  Linking.openURL(`https://www.youtube.com/results?search_query=${q}`).catch(() =>
    Alert.alert('Video', 'Could not open YouTube.')
  );
}

// Count a number up from 0 on mount — the small motion touch that makes a stat
// feel earned rather than just printed. Short and eased so it never feels slow.
function useCountUp(target, duration = 650) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) { setValue(0); return undefined; }
    let raf;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Guarantee the final value lands even if rAF is throttled (backgrounded
    // tab, reduced motion) — the number must never be left mid-count.
    const settle = setTimeout(() => setValue(target), duration + 50);
    return () => { cancelAnimationFrame(raf); clearTimeout(settle); };
  }, [target, duration]);
  return value;
}

export default function DashboardScreen({ navigation }) {
  const [template, setTemplate] = useState(null);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState('kg');
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ total: 0, lastDate: null });
  const [isScheduled, setIsScheduled] = useState(false);

  // Fade + rise the content in once, when the first load settles.
  const intro = useRef(new Animated.Value(0)).current;
  const sessionCount = useCountUp(stats.total);

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

  useEffect(() => {
    if (loading) return;
    intro.setValue(0);
    Animated.timing(intro, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [loading, intro]);

  function openTemplatePicker() {
    navigation.navigate('TemplateSelect', { activeTemplateId: template?.id });
  }

  if (loading || !template) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  const firstName = profile?.name ? profile.name.split(/\s+/)[0] : null;
  const lastLabel = stats.lastDate ? lastSessionLabel(daysSince(stats.lastDate)) : '—';
  const eyebrow = isScheduled
    ? `${WEEKDAY_NAMES[new Date().getDay()]} · Today's plan`
    : firstName
      ? `${greetingFor()}, ${firstName}`
      : greetingFor();
  const fresh = stats.total === 0;

  const introStyle = {
    opacity: intro,
    transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={introStyle}>
        {/* ── Hero: the workout as a headline ─────────────────── */}
        <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
        <View style={styles.heroRow}>
          <Text style={styles.heroTitle} numberOfLines={2}>{template.name}</Text>
          <Pressable style={styles.changePill} onPress={openTemplatePicker} hitSlop={6}>
            <Feather name="repeat" size={12} color={colors.muted} />
            <Text style={styles.changePillText}>Change</Text>
          </Pressable>
        </View>

        {/* ── Two quiet stats, scoreboard type ─────────────────── */}
        <View style={styles.statStrip}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{sessionCount}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{lastLabel}</Text>
            <Text style={styles.statLabel}>Last session</Text>
          </View>
        </View>

        {/* ── Today's lifts, as clean rows ─────────────────────── */}
        <Text style={styles.sectionEyebrow}>Today's lifts</Text>

        {targets.length === 0 ? (
          <Text style={styles.emptyRow}>
            This routine's empty. Tap Change to add a few lifts and get going.
          </Text>
        ) : (
          <View style={styles.liftList}>
            {targets.map(({ exercise, lastSession, suggestion }, i) => {
              const isWeight = exercise.tracking_type === TRACKING.WEIGHT_REPS;
              const goal = isWeight && suggestion.weight
                ? `${formatWeight(suggestion.weight, unit)} × ${suggestion.reps}`
                : null;
              const last = lastSession && lastSession.sets.length
                ? formatSet(
                    exercise,
                    [...lastSession.sets].sort(
                      (a, b) => (b.weight || b.reps || b.durationSec || 0) - (a.weight || a.reps || a.durationSec || 0)
                    )[0],
                    unit
                  )
                : null;
              return (
                <View key={exercise.id} style={[styles.liftRow, i > 0 && styles.liftRowBorder]}>
                  <View style={styles.liftIcon}>
                    <MuscleIcon equipment={exercise.equipment} muscle={exercise.muscle} size={20} />
                  </View>
                  <View style={styles.liftMid}>
                    <View style={styles.liftNameRow}>
                      <Text style={styles.liftName} numberOfLines={1}>{exercise.name}</Text>
                      {suggestion.alert === 'plateau' && <View style={styles.plateauDot} />}
                    </View>
                    <Text style={styles.liftLast} numberOfLines={1}>
                      {last ? `Last ${last}` : 'No history yet'}
                    </Text>
                  </View>
                  <View style={styles.liftGoal}>
                    {goal ? (
                      <>
                        <Text style={styles.liftGoalValue}>{goal}</Text>
                        <Text style={styles.liftGoalLabel}>Goal</Text>
                      </>
                    ) : (
                      <Pressable onPress={() => openVideoGuide(exercise.name)} hitSlop={8}>
                        <Feather name="play-circle" size={18} color={colors.mutedDim} />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── One strong call to action ────────────────────────── */}
        <PrimaryButton
          title={fresh ? 'Start your first workout' : 'Start Workout'}
          disabled={targets.length === 0}
          style={{ marginTop: spacing.xl }}
          onPress={() => navigation.navigate('WorkoutLogger', { template })}
        />
        <Pressable onPress={openTemplatePicker} style={styles.editLink} hitSlop={8}>
          <Text style={styles.editLinkText}>Edit this routine</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  loadingText: { color: colors.muted, fontFamily: fonts.body, fontSize: 15 },

  eyebrow: {
    color: colors.accent,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  heroTitle: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 46,
    lineHeight: 48,
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  changePillText: { color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 12 },

  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1 },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  statValue: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 36,
    includeFontPadding: false,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  sectionEyebrow: {
    color: colors.muted,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  emptyRow: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },

  liftList: {},
  liftRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  liftRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  liftIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liftMid: { flex: 1, minWidth: 0 },
  liftNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liftName: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 16, flexShrink: 1 },
  plateauDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },
  liftLast: { color: colors.mutedDim, fontFamily: fonts.body, fontSize: 13, marginTop: 1 },
  liftGoal: { alignItems: 'flex-end', minWidth: 64 },
  liftGoalValue: {
    color: colors.accent,
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    lineHeight: 22,
    includeFontPadding: false,
  },
  liftGoalLabel: {
    color: colors.mutedDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  editLink: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  editLinkText: {
    color: colors.muted,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
