import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_FILENAME = 'progressive-backup.json';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

// Everything this app stores locally, bundled into one portable snapshot.
async function collectAllData() {
  const keys = await AsyncStorage.getAllKeys();
  const appKeys = keys.filter((k) => k.startsWith('progressive:'));
  const entries = await AsyncStorage.multiGet(appKeys);
  return Object.fromEntries(entries);
}

async function restoreAllData(data) {
  const entries = Object.entries(data).filter(([k]) => k.startsWith('progressive:'));
  await AsyncStorage.multiSet(entries);
}

async function findBackupFileId(accessToken) {
  const query = encodeURIComponent(`name='${SYNC_FILENAME}' and 'appDataFolder' in parents`);
  const res = await fetch(`${DRIVE_FILES_URL}?spaces=appDataFolder&q=${query}&fields=files(id,modifiedTime)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Drive lookup failed');
  const json = await res.json();
  return json.files?.[0] || null;
}

// Uploads current local data to the user's own private Drive appDataFolder
// (not visible in their regular Drive UI, not accessible to Anthropic or
// anyone else — only this app, using their Google account).
export async function backupToGoogleDrive(accessToken) {
  const data = await collectAllData();
  const existing = await findBackupFileId(accessToken);
  const body = JSON.stringify(data);

  const metadata = existing
    ? { name: SYNC_FILENAME }
    : { name: SYNC_FILENAME, parents: ['appDataFolder'] };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([body], { type: 'application/json' }));

  const url = existing
    ? `${DRIVE_UPLOAD_URL}/${existing.id}?uploadType=multipart`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart`;
  const method = existing ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) throw new Error('Drive backup failed');
  return res.json();
}

// Pulls the latest snapshot down from Drive and restores it locally —
// used when signing in on a new device.
export async function restoreFromGoogleDrive(accessToken) {
  const existing = await findBackupFileId(accessToken);
  if (!existing) return false;

  const res = await fetch(`${DRIVE_FILES_URL}/${existing.id}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Drive restore failed');
  const data = await res.json();
  await restoreAllData(data);
  return true;
}
