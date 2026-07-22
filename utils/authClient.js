import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

// Deferred require so a missing native module doesn't crash app startup —
// same defensive pattern we used for expo-web-browser earlier. Auth is a
// non-critical feature: the app must still boot without it.
let WebBrowser = null;
try {
  WebBrowser = require('expo-web-browser');
  WebBrowser.maybeCompleteAuthSession();
} catch (e) {
  console.warn('expo-web-browser unavailable:', e?.message);
}

const extra = Constants.expoConfig?.extra || {};
const SUPABASE_URL = extra.supabaseUrl || null;
const SUPABASE_KEY = extra.supabasePublishableKey || null;

let _client = null;
export function getSupabase() {
  if (_client) return _client;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // On web we WANT supabase-js to pick up ?code=... from window.location
      // automatically after the OAuth redirect lands on /auth-callback. On
      // native there's no window.location so we handle the code manually
      // inside signInWithGoogle().
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  });
  return _client;
}

export function isAuthConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

// ─── Session helpers ──────────────────────────────────────────────────────
export async function getCurrentSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data?.session || null;
}

export async function getCurrentUser() {
  const s = await getCurrentSession();
  return s?.user || null;
}

// Subscribe to sign-in / sign-out / token-refresh events.
// Returns unsubscribe function.
export function onAuthChange(cb) {
  const sb = getSupabase();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data?.subscription?.unsubscribe();
}

// ─── Google OAuth via Supabase ────────────────────────────────────────────
// Flow: ask Supabase for a Google auth URL that redirects to us on completion,
// pop a browser tab, wait for the redirect back to our scheme, then exchange
// the returned code for a session. Supabase handles the client_secret and the
// Google callback server-side, so no secrets touch the device.
export async function signInWithGoogle() {
  const sb = getSupabase();
  if (!sb) throw new Error('Auth not configured');

  const redirectUrl = Linking.createURL('auth-callback');

  if (Platform.OS === 'web') {
    // Full-page redirect on web. When the browser comes back to
    // /auth-callback?code=... supabase-js (detectSessionInUrl:true) parses
    // the code, exchanges it, and stores the session — all before Splash
    // decides where to route. No popup, no cross-tab plumbing.
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    });
    if (error) throw error;
    if (typeof window !== 'undefined' && data?.url) {
      window.location.href = data.url;
    }
    // Redirect happens; return null so caller stops (no session yet).
    return null;
  }

  if (!WebBrowser) throw new Error('Browser module missing');

  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
  if (result.type !== 'success') throw new Error('Sign-in cancelled');

  // Supabase (PKCE) returns ?code=... in query; older implicit flow puts
  // access_token in the fragment. Handle both.
  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  if (code) {
    const { error: exErr } = await sb.auth.exchangeCodeForSession(code);
    if (exErr) throw exErr;
    return (await sb.auth.getSession()).data.session;
  }
  const hash = new URLSearchParams((url.hash || '').replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error: setErr } = await sb.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (setErr) throw setErr;
    return (await sb.auth.getSession()).data.session;
  }
  throw new Error('No session in redirect');
}

// ─── Email + password ─────────────────────────────────────────────────────
export async function signInWithEmail(email, password) {
  const sb = getSupabase();
  if (!sb) throw new Error('Auth not configured');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUpWithEmail(email, password) {
  const sb = getSupabase();
  if (!sb) throw new Error('Auth not configured');
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data.session; // null if email-confirm is on and user must verify first
}

// ─── Anonymous ────────────────────────────────────────────────────────────
export async function signInAnonymously() {
  const sb = getSupabase();
  if (!sb) throw new Error('Auth not configured');
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

// ─── Sign out ─────────────────────────────────────────────────────────────
export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}
