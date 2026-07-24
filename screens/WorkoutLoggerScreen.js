import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert, Linking, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Card, PrimaryButton, IconStepper, Pill } from '../components/UI';
import MuscleIcon from '../components/MuscleIcon';
import PRModal from '../components/PRModal';
import ShareCardModal from '../components/ShareCardModal';
import SessionEffortModal from '../components/SessionEffortModal';
import CardioCard from '../components/CardioCard';
import { getProfile } from '../utils/storage';
import { useWorkoutSession, formatElapsed } from '../utils/workoutSession';
import { colors, spacing } from '../utils/theme';
import { getExerciseById, EXERCISES, TRACKING } from '../data/exercises';
import { defaultCurrentFor, commitSet, formatSet, formatDuration } from '../utils/setSchema';
import {
  getActiveTemplateId,
  getTemplates,
  getWorkoutsForExercise,
  saveWorkout,
  getWeightUnit,
  getPlateIncrement,
  getExerciseNotes,
  setExerciseNote,
} from '../utils/storage';
import { suggestNextTarget, detectPRs, roundToIncrement } from '../utils/progressiveOverload';
import { displayWeight, formatWeight, lbToKg } from '../utils/units';
import { stepForEquipment } from '../utils/increments';

const SET_TYPES = [
  { key: 'W', label: 'Warmup', color: colors.mutedDim },
  { key: 'N', label: 'Working', color: colors.accent },
  { key: 'D', label: 'Drop', color: colors.gold },
];

function openVideoGuide(exerciseName) {
  const q = encodeURIComponent(`${exerciseName} proper form`);
  const url = `https://www.youtube.com/results?search_query=${q}`;
  Linking.openURL(url).catch(() => Alert.alert('Video', 'Could not open YouTube.'));
}

const DEFAULT_WEIGHT_KG = 20;

function toKg(value, unit) {
  return unit === 'lb' ? lbToKg(value) : value;
}

