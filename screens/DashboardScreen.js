import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, PrimaryButton } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { getExerciseById } from '../data/exercises';
import {
  getWorkoutsForExercise,
  seedIfEmpty,
  getTemplates,
  getActiveTemplateId,
} from '../utils/storage';
import { suggestNextTarget } from '../utils/progressiveOverload';

export default function DashboardScreen({ navigation }) {
  const [template, setTemplate] = useState(null);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTargetsFor = useCallback(async (tmpl) => {
    const results = [];
    for (const id of tmpl.exerciseIds) {
      const ex = getExerciseById(id);
      if (!ex) continue;
      const history = await getWorkoutsForExercise(id);
      const suggestion = suggestNextTarget(history);
      const lastSession = history[0];
      results.push({ exercise: ex, lastSession, suggestion });
    }
    setTargets(results);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await seedIfEmpty();
    const activeId = await getActiveTemplateId();
    const all = await getTemplates();
    const active = all.find((t) => t.id === activeId) || all[0];
    setTemplate(active);
    await loadTargetsFor(active);
    setLoading(false);
  }, [loadTargetsFor]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openTemplatePicker() {
    navigation.navigate('TemplateSelect', {
      activeTemplateId: template?.id,
      onSelect: async (chosen) => {
        setTemplate(chosen);
        await loadTargetsFor(chosen);
      },
    });
  }

  if (loading || !template) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.templateName}>{template.name}</Text>
          <Text style={styles.sectionLabel}>Today's Targets</Text>
        </View>
        <Pressable style={styles.changeBtn} onPress={openTemplatePicker}>
          <Text style={styles.changeBtnText}>Change Workout</Text>
        </Pressable>
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
          <Text style={styles.exerciseName}>{exercise.emoji} {exercise.name}</Text>
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Last</Text>
              <Text style={styles.value}>
                {lastSession
                  ? `${Math.max(...lastSession.sets.map((s) => s.weight))}kg × ${lastSession.sets[0].reps}`
                  : '—'}
              </Text>
            </View>
            <View>
              <Text style={styles.label}>Today's Goal</Text>
              <Text style={[styles.value, { color: colors.accent }]}>
                {suggestion.weight ? `${suggestion.weight}kg × ${suggestion.reps}` : 'Log first set'}
              </Text>
            </View>
          </View>
        </Card>
      ))}

      <PrimaryButton
        title="Start Workout"
        disabled={targets.length === 0}
        style={{ marginTop: spacing.md }}
        onPress={() => navigation.navigate('WorkoutLogger', { template })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  templateName: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: spacing.xs },
  sectionLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  changeBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  changeBtnText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  exerciseName: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 2 },
  value: { color: colors.text, fontSize: 18, fontWeight: '800' },
});
