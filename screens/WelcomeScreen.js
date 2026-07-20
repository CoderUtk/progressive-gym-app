import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    const trimmedName = name.trim() || 'Guest';
    const parsedAge = Number(age);
    const parsedWeight = Number(weight);
    await saveProfile({
      name: trimmedName,
      age: age && !Number.isNaN(parsedAge) ? parsedAge : null,
      weight: weight && !Number.isNaN(parsedWeight) ? parsedWeight : null,
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
          <Text style={styles.label}>Name</Text>
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

          <Text style={styles.label}>Age</Text>
          <TextInput
            style={[styles.input, autofillFix]}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholder="28"
            placeholderTextColor={colors.muted}
            autoComplete="off"
            importantForAutofill="no"
          />

          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={[styles.input, autofillFix]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="75"
            placeholderTextColor={colors.muted}
            autoComplete="off"
            importantForAutofill="no"
          />

          <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Continue'}</Text>
          </TouchableOpacity>
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
  card: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg },
  label: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: spacing.xs },
  input: { backgroundColor: colors.bg, color: colors.text, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  button: { backgroundColor: colors.accent, paddingVertical: spacing.md, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: colors.bg, fontWeight: '800' },
});
