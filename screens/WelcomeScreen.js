import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PrimaryButton } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { saveProfile, setHasSeenOnboarding } from '../utils/storage';

// Browsers (via react-native-web) tint autofilled inputs with their own
// yellow background, which clashes with the dark theme. This forces the
// autofill highlight to match the input's own background instead.
const autofillFix = Platform.OS === 'web'
  ? {
      WebkitBoxShadow: `0 0 0px 1000px ${colors.bg} inset`,
      WebkitTextFillColor: colors.text,
      caretColor: colors.text,
    }
  : {};

function isValidWeight(text) {
  return /^\d+(\.\d+)?$/.test(text);
}

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);

  function handleAgeChange(text) {
    setAge(text.replace(/[^0-9]/g, ''));
  }

  function handleWeightChange(text) {
    // Allow digits and a single decimal point (e.g. 72.5kg), nothing else.
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    setWeight(parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned);
  }

  const isNameValid = name.trim().length > 0;
  const isAgeValid = age.length > 0 && Number(age) > 0;
  const isWeightValid = weight.length > 0 && isValidWeight(weight) && Number(weight) > 0;
  const canContinue = isNameValid && isAgeValid && isWeightValid;

  async function handleContinue() {
    if (!canContinue) return;
    setLoading(true);
    await saveProfile({
      name: name.trim(),
      age: Number(age),
      weight: Number(weight),
    });
    await setHasSeenOnboarding(true);
    setLoading(false);
    navigation.replace('ProfileSummary');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome to Progressive</Text>
        <Text style={styles.subtitle}>Set up your profile and pick a workout plan for today.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={[styles.input, autofillFix]}
            value={name}
            onChangeText={setName}
            placeholder="Alex"
            placeholderTextColor={colors.muted}
            autoComplete="off"
            autoCorrect={false}
            importantForAutofill="no"
          />

          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={[styles.input, autofillFix]}
            value={age}
            onChangeText={handleAgeChange}
            keyboardType="number-pad"
            placeholder="28"
            placeholderTextColor={colors.muted}
            autoComplete="off"
            importantForAutofill="no"
          />

          <Text style={styles.label}>Weight (kg) *</Text>
          <TextInput
            style={[styles.input, autofillFix]}
            value={weight}
            onChangeText={handleWeightChange}
            keyboardType="decimal-pad"
            placeholder="75"
            placeholderTextColor={colors.muted}
            autoComplete="off"
            importantForAutofill="no"
          />

          <Text style={styles.requiredHint}>All fields are required.</Text>

          <PrimaryButton
            title={loading ? 'Saving...' : 'Continue'}
            onPress={handleContinue}
            disabled={!canContinue || loading}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', marginBottom: spacing.xs },
  subtitle: { color: colors.muted, fontSize: 15, marginBottom: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: spacing.xs },
  input: { backgroundColor: colors.bg, color: colors.text, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  requiredHint: { color: colors.mutedDim, fontSize: 11, marginBottom: spacing.sm },
});
