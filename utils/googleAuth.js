import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { setGoogleAccount, getGoogleAccount, clearGoogleAccount } from './storage';

WebBrowser.maybeCompleteAuthSession();

// Set this in app.json under expo.extra.googleClientId (see README's
// "Google Account Sync" section for how to create one). Without it, sign-in
// cannot proceed — Google requires a real registered OAuth client, which
// only the app owner can create in Google Cloud Console.
const CLIENT_ID = Constants.expoConfig?.extra?.googleClientId || null;

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Drive scope limited to appDataFolder — a private, per-app storage space
// Google Drive gives each app; it doesn't expose or touch the rest of the
// user's Drive.
const SCOPES = ['openid', 'profile', 'https://www.googleapis.com/auth/drive.appdata'];

export function isGoogleSignInConfigured() {
  return Boolean(CLIENT_ID);
}

export function useGoogleAuthRequest() {
  const redirectUri = AuthSession.makeRedirectUri();
  return AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID || 'not-configured',
      scopes: SCOPES,
      redirectUri,
      responseType: 'token',
    },
    discovery
  );
}

export async function fetchGoogleProfile(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Google profile');
  return res.json();
}

export async function signOutGoogle() {
  await clearGoogleAccount();
}

export async function getStoredGoogleAccount() {
  return getGoogleAccount();
}

export async function storeGoogleAccount(account) {
  return setGoogleAccount(account);
}
