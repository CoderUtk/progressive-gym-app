import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '../components/UI';
import MuscleIcon from '../components/MuscleIcon';
import ShareCardModal from '../components/ShareCardModal';
import { colors, spacing } from '../utils/theme';
import { getExerciseById } from '../data/exercises';
import { getWorkouts, getWeightUnit, getProfile } from '../utils/storage';
import { formatWeight } from '../utils/units';
import { detectPRs } from '../utils/progressiveOverload';
import { formatSet } from '../utils/setSchema';

// route.params: { date: 'YYYY-MM-DD' }
export default function DayWorkoutScreen({ route, navigation }) {
  const { date } = route.params;
  const [sessions, setSessions] = useState([]);
  const [allWorkouts, setAllWorkouts] = useState([]);
  const [unit, setUnit] = useState('kg');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState({ visible: false, session: null, prCount: 0, topPR: null });

  function openShare(session) {
    // Recompute PR count against every prior session for this same exercise
    // so a history entry shares an honest "PRs at the time" number.
    const priorSessions = allWorkouts.filter((w) => new Date(w.date) < new Date(session.date));
    let prCount = 0;
    let topPR = null;
    for (const ex of session.exercises) {
      const history = priorSessions
        .filter((w) => w.exercises.some((e) => e.exerciseId === ex.exerciseId))
        .map((w) => ({ sets: w.exercises.find((e) => e.exerciseId === ex.exerciseId).sets }));
      const prs = detectPRs(history, ex.sets);
      prCount += prs.length;
      if (!topPR && prs.some((p) => p.type === 'weight')) {
        const exercise = getExerciseById(ex.exerciseId);
        const top = ex.sets.reduce((a, b) => (b.weight > a.weight ? b : a), ex.sets[0]);
        topPR = { name: exercise?.name?.toUpperCase() || 'PR', value: `${formatWeight(top.weight, unit)} × ${top.reps}` };
      }
    }
    setShare({ visible: true, session, prCount, topPR });
  }

  useEffect(() => {
    const readable = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    navigation.setOptions({ title: readable });

    (async () => {
      const [all, weightUnit, prof] = await Promise.all([getWorkouts(), getWeightUnit(), getProfile()]);
      const matches = all.filter((w) => new Date(w.date).toISOString().slice(0, 10) === date);
      setAllWorkouts(all);
      setSessions(matches);
      setUnit(weightUnit);
      setProfile(prof);
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
          <View style={styles.sessionHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.sessionName} numberOfLines={2}>{session.name}</Text>
              <Text style={styles.sessionTime}>
                {new Date(session.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                {session.durationMs ? ` · ${Math.round(session.durationMs / 60000)} min` : ''}
                {session.sRPE ? ` · RPE ${session.sRPE}` : ''}
              </Text>
            </View>
            <Pressable onPress={() => openShare(session)} style={styles.shareBtn} hitSlop={6}>
              <Feather name="share-2" size={13} color={colors.accent} />
              <Text style={styles.shareBtnText}>Share</Text>
            </Pressable>
          </View>

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
                    Set {i + 1}: {formatSet(exercise, set, unit)}
                  </Text>
                ))}
              </View>
            );
          })}
        </Card>
      ))}

      <ShareCardModal
        visible={share.visible}
        onClose={() => setShare({ visible: false, session: null, prCount: 0, topPR: null })}
        profile={profile}
        session={share.session}
        unit={unit}
        prCount={share.prCount}
        topPR={share.topPR}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.lg },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  sessionName: { color: colors.text, fontSize: 19, fontWeight: '800', lineHeight: 24 },
  sessionTime: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  shareBtnText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  exerciseBlock: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  exerciseName: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1, lineHeight: 19 },
  setLine: { color: colors.muted, fontSize: 14, fontWeight: '600', marginLeft: 28 },
});
