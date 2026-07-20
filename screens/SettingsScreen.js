import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Card, PrimaryButton } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { getWeightUnit, setWeightUnit, getPlateIncrement, setPlateIncrement, getGoogleAccount } from '../utils/storage';
import {
  useGoogleAuthRequest,
  isGoogleSignInConfigured,
  fetchGoogleProfile,
  storeGoogleAccount,
  signOutGoogle,
} from '../utils/googleAuth';
import { backupToGoogleDrive, restoreFromGoogleDrive } from '../utils/cloudSync';

const PLATE_OPTIONS = [1.25, 2.5, 5];

export default function SettingsScreen() {
  const [unit, setUnit] = useState('kg');
  const [increment, setIncrement] = useState(2.5);
  const [account, setAccount] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [request, response, promptAsync] = useGoogleAuthRequest();
  const configured = isGoogleSignInConfigured();

  useEffect(() => {
    getWeightUnit().then(setUnit);
    getPlateIncrement().then(setIncrement);
    getGoogleAccount().then(setAccount);
  }, []);

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      handleSignInSuccess(response.authentication.accessToken);
    }
  }, [response]);

  async function handleSignInSuccess(accessToken) {
    setSyncing(true);
    setSyncMessage('Signing in…');
    try {
      const profile = await fetchGoogleProfile(accessToken);
      const acct = { name: profile.name, email: profile.email, picture: profile.picture, accessToken };
      await storeGoogleAccount(acct);
      setAccount(acct);
      setSyncMessage('Checking for existing backup…');
      const restored = await restoreFromGoogleDrive(accessToken);
      setSyncMessage(restored ? 'Restored your data from Google Drive.' : 'Connected. No previous backup found yet.');
    } catch (err) {
      setSyncMessage('Something went wrong connecting to Google.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleBackupNow() {
    if (!account?.accessToken) return;
    setSyncing(true);
    setSyncMessage('Backing up to Google Drive…');
    try {
      await backupToGoogleDrive(account.accessToken);
      setSyncMessage('Backup complete.');
    } catch (err) {
      setSyncMessage('Backup failed — try reconnecting your account.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    await signOutGoogle();
    setAccount(null);
    setSyncMessage('');
  }

  async function chooseUnit(value) {
    setUnit(value);
    await setWeightUnit(value);
  }

  async function chooseIncrement(value) {
    setIncrement(value);
    await setPlateIncrement(value);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={styles.sectionLabel}>Weight Unit</Text>
      <Text style={styles.helpText}>
        Applies everywhere in the app — Dashboard, Workout Logger, Exercise
        History, Profile, and Analytics.
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={styles.unitRow}>
          {['kg', 'lb'].map((value) => (
            <Pressable
              key={value}
              onPress={() => chooseUnit(value)}
              style={[styles.unitOption, unit === value && styles.unitOptionOn]}
            >
              <Text style={[styles.unitOptionText, unit === value && styles.unitOptionTextOn]}>
                {value.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Text style={styles.sectionLabel}>Smallest Plate Increment</Text>
      <Text style={styles.helpText}>
        Used for barbell, machine, and cable steps and suggested targets, so
        they're always loadable. Dumbbells always step by a fixed 2.5kg pair
        jump, and you can always type an exact number if you need to.
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        {PLATE_OPTIONS.map((value) => (
          <Pressable key={value} onPress={() => chooseIncrement(value)} style={styles.optionRow}>
            <Text style={styles.optionLabel}>{value}kg</Text>
            <View style={[styles.radio, increment === value && styles.radioOn]}>
              {increment === value && <View style={styles.radioDot} />}
            </View>
          </Pressable>
        ))}
      </Card>

      <Text style={styles.sectionLabel}>Google Account</Text>
      <Text style={styles.helpText}>
        Connect your Google account to back up your workout data to your own
        private Google Drive storage (not visible in your regular Drive, and
        not accessible to anyone but you and this app).
      </Text>
      <Card>
        {!configured ? (
          <Text style={styles.warningText}>
            Google sign-in isn't configured for this build yet — it needs a
            Google OAuth client ID set up by the app's developer. See the
            README's "Google Account Sync" section for setup steps.
          </Text>
        ) : account ? (
          <View>
            <Text style={styles.accountName}>{account.name}</Text>
            <Text style={styles.accountEmail}>{account.email}</Text>
            {syncMessage ? <Text style={styles.syncMessage}>{syncMessage}</Text> : null}
            {syncing ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.sm }} />
            ) : (
              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                <PrimaryButton title="Back Up Now" onPress={handleBackupNow} />
                <PrimaryButton title="Disconnect" variant="secondary" onPress={handleDisconnect} />
              </View>
            )}
          </View>
        ) : (
          <View>
            {syncMessage ? <Text style={styles.syncMessage}>{syncMessage}</Text> : null}
            {syncing ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <PrimaryButton
                title="Connect Google Account"
                onPress={() => promptAsync()}
                disabled={!request}
              />
            )}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.xs },
  helpText: { color: colors.muted, fontSize: 13, marginBottom: spacing.md, lineHeight: 18 },
  unitRow: { flexDirection: 'row', gap: spacing.sm },
  unitOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  unitOptionOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  unitOptionText: { color: colors.text, fontWeight: '800' },
  unitOptionTextOn: { color: colors.bg },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.accent },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
  warningText: { color: colors.mutedDim, fontSize: 12, lineHeight: 17 },
  accountName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  accountEmail: { color: colors.muted, fontSize: 12, marginTop: 2 },
  syncMessage: { color: colors.accent, fontSize: 12, marginTop: spacing.sm, fontWeight: '600' },
});
