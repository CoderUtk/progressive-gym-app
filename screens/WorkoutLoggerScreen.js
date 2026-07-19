import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { Card, PrimaryButton, IconStepper, Pill } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { getExerciseById } from '../data/exercises';
import { getWorkoutsForExercise, saveWorkout } from '../utils/storage';
import { suggestNextTarget, detectPRs } from '../utils/progressiveOverload';

export default function WorkoutLoggerScreen({ route, navigation }) {
  const { template } = route.params;
  const [exerciseData, setExerciseData] = useState([]); // per exercise: {exercise, history, suggestion, loggedSets}
  const [current, setCurrent] = useState({ weight: 20, reps: 8 });
  const [activeIndex, setActiveIndex] = useState(0);

  async function buildExerciseData(ids) {
    const data = [];
    for (const id of ids) {
      const exercise = getExerciseById(id);
      if (!exercise) continue;
      const history = await getWorkoutsForExercise(id);
      const suggestion = suggestNextTarget(history);
      data.push({ exercise, history, suggestion, loggedSets: [] });
    }
    return data;
  }

  useEffect(() => {
    (async () => {
      const data = await buildExerciseData(template.exerciseIds);
      setExerciseData(data);
      if (data[0]?.suggestion?.weight) {
        setCurrent({ weight: data[0].suggestion.weight, reps: data[0].suggestion.reps });
      }
    })();
  }, []);

  async function editExercises() {
    navigation.navigate('ExercisePicker', {
      title: "Change Today's Exercises",
      initialSelectedIds: exerciseData.map((e) => e.exercise.id),
      onDone: async (newIds) => {
        // Keep progress for exercises still selected; fetch fresh data for
        // newly added ones; drop unselected ones.
        const kept = exerciseData.filter((e) => newIds.includes(e.exercise.id));
        const keptIds = kept.map((e) => e.exercise.id);
        const addedIds = newIds.filter((id) => !keptIds.includes(id));
        const added = await buildExerciseData(addedIds);
        const next = [...kept, ...added];
        setExerciseData(next);
        setActiveIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)));
        if (next.length) {
          const s = next[Math.min(activeIndex, next.length - 1)].suggestion;
          setCurrent({ weight: s.weight || 20, reps: s.reps || 8 });
        }
      },
    });
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={editExercises} style={{ paddingHorizontal: 4 }}>
          <Text style={{ color: colors.accent, fontWeight: '700' }}>Edit</Text>
        </Pressable>
      ),
    });
  }, [exerciseData, activeIndex]);

  if (exerciseData.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Loading…</Text>
      </View>
    );
  }

  const activeEx = exerciseData[activeIndex];

  function logSet() {
    setExerciseData((prev) => {
      const copy = [...prev];
      copy[activeIndex] = {
        ...copy[activeIndex],
        loggedSets: [...copy[activeIndex].loggedSets, { ...current }],
      };
      return copy;
    });
  }

  function nextExercise() {
    if (activeIndex < exerciseData.length - 1) {
      const nextIdx = activeIndex + 1;
      setActiveIndex(nextIdx);
      const s = exerciseData[nextIdx].suggestion;
      setCurrent({ weight: s.weight || 20, reps: s.reps || 8 });
    } else {
      finishWorkout();
    }
  }

  async function finishWorkout() {
    const exercises = exerciseData
      .filter((e) => e.loggedSets.length > 0)
      .map((e) => ({ exerciseId: e.exercise.id, sets: e.loggedSets }));

    if (exercises.length === 0) {
      Alert.alert('No sets logged', 'Log at least one set before finishing.');
      return;
    }

    const session = {
      id: uuidv4(),
      date: new Date().toISOString(),
      name: template.name,
      exercises,
    };
    await saveWorkout(session);

    const prLines = [];
    for (const e of exerciseData) {
      if (e.loggedSets.length === 0) continue;
      const prs = detectPRs(e.history, e.loggedSets);
      prs.forEach((p) => prLines.push(`${e.exercise.name}: ${p.label}`));
    }

    Alert.alert(
      prLines.length ? '🎉 New Personal Records!' : 'Workout Saved',
      prLines.length ? prLines.join('\n') : 'Great work — see you next time.',
      [{ text: 'Done', onPress: () => navigation.navigate('Home') }]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
      <View style={styles.tabsRow}>
        {exerciseData.map((e, i) => (
          <Pill
            key={e.exercise.id}
            label={e.exercise.name}
            tone={i === activeIndex ? 'accent' : e.loggedSets.length ? 'gold' : 'default'}
          />
        ))}
      </View>

      <Text style={styles.exerciseTitle}>{activeEx.exercise.emoji} {activeEx.exercise.name}</Text>

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={styles.cardHeading}>Last Session</Text>
        {activeEx.history[0] ? (
          activeEx.history[0].sets.map((s, i) => (
            <Text key={i} style={styles.historyLine}>{s.weight}kg × {s.reps}</Text>
          ))
        ) : (
          <Text style={styles.historyLine}>No previous data</Text>
        )}
        <Text style={[styles.cardHeading, { marginTop: spacing.sm }]}>Suggested</Text>
        <Text style={[styles.historyLine, { color: colors.accent, fontWeight: '800' }]}>
          {activeEx.suggestion.weight ? `${activeEx.suggestion.weight}kg × ${activeEx.suggestion.reps}` : '—'}
        </Text>
        <Text style={styles.noteText}>{activeEx.suggestion.note}</Text>
      </Card>

      <Card>
        <Text style={styles.cardHeading}>Set {activeEx.loggedSets.length + 1}</Text>
        <IconStepper
          label="Weight"
          value={current.weight}
          unit="kg"
          onIncrement={() => setCurrent((c) => ({ ...c, weight: round(c.weight + 2.5) }))}
          onDecrement={() => setCurrent((c) => ({ ...c, weight: round(Math.max(0, c.weight - 2.5)) }))}
        />
        <IconStepper
          label="Reps"
          value={current.reps}
          unit="reps"
          onIncrement={() => setCurrent((c) => ({ ...c, reps: c.reps + 1 }))}
          onDecrement={() => setCurrent((c) => ({ ...c, reps: Math.max(0, c.reps - 1) }))}
        />
        <PrimaryButton title="Done — Log Set" onPress={logSet} style={{ marginTop: spacing.sm }} />
      </Card>

      {activeEx.loggedSets.length > 0 && (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.cardHeading}>Logged This Workout</Text>
          {activeEx.loggedSets.map((s, i) => (
            <Text key={i} style={styles.historyLine}>Set {i + 1}: {s.weight}kg × {s.reps}</Text>
          ))}
        </Card>
      )}

      <PrimaryButton
        title={activeIndex < exerciseData.length - 1 ? 'Next Exercise' : 'Finish Workout'}
        style={{ marginTop: spacing.lg, backgroundColor: activeIndex < exerciseData.length - 1 ? colors.cardAlt : colors.accent }}
        onPress={nextExercise}
      />
    </ScrollView>
  );
}

function round(n) {
  return Math.round(n * 4) / 4;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  exerciseTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: spacing.md },
  cardHeading: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.xs },
  historyLine: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  noteText: { color: colors.muted, fontSize: 12, marginTop: spacing.xs, fontStyle: 'italic' },
});