export default function WorkoutLoggerScreen({ route, navigation }) {
  const initialTemplate = route?.params?.template;
  const [template, setTemplate] = useState(initialTemplate);
  const [exerciseData, setExerciseData] = useState([]); // per exercise: {exercise, history, suggestion, loggedSets (kg)}
  const [current, setCurrent] = useState({ weight: DEFAULT_WEIGHT_KG, reps: 8, type: 'N' }); // weight is in DISPLAY unit
  const [activeIndex, setActiveIndex] = useState(0);
  const [sessionKey, setSessionKey] = useState(null);
  const [unit, setUnit] = useState('kg');
  const [plateIncrement, setPlateIncrementState] = useState(2.5);
  const [resultModal, setResultModal] = useState({ visible: false, isPR: false, lines: [] });
  const [notes, setNotes] = useState({});
  const [noteEditors, setNoteEditors] = useState({}); // exerciseId -> local edit text
  const [share, setShare] = useState({ visible: false, session: null, prCount: 0, topPR: null });
  const [profileForShare, setProfileForShare] = useState(null);
  const [effortModal, setEffortModal] = useState({ visible: false, pending: null });
  const workoutSession = useWorkoutSession();

  async function buildExerciseData(ids, increment) {
    const data = [];
    for (const id of ids) {
      const exercise = getExerciseById(id);
      if (!exercise) continue;
      const step = stepForEquipment(exercise.equipment, increment);
      const history = await getWorkoutsForExercise(id);
      const suggestion = suggestNextTarget(history, 8, step);
      data.push({ exercise, history, suggestion, loggedSets: [] });
    }
    return data;
  }

  useEffect(() => {
    (async () => {
      const [weightUnit, increment, storedNotes] = await Promise.all([
        getWeightUnit(),
        getPlateIncrement(),
        getExerciseNotes(),
      ]);
      setUnit(weightUnit);
      setPlateIncrementState(increment);
      setNotes(storedNotes);

      let selectedTemplate = initialTemplate;
      if (!selectedTemplate) {
        const activeId = await getActiveTemplateId();
        const allTemplates = await getTemplates();
        selectedTemplate = allTemplates.find((item) => item.id === activeId) || allTemplates[0];
      }

      if (!selectedTemplate) {
        setExerciseData([]);
        return;
      }

      setTemplate(selectedTemplate);
      const data = await buildExerciseData(selectedTemplate.exerciseIds, increment);
      setExerciseData(data);
      setActiveIndex(0);
      setSessionKey(`${Date.now()}-${selectedTemplate.id}`);
      // Only start a fresh session clock if there isn't already one running —
      // returning to the logger via the pill should NOT reset the timer.
      if (!workoutSession.active) {
        workoutSession.start(selectedTemplate);
      }
      getProfile().then(setProfileForShare);
      const firstWeightKg = data[0]?.suggestion?.weight ?? DEFAULT_WEIGHT_KG;
      if (data[0]) setCurrent(defaultCurrentFor(data[0].exercise, data[0].suggestion, weightUnit));
    })();
  }, [initialTemplate]);

  function swapExercise() {
    if (!activeEx) return;
    const currentIds = exerciseData.map((e) => e.exercise.id);
    navigation.navigate('ExercisePicker', {
      title: 'Swap Exercise',
      mode: 'single',
      preferMuscle: activeEx.exercise.muscle,
      excludeIds: currentIds.filter((id) => id !== activeEx.exercise.id),
      onPick: async (newId) => {
        if (!newId || newId === activeEx.exercise.id) return;
        const [replacement] = await buildExerciseData([newId], plateIncrement);
        if (!replacement) return;
        setExerciseData((prev) => {
          const copy = [...prev];
          copy[activeIndex] = replacement;
          return copy;
        });
        setCurrent(defaultCurrentFor(replacement.exercise, replacement.suggestion, unit));
      },
    });
  }

  async function saveNote(exerciseId, value) {
    const updated = await setExerciseNote(exerciseId, value);
    setNotes(updated);
    setNoteEditors((prev) => {
      const copy = { ...prev };
      delete copy[exerciseId];
      return copy;
    });
  }

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
        const added = await buildExerciseData(addedIds, plateIncrement);
        const next = [...kept, ...added];
        setExerciseData(next);
        setActiveIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)));
        if (next.length) {
          const active = next[Math.min(activeIndex, next.length - 1)];
          setCurrent(defaultCurrentFor(active.exercise, active.suggestion, unit));
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

  if (!template || exerciseData.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Loading…</Text>
      </View>
    );
  }

  const activeEx = exerciseData[activeIndex];
  const step = stepForEquipment(activeEx.exercise.equipment, plateIncrement);
  const totalLoggedSets = exerciseData.reduce((n, e) => n + e.loggedSets.length, 0);

  function logSet() {
    const stored = commitSet(activeEx.exercise, current, {
      toKg: (v) => toKg(v, unit),
      roundIncrement: (kg) => roundToIncrement(kg, step),
    });
    setExerciseData((prev) => {
      const copy = [...prev];
      copy[activeIndex] = {
        ...copy[activeIndex],
        loggedSets: [...copy[activeIndex].loggedSets, stored],
      };
      return copy;
    });
  }

  function cycleSetType() {
    setCurrent((c) => {
      const idx = SET_TYPES.findIndex((t) => t.key === c.type);
      const next = SET_TYPES[(idx + 1) % SET_TYPES.length];
      return { ...c, type: next.key };
    });
  }

  function nextExercise() {
    if (activeIndex < exerciseData.length - 1) {
      const nextIdx = activeIndex + 1;
      setActiveIndex(nextIdx);
      const next = exerciseData[nextIdx];
      setCurrent(defaultCurrentFor(next.exercise, next.suggestion, unit));
    } else {
      finishWorkout();
    }
  }

  function finishWorkout() {
    const exercises = exerciseData
      .filter((e) => e.loggedSets.length > 0)
      .map((e) => ({ exerciseId: e.exercise.id, sets: e.loggedSets }));

    if (exercises.length === 0) {
      Alert.alert('No sets logged', 'Log at least one set before finishing.');
      return;
    }

    // Pause the timer while the RPE prompt is up; if the user backs out we'll
    // resume where they were.
    const wasPaused = workoutSession.paused;
    if (workoutSession.active && !wasPaused) workoutSession.pause();
    setEffortModal({ visible: true, pending: { exercises, wasPaused } });
  }

  // Finish before reaching the last exercise — e.g. ran out of time or the
  // rack was taken. Only whole exercises with at least one logged set are
  // saved (finishWorkout already filters), so partial sessions record fine.
  // Confirm first, because the effort modal that follows commits on any choice.
  function finishEarly() {
    const done = exerciseData.filter((e) => e.loggedSets.length > 0).length;
    const total = exerciseData.length;
    const msg = `Finish now with ${done} of ${total} exercises logged? Exercises with no sets won't be saved.`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(msg)) finishWorkout();
      return;
    }
    Alert.alert('Finish workout early?', msg, [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Finish', onPress: finishWorkout },
    ]);
  }

  async function persistSession(effortValue) {
    const pending = effortModal.pending;
    if (!pending) return;
    setEffortModal({ visible: false, pending: null });

    const durationMs = workoutSession.active ? workoutSession.finish() : null;
    const session = {
      id: uuidv4(),
      date: new Date().toISOString(),
      name: template.name,
      exercises: pending.exercises,
      durationMs,
      durationSeconds: durationMs != null ? Math.round(durationMs / 1000) : null,
      sRPE: effortValue ?? null,
    };
    await saveWorkout(session);

    const prLines = [];
    let topPRRef = null;
    for (const e of exerciseData) {
      if (e.loggedSets.length === 0) continue;
      const trackingType = e.exercise.tracking_type || TRACKING.WEIGHT_REPS;
      const prs = detectPRs(e.history, e.loggedSets, trackingType);
      prs.forEach((p) => {
        prLines.push(`${e.exercise.name}: ${p.label}`);
        if (!topPRRef && p.type === 'weight') {
          const top = e.loggedSets.reduce((a, b) => ((b.weight || 0) > (a.weight || 0) ? b : a), e.loggedSets[0]);
          topPRRef = { name: e.exercise.name.toUpperCase(), value: `${formatWeight(top.weight, unit)} × ${top.reps}` };
        }
      });
    }

    setShare({ visible: false, session, prCount: prLines.length, topPR: topPRRef });
    setResultModal({ visible: true, isPR: prLines.length > 0, lines: prLines });
  }

  function cancelEffort() {
    // Resume timer if we auto-paused it for the prompt.
    if (effortModal.pending && !effortModal.pending.wasPaused && workoutSession.active && workoutSession.paused) {
      workoutSession.resume();
    }
    setEffortModal({ visible: false, pending: null });
  }

  function openShare() {
    setResultModal({ visible: false, isPR: false, lines: [] });
    setShare((s) => ({ ...s, visible: true }));
  }

  function closeResultModal() {
    setResultModal({ visible: false, isPR: false, lines: [] });
    navigation.navigate('Home');
  }

  function closeShare() {
    setShare({ visible: false, session: null, prCount: 0, topPR: null });
    navigation.navigate('Home');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
      {workoutSession.active && (
        <View style={styles.timerCard}>
          <View style={styles.timerLeft}>
            <Text style={styles.timerLabel}>
              {workoutSession.paused ? 'PAUSED' : 'ELAPSED'}
            </Text>
            <Text style={styles.timerValue}>{formatElapsed(workoutSession.elapsedSeconds)}</Text>
          </View>
          <Pressable
            style={styles.timerBtn}
            onPress={workoutSession.paused ? workoutSession.resume : workoutSession.pause}
            hitSlop={8}
          >
            <Feather name={workoutSession.paused ? 'play' : 'pause'} size={14} color={colors.accent} />
            <Text style={styles.timerBtnText}>{workoutSession.paused ? 'Resume' : 'Pause'}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.tabsRow}>
        {exerciseData.map((e, i) => (
          <Pressable key={e.exercise.id} onPress={() => setActiveIndex(i)}>
            <Pill
              label={e.exercise.name}
              tone={i === activeIndex ? 'accent' : e.loggedSets.length ? 'gold' : 'default'}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.exerciseTitleRow}>
        <View style={styles.exerciseTitleLeft}>
          <MuscleIcon equipment={activeEx.exercise.equipment} size={24} />
          <Text style={styles.exerciseTitle} numberOfLines={2}>{activeEx.exercise.name}</Text>
        </View>
        <View style={styles.exerciseTitleActions}>
          <Pressable
            onPress={() => openVideoGuide(activeEx.exercise.name)}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Feather name="play-circle" size={16} color={colors.accent} />
            <Text style={styles.iconBtnText}>Video</Text>
          </Pressable>
          <Pressable onPress={swapExercise} style={styles.iconBtn} hitSlop={8}>
            <Feather name="repeat" size={14} color={colors.text} />
            <Text style={[styles.iconBtnText, { color: colors.text }]}>Swap</Text>
          </Pressable>
        </View>
      </View>

      <SetupNoteField
        exerciseId={activeEx.exercise.id}
        savedNote={notes[activeEx.exercise.id]}
        draft={noteEditors[activeEx.exercise.id]}
        setDraft={(v) => setNoteEditors((prev) => ({ ...prev, [activeEx.exercise.id]: v }))}
        onSave={(v) => saveNote(activeEx.exercise.id, v)}
      />

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={styles.cardHeading}>Last Session</Text>
        {activeEx.history[0] ? (
          activeEx.history[0].sets.map((s, i) => (
            <Text key={i} style={styles.historyLine}>{formatSet(activeEx.exercise, s, unit)}</Text>
          ))
        ) : (
          <Text style={styles.historyLine}>No previous data</Text>
        )}
        {activeEx.exercise.tracking_type === TRACKING.WEIGHT_REPS && (
          <>
            <Text style={[styles.cardHeading, { marginTop: spacing.sm }]}>Suggested</Text>
            <Text style={[styles.historyLine, { color: colors.accent, fontWeight: '800' }]}>
              {activeEx.suggestion.weight != null ? `${formatWeight(activeEx.suggestion.weight, unit)} × ${activeEx.suggestion.reps}` : '—'}
            </Text>
            <Text style={styles.noteText}>{activeEx.suggestion.note}</Text>
          </>
        )}
      </Card>

      <Card>
        <View style={styles.setHeaderRow}>
          <Text style={styles.cardHeading}>Set {activeEx.loggedSets.length + 1}</Text>
          {activeEx.exercise.tracking_type !== TRACKING.CARDIO && (
            <Pressable onPress={cycleSetType} style={styles.typeToggle} hitSlop={6}>
              {SET_TYPES.map((t) => (
                <View
                  key={t.key}
                  style={[
                    styles.typeChip,
                    current.type === t.key && { backgroundColor: t.color, borderColor: t.color },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      current.type === t.key && { color: colors.ctaText },
                    ]}
                  >
                    {t.key}
                  </Text>
                </View>
              ))}
            </Pressable>
          )}
        </View>

        <ActiveSetForm
          exercise={activeEx.exercise}
          current={current}
          setCurrent={setCurrent}
          unit={unit}
          step={step}
          sessionElapsedSec={workoutSession.active ? workoutSession.elapsedSeconds : 0}
        />

        {activeEx.exercise.tracking_type === TRACKING.WEIGHT_REPS && (
          <Text style={styles.stepHint}>Step: {step}{unit} for {activeEx.exercise.equipment.toLowerCase()} — or tap the number to type an exact value.</Text>
        )}
        <PrimaryButton title="Done — Log Set" onPress={logSet} style={{ marginTop: spacing.sm }} />
      </Card>

      {activeEx.loggedSets.length > 0 && (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.cardHeading}>Logged This Workout</Text>
          {activeEx.loggedSets.map((s, i) => {
            const type = SET_TYPES.find((t) => t.key === (s.type || 'N'));
            return (
              <View key={i} style={styles.loggedRow}>
                <View style={[styles.loggedTypeBadge, { borderColor: type.color }]}>
                  <Text style={[styles.loggedTypeBadgeText, { color: type.color }]}>{type.key}</Text>
                </View>
                <Text style={styles.historyLine}>Set {i + 1}: {formatSet(activeEx.exercise, s, unit)}</Text>
              </View>
            );
          })}
        </Card>
      )}

      <PrimaryButton
        title={activeIndex < exerciseData.length - 1 ? 'Next Exercise' : 'Finish Workout'}
        variant="outline"
        style={{ marginTop: spacing.lg }}
        onPress={nextExercise}
      />

      {activeIndex < exerciseData.length - 1 && totalLoggedSets > 0 && (
        <Pressable onPress={finishEarly} style={styles.finishEarlyBtn} hitSlop={6}>
          <Feather name="flag" size={14} color={colors.muted} />
          <Text style={styles.finishEarlyText}>Finish workout early</Text>
        </Pressable>
      )}

      <PRModal
        visible={resultModal.visible}
        isPR={resultModal.isPR}
        lines={resultModal.lines}
        onDone={closeResultModal}
        onShare={share.session ? openShare : null}
      />

      <ShareCardModal
        visible={share.visible}
        onClose={closeShare}
        profile={profileForShare}
        session={share.session}
        unit={unit}
        prCount={share.prCount}
        topPR={share.topPR}
      />

      <SessionEffortModal
        visible={effortModal.visible}
        onSubmit={persistSession}
        onSkip={() => persistSession(null)}
      />
    </ScrollView>
  );
}

// Dispatches on tracking_type to the right set of inputs. Kept co-located
// with the logger screen for now (single caller); if a second surface ever
// needs the same form it can promote to components/.
function ActiveSetForm({ exercise, current, setCurrent, unit, step, sessionElapsedSec }) {
  const type = exercise.tracking_type || TRACKING.WEIGHT_REPS;

  if (type === TRACKING.CARDIO) {
    return <CardioCard current={current} setCurrent={setCurrent} sessionElapsedSec={sessionElapsedSec} />;
  }

  if (type === TRACKING.BODYWEIGHT_REPS) {
    return (
      <>
        <IconStepper
          label="Reps"
          value={current.reps ?? 0}
          unit="reps"
          onIncrement={() => setCurrent((c) => ({ ...c, reps: (c.reps || 0) + 1 }))}
          onDecrement={() => setCurrent((c) => ({ ...c, reps: Math.max(0, (c.reps || 0) - 1) }))}
          onChangeValue={(v) => setCurrent((c) => ({ ...c, reps: Math.max(0, v) }))}
        />
        <IconStepper
          label={`+ Weight (${unit})`}
          value={current.addedWeight ?? 0}
          unit={unit}
          onIncrement={() => setCurrent((c) => ({ ...c, addedWeight: (c.addedWeight || 0) + step }))}
          onDecrement={() => setCurrent((c) => ({ ...c, addedWeight: (c.addedWeight || 0) - step }))}
          onChangeValue={(v) => setCurrent((c) => ({ ...c, addedWeight: v }))}
        />
      </>
    );
  }

  if (type === TRACKING.TIMED_HOLD) {
    const durSec = current.durationSec || 0;
    const mm = Math.floor(durSec / 60);
    const ss = durSec % 60;
    return (
      <>
        <IconStepper
          label="Minutes"
          value={mm}
          unit="min"
          onIncrement={() => setCurrent((c) => ({ ...c, durationSec: (c.durationSec || 0) + 60 }))}
          onDecrement={() => setCurrent((c) => ({ ...c, durationSec: Math.max(0, (c.durationSec || 0) - 60) }))}
          onChangeValue={(v) => setCurrent((c) => ({ ...c, durationSec: Math.max(0, v) * 60 + (c.durationSec % 60 || 0) }))}
        />
        <IconStepper
          label="Seconds"
          value={ss}
          unit="sec"
          onIncrement={() => setCurrent((c) => ({ ...c, durationSec: (c.durationSec || 0) + 5 }))}
          onDecrement={() => setCurrent((c) => ({ ...c, durationSec: Math.max(0, (c.durationSec || 0) - 5) }))}
          onChangeValue={(v) => setCurrent((c) => {
            const clamped = Math.max(0, Math.min(59, v));
            return { ...c, durationSec: Math.floor((c.durationSec || 0) / 60) * 60 + clamped };
          })}
        />
      </>
    );
  }

  // WEIGHT_REPS default
  return (
    <>
      <IconStepper
        label="Weight"
        value={current.weight}
        unit={unit}
        onIncrement={() => setCurrent((c) => ({ ...c, weight: roundToIncrement((c.weight || 0) + step, step) }))}
        onDecrement={() => setCurrent((c) => ({ ...c, weight: roundToIncrement(Math.max(0, (c.weight || 0) - step), step) }))}
        onChangeValue={(v) => setCurrent((c) => ({ ...c, weight: Math.max(0, v) }))}
      />
      <IconStepper
        label="Reps"
        value={current.reps}
        unit="reps"
        onIncrement={() => setCurrent((c) => ({ ...c, reps: (c.reps || 0) + 1 }))}
        onDecrement={() => setCurrent((c) => ({ ...c, reps: Math.max(0, (c.reps || 0) - 1) }))}
        onChangeValue={(v) => setCurrent((c) => ({ ...c, reps: Math.max(0, v) }))}
      />
    </>
  );
}

function SetupNoteField({ exerciseId, savedNote, draft, setDraft, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const hasNote = !!savedNote;
  const showEditor = expanded || draft !== undefined;

  if (!showEditor) {
    return (
      <Pressable
        onPress={() => setExpanded(true)}
        style={styles.notePreview}
      >
        <Feather name={hasNote ? 'edit-3' : 'plus'} size={12} color={colors.muted} />
        <Text style={styles.notePreviewText} numberOfLines={1}>
          {hasNote ? savedNote : 'Add a setup note (seat height, band color…)'}
        </Text>
      </Pressable>
    );
  }

  const value = draft !== undefined ? draft : (savedNote || '');
  return (
    <View style={styles.noteEditorRow}>
      <TextInput
        value={value}
        onChangeText={setDraft}
        placeholder="Seat height 3, green band…"
        placeholderTextColor={colors.mutedDim}
        style={styles.noteInput}
        maxLength={80}
        onSubmitEditing={() => { onSave(value); setExpanded(false); }}
        returnKeyType="done"
        autoFocus
      />
      <Pressable
        onPress={() => { onSave(value); setExpanded(false); }}
        style={styles.noteSaveBtn}
        hitSlop={6}
      >
        <Feather name="check" size={14} color={colors.ctaText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(62,224,158,0.25)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: 32, // clears the persistent pill overlay above
    marginBottom: spacing.md,
  },
  timerLeft: {},
  timerLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  timerValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    marginTop: 2,
  },
  timerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timerBtnText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtnText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  notePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  notePreviewText: { color: colors.muted, fontSize: 12, fontWeight: '600', flex: 1 },
  noteEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  noteInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  noteSaveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  typeToggle: { flexDirection: 'row', gap: 4 },
  typeChip: {
    width: 26,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  loggedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  loggedTypeBadge: {
    width: 22, height: 18, borderRadius: 4, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  loggedTypeBadgeText: { fontSize: 9, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  exerciseTitleLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flex: 1,
    flexBasis: 200,
    minWidth: 0,
  },
  exerciseTitleActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 2,
    flexShrink: 0,
  },
  exerciseTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
    lineHeight: 27,
    flexWrap: 'wrap',
  },
  cardHeading: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.xs },
  historyLine: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  noteText: { color: colors.muted, fontSize: 12, marginTop: spacing.xs, fontStyle: 'italic' },
  stepHint: { color: colors.mutedDim, fontSize: 11, marginTop: spacing.xs },
  finishEarlyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  finishEarlyText: { color: colors.muted, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
