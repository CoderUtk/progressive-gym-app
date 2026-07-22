import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { PrimaryButton } from './UI';
import { colors, spacing } from '../utils/theme';
import { updateProfile } from '../utils/storage';

// Edit name / age / weight. Same validation rules as the initial WelcomeScreen
// form so the profile can't be regressed into an invalid state via edit.
export default function EditProfileModal({ visible, profile, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync form state from the profile every time the modal opens — otherwise
  // stale edits from a previous open would pre-fill the fields.
  useEffect(() => {
    if (!visible) return;
    setName(profile?.name || '');
    setAge(profile?.age ? String(profile.age) : '');
    setWeight(profile?.weight ? String(profile.weight) : '');
    setSaving(false);
  }, [visible, profile]);

  const isNameValid = name.trim().length > 0;
  const isAgeValid = age.length > 0 && Number(age) > 0;
  const isWeightValid = /^\d+(\.\d+)?$/.test(weight) && Number(weight) > 0;
  const canSave = isNameValid && isAgeValid && isWeightValid;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const next = await updateProfile({
        name: name.trim(),
        age: Number(age),
        weight: Number(weight),
      });
      onSaved?.(next);
      onClose?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.card}>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Body weight is used for strength tier calculations.</Text>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Name</Text>
            <TextInput
              placeholder="Alex"
              placeholderTextColor={colors.mutedDim}
              value={name}
              onChangeText={(t) => setName(t.replace(/[0-9]/g, ''))}
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Age</Text>
            <TextInput
              placeholder="28"
              placeholderTextColor={colors.mutedDim}
              value={age}
              onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              style={styles.input}
            />

            <Text style={styles.label}>Body Weight (kg)</Text>
            <TextInput
              placeholder="75"
              placeholderTextColor={colors.mutedDim}
              value={weight}
              onChangeText={(t) => {
                // Digits + one decimal only
                const cleaned = t.replace(/[^0-9.]/g, '');
                const parts = cleaned.split('.');
                setWeight(parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned);
              }}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </ScrollView>

          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <PrimaryButton
              title={saving ? 'Saving…' : 'Save'}
              onPress={handleSave}
              disabled={!canSave || saving}
            />
            <Pressable onPress={onClose} style={styles.cancelBtn}>
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
    maxHeight: '85%',
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
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
});
