import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PrimaryButton } from '../components/UI';
import { colors, spacing, fonts } from '../utils/theme';
import { saveProfile, setHasSeenOnboarding } from '../utils/storage';
import { getCurrentUser } from '../utils/authClient';

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
  const [avatarUri, setAvatarUri] = useState(null);
  const [loading, setLoading] = useState(false);

  // Prefill name (and photo) from the signed-in identity — Google gives us
  // both, so a new user shouldn't have to retype what they just authenticated
  // with. Age and weight aren't in the identity, so they still fill those.
  // Only prefills empty fields, so it never clobbers what the user is typing.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await getCurrentUser();
        const meta = user?.user_metadata || {};
        const googleName = meta.full_name || meta.name || '';
        const googlePhoto = meta.avatar_url || meta.picture || null;
        if (cancelled) return;
        if (googleName) setName((prev) => prev || googleName.replace(/[0-9]/g, ''));
        if (googlePhoto) setAvatarUri((prev) => prev || googlePhoto);
      } catch (e) {
        // No session (anonymous / skip path) — nothing to prefill, no problem.
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
      ...(avatarUri ? { avatarUri } : {}),
    });
    await setHasSeenOnboarding(true);
    setLoading(false);
    navigation.replace('ProfileSummary');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <View style={styles.logoGlow} />
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <Image source={require('../assets/icon.png')} style={styles.logo} />
          )}
        </View>
        <Text style={styles.title}>
          {name ? `Welcome, ${name.split(' ')[0]}` : 'Welcome to Progressive'}
        </Text>
        <Text style={styles.subtitle}>
          {name
            ? 'Just two more things — your age and weight — so we can track volume and milestones accurately.'
            : 'Set up your profile and pick a workout plan for today.'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={[styles.input, autofillFix]}
            value={name}
            onChangeText={(text) => setName(text.replace(/[0-9]/g, ''))}
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
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, height: 96 },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(62, 224, 158, 0.2)',
  },
  logo: { width: 64, height: 64, borderRadius: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: colors.accent },
  title: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 36,
    includeFontPadding: false,
    marginBottom: spacing.xs,
  },
  subtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, marginBottom: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  label: {
    color: colors.mutedDim,
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  input: { backgroundColor: colors.bg, color: colors.text, fontFamily: fonts.body, fontSize: 16, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  requiredHint: { color: colors.mutedDim, fontFamily: fonts.body, fontSize: 11, marginBottom: spacing.sm },
});
