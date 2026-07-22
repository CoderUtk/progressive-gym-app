import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppLogo from '../components/AppLogo';
import { colors } from '../utils/theme';
import { hasChosenAuth, getProfile, getStoredCustomExercises } from '../utils/storage';
import { getCurrentSession, getSupabase } from '../utils/authClient';
import { setCustomExercisesInMemory } from '../data/exercises';

// If we came back from Google → Supabase carrying a ?code=... param, make
// sure the session is fully exchanged before we look it up. supabase-js
// does this automatically with detectSessionInUrl:true, but doing it here
// too — and stripping the URL — guarantees a stable state before routing.
async function handleWebAuthCallback() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return;
  try {
    const sb = getSupabase();
    if (sb) await sb.auth.exchangeCodeForSession(code);
  } catch (e) {
    // supabase-js may have already exchanged it via detectSessionInUrl —
    // a duplicate exchange returns 'invalid grant', which is fine here.
    console.warn('Code exchange skipped:', e?.message);
  }
  // Clean the URL so a page reload doesn't retry the exchange.
  try { window.history.replaceState({}, '', '/'); } catch (_) {}
}

// Landing screen shown on every cold start. Runs the logo intro animation
// while asynchronously deciding the next route:
//   profile filled          → Home
//   auth chosen (or session) → Welcome (profile setup)
//   neither                  → SignIn
// A minimum on-screen time keeps the animation from flashing past before
// the user can register it — decision usually finishes in <100ms, animation
// runs ~1200ms.
const MIN_VISIBLE_MS = 1200;

export default function SplashScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    async function decide() {
      await handleWebAuthCallback();
      const [profile, chosen, session, customs] = await Promise.all([
        getProfile(),
        hasChosenAuth(),
        getCurrentSession(),
        getStoredCustomExercises(),
      ]);
      // Populate the in-memory custom exercise list before routing so screens
      // that use searchExercises() see them from first render.
      setCustomExercisesInMemory(customs);
      let target = 'SignIn';
      if (profile?.name) target = 'Home';
      else if (chosen || session) target = 'Welcome';

      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      setTimeout(() => {
        if (cancelled) return;
        navigation.reset({ index: 0, routes: [{ name: target }] });
      }, wait);
    }
    decide();
    return () => { cancelled = true; };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <AppLogo size={80} showName animated />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
