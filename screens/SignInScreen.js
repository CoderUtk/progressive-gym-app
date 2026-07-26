import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { PrimaryButton } from '../components/UI';
import AppLogo from '../components/AppLogo';
import { colors, spacing, fonts } from '../utils/theme';
import {
  isAuthConfigured,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signInAnonymously,
} from '../utils/authClient';
import { restoreFromCloud } from '../utils/cloudSync';
import { getProfile, setHasSeenOnboarding, setHasChosenAuth, getStoredCustomExercises } from '../utils/storage';
import { setCustomExercisesInMemory } from '../data/exercises';

export default function SignInScreen() {
  const navigation = useNavigation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const [emailFormOpen, setEmailFormOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');

  const configured = isAuthConfigured();

  // Google "G" mark rendered with SVG so it doesn't depend on any icon
  // font — same look on native and web, no extra assets. Colors are the
  // Google brand palette.
  function GoogleIcon({ size = 18 }) {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </Svg>
    );
  }

  function setStatus(msg, error = false) {
    setMessage(msg);
    setIsError(error);
  }

  // After any successful sign-in (or "continue without account"), figure out
  // where to land: existing profile → straight to the app, no profile yet →
  // profile setup. Restore from cloud first if signed in, so a returning
  // user on a new device skips setup entirely.
  async function routeAfterAuth({ signedIn }) {
    try {
      // Mark the sign-in gate as done, regardless of which path they took.
      // This is what stops the app nagging them with SignIn on every launch.
      await setHasChosenAuth(true);
      if (signedIn) {
        setStatus('Restoring your data…');
        try { await restoreFromCloud(); } catch (e) { /* fine, may be new user */ }
        // If the cloud snapshot contained custom exercises, they landed in
        // AsyncStorage above but not in the in-memory list. Sync it now so
        // the Library screen shows them without a restart.
        try { setCustomExercisesInMemory(await getStoredCustomExercises()); } catch (e) {}
      }
      const profile = await getProfile();
      if (profile?.name) {
        await setHasSeenOnboarding(true);
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      }
    } catch (e) {
      setStatus(e?.message || 'Something went wrong.', true);
    }
  }

  async function withBusy(fn) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  async function handleGoogle() {
    setStatus('Opening Google sign-in…');
    await withBusy(async () => {
      try {
        await signInWithGoogle();
        await routeAfterAuth({ signedIn: true });
      } catch (e) {
        setStatus(e?.message || 'Google sign-in cancelled.', true);
      }
    });
  }

  async function handleEmail() {
    if (!email || !password) return setStatus('Enter email and password.', true);
    setStatus(mode === 'signup' ? 'Creating account…' : 'Signing in…');
    await withBusy(async () => {
      try {
        const session = mode === 'signup'
          ? await signUpWithEmail(email.trim(), password)
          : await signInWithEmail(email.trim(), password);
        if (session) {
          await routeAfterAuth({ signedIn: true });
        } else {
          setStatus('Check your email to confirm the account, then sign in.');
        }
      } catch (e) {
        setStatus(e?.message || 'Email sign-in failed.', true);
      }
    });
  }

  async function handleAnonymous() {
    setStatus('Creating anonymous account…');
    await withBusy(async () => {
      try {
        await signInAnonymously();
        await routeAfterAuth({ signedIn: true });
      } catch (e) {
        setStatus(e?.message || 'Anonymous sign-in failed.', true);
      }
    });
  }

  async function handleSkip() {
    // No cloud account, purely local. Still routes through profile setup so
    // basic stats work. User can sign in later from Settings.
    await routeAfterAuth({ signedIn: false });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <AppLogo size={72} showName animated />
        </View>

        <Text style={styles.blurb}>
          Back up your workouts to the cloud, or skip and use the app offline.
        </Text>

        {message ? (
          <Text style={[styles.status, isError && styles.statusError]}>{message}</Text>
        ) : null}

        {busy ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />
        ) : (
          <View style={styles.actions}>
            {!configured ? (
              <Text style={styles.warningText}>
                Cloud sync isn't configured for this build.
              </Text>
            ) : (
              <>
                <Pressable
                  onPress={handleGoogle}
                  style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.85 }]}
                >
                  <GoogleIcon size={20} />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </Pressable>

                {emailFormOpen ? (
                  <View style={{ gap: spacing.sm }}>
                    <TextInput
                      placeholder="Email"
                      placeholderTextColor={colors.mutedDim}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Password (6+ chars)"
                      placeholderTextColor={colors.mutedDim}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      style={styles.input}
                    />
                    <PrimaryButton
                      title={mode === 'signup' ? 'Create Account' : 'Sign In'}
                      onPress={handleEmail}
                    />
                    <Pressable onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
                      <Text style={styles.linkText}>
                        {mode === 'signup' ? 'Have an account? Sign in' : 'New here? Create account'}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <PrimaryButton title="Continue with Email" variant="secondary" onPress={() => setEmailFormOpen(true)} />
                )}
              </>
            )}

            <Pressable onPress={handleSkip} style={styles.skipRow} hitSlop={12}>
              <Text style={styles.skipText}>Continue without account</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  blurb: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  actions: { gap: spacing.sm },
  status: {
    color: colors.accent,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  statusError: { color: colors.danger },
  warningText: { color: colors.mutedDim, fontFamily: fonts.body, fontSize: 12, textAlign: 'center' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  linkText: { color: colors.accent, fontFamily: fonts.bodySemi, fontSize: 13, textAlign: 'center', paddingVertical: 6 },
  skipRow: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  skipText: { color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 13, textDecorationLine: 'underline' },
  // White Google-branded button — matches the pattern users see on every
  // other app that offers Google sign-in. Recognizable at a glance.
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
  },
  googleBtnText: { color: '#1F1F1F', fontSize: 15, fontWeight: '700' },
});
