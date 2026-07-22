import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase, getCurrentUser } from './authClient';

const TABLE = 'user_data';

// Collects every local progressive:* AsyncStorage entry into one JSON blob.
// The auth session itself is intentionally excluded — Supabase manages that
// separately via its own storage adapter, and syncing a device's session
// tokens to another device would be both useless and a security footgun.
async function collectAllData() {
  const keys = await AsyncStorage.getAllKeys();
  const appKeys = keys.filter(
    (k) =>
      k.startsWith('progressive:') &&
      k !== 'progressive:googleAccount' &&
      !k.startsWith('sb-') // supabase-js writes session under sb-<project>-auth-token
  );
  const entries = await AsyncStorage.multiGet(appKeys);
  return Object.fromEntries(entries);
}

async function restoreAllData(data) {
  if (!data || typeof data !== 'object') return;
  const entries = Object.entries(data).filter(
    ([k]) => k.startsWith('progressive:') && k !== 'progressive:googleAccount'
  );
  if (entries.length === 0) return;
  await AsyncStorage.multiSet(entries);
}

// Upsert the current user's whole snapshot. Row is keyed by user id, so
// re-uploads overwrite in place — no accumulating rows per device.
export async function backupToCloud() {
  const sb = getSupabase();
  if (!sb) throw new Error('Auth not configured');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in');

  const snapshot = await collectAllData();
  const { error } = await sb.from(TABLE).upsert(
    {
      user_id: user.id,
      snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
  return true;
}

// Pulls the user's snapshot down and writes it to local AsyncStorage.
// Returns true if a snapshot existed and was restored, false if no row yet
// (fresh account with nothing backed up), or throws on transport errors.
export async function restoreFromCloud() {
  const sb = getSupabase();
  if (!sb) throw new Error('Auth not configured');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await sb
    .from(TABLE)
    .select('snapshot')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data?.snapshot) return false;
  await restoreAllData(data.snapshot);
  return true;
}

// Fire-and-forget wrapper for auto-sync: coalesced writes shouldn't crash
// the caller if the network's down or the user isn't signed in. Errors
// surface only in console — sync will retry on the next mutation.
let inFlight = null;
export async function backupToCloudSafe() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return; // signed-out state is not an error
      await backupToCloud();
    } catch (e) {
      console.warn('Auto-backup failed:', e?.message);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

// Backwards-compat alias so storage.js's debouncer doesn't need editing.
export const backupToGoogleDriveSafe = backupToCloudSafe;
