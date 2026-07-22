import React, { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { PrimaryButton } from './UI';
import { colors, spacing, muscleTint } from '../utils/theme';
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, TRACKING, addCustomExerciseInMemory } from '../data/exercises';
import { saveCustomExercise } from '../utils/storage';

// Equipment → tracking-type default. Keeps the form to three questions
// (name, muscle, equipment) while still producing a correctly-typed exercise
// that the workout logger's set schema recognizes.
function trackingForEquipment(eq) {
  if (eq === 'Bodyweight') return TRACKING.BODYWEIGHT_REPS;
  if (['Treadmill', 'Bike', 'Rower', 'Stairmaster', 'Rope'].includes(eq)) return TRACKING.CARDIO;
  return TRACKING.WEIGHT_REPS;
}

function slugify(name) {
  const base = (name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'custom';
  // Suffix with a short timestamp so accidental duplicates don't collide.
  return `custom-${base}-${Date.now().toString(36).slice(-4)}`;
}

export default function AddExerciseModal({ visible, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('Chest');
  const [equipment, setEquipment] = useState('Barbell');
  const [saving, setSaving] = useState(false);

  function reset() {
    setName('');
    setMuscle('Chest');
    setEquipment('Barbell');
    setSaving(false);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const exercise = {
      id: slugify(trimmed),
      name: trimmed,
      muscle,
      secondary: [],
      equipment,
      aliases: [],
      emoji: '💪',
      tracking_type: trackingForEquipment(equipment),
      custom: true,
    };
    try {
      await saveCustomExercise(exercise);
      addCustomExerciseInMemory(exercise);
      reset();
      onCreated?.(exercise);
      onClose?.();
    } catch (e) {
      setSaving(false);
    }
  }

  function handleClose() {
    reset();
    onClose?.();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.card}>
          <Text style={styles.title}>Add Custom Exercise</Text>
          <Text style={styles.subtitle}>
            For anything your gym has that isn't in the library.
          </Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            placeholder="e.g. Kaz Press"
            placeholderTextColor={colors.mutedDim}
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <Text style={styles.label}>Muscle Group</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {MUSCLE_GROUPS.map((m) => {
              const on = m === muscle;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMuscle(m)}
                  style={[
                    styles.chip,
                    on && { borderColor: muscleTint(m), backgroundColor: muscleTint(m) + '22' },
                  ]}
                >
                  <Text style={[styles.chipText, on && { color: muscleTint(m) }]}>{m}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Equipment</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {EQUIPMENT_TYPES.map((eq) => {
              const on = eq === equipment;
              return (
                <Pressable
                  key={eq}
                  onPress={() => setEquipment(eq)}
                  style={[styles.chip, on && styles.chipOnAccent]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOnAccent]}>{eq}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <PrimaryButton
              title={saving ? 'Saving…' : 'Add Exercise'}
              onPress={handleSave}
              disabled={saving || !name.trim()}
            />
            <Pressable onPress={handleClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: spacing.md, lineHeight: 17 },
  label: { color: colors.text, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.sm, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
  chipRow: { gap: spacing.xs, paddingVertical: 4, paddingRight: spacing.md, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipOnAccent: { borderColor: colors.accent, backgroundColor: 'rgba(62,224,158,0.15)' },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chipTextOnAccent: { color: colors.accent },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
});
