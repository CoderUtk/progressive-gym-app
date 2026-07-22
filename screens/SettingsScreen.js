import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, PrimaryButton } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { getWeightUnit, setWeightUnit, getPlateIncrement, setPlateIncrement, clearAllData } from '../utils/storage';
import { isAuthConfigured, getCurrentSession, onAuthChange, signOut } from '../utils/authClient';
import { backupToCloud } from '../utils/cloudSync';

const PLATE_OPTIONS = [1.25, 2.5, 5];

function accountLabel(user) {
  if (!user) return null;
  if (user.is_anonymous) return 'Anonymous account';
  return user.email || user.user_metadata?.email || 'Signed in';
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [unit, setUnit] = useState('kg');
  const [increment, setIncrement] = useState(2.5);
  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const configured = isAuthConfigured();

  useEffect(() => {
    getWeightUnit().then(setUnit);
    getPlateIncrement().then(setIncrement);
    if (!configured) return;
    getCurrentSession().then(setSession);
    const off = onAuthChange((s) => setSession(s));
    return off;
  }, [configured]);

  function setStatus(msg, error = false) {
    setMessage(msg);
    setIsError(error);
  }

  async function withBusy(fn) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  async function handleBackupNow() {
    setStatus('Backing up…');
    await withBusy(async () => {
      try {
        await backupToCloud();
        setStatus('Backup complete.');
      } catch (e) {
        setStatus(e?.message || 'Backup failed.', true);
      }
    });
  }

  async function handleSignOut() {
    await withBusy(async () => {
      // Force a final backup BEFORE signing out. The auto-backup runs on
      // an 8s debounce, so any recent profile edits (name/age/weight from
      // the Welcome flow) may not have reached the cloud yet — signing out
      // + clearing local data would then lose them on next sign-in.
      setStatus('Backing up before sign-out…');
      try { await backupToCloud(); } catch (e) { /* proceed even if this fails */ }
      try {
        await signOut();
      } catch (e) { /* ignore */ }
      // Wipe local data too — otherwise the next signed-in user (or the
      // same user on another account) would inherit this account's history.
      await clearAllData();
      setSession(null);
      setStatus('');
      navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
    });
  }

  function confirm(title, message, onConfirm) {
    // Alert.alert isn't wired to web on all Expo versions; fall back to
    // window.confirm so the reset flow is usable in browser too.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`${title}\n\n${message}`)) onConfirm();
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset Everything', style: 'destructive', onPress: onConfirm },
    ]);
  }

  async function handleResetAll() {
    confirm(
      'Reset all data?',
      'This wipes every workout, template, profile detail, and custom exercise from this device. If you\'re signed in, your cloud backup remains — signing in again will restore it. Continue?',
      async () => {
        await withBusy(async () => {
          try { await signOut(); } catch (e) { /* ignore */ }
          await clearAllData();
          setSession(null);
          navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
        });
      }
    );
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

      <Text style={styles.sectionLabel}>Danger Zone</Text>
      <Text style={styles.helpText}>
        Wipe this device's local state — workouts, templates, custom
        exercises, profile. If you're signed in, your cloud backup is
        untouched and signing back in restores everything.
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <PrimaryButton title="Reset All Data" variant="secondary" onPress={handleResetAll} />
      </Card>

      <Text style={styles.sectionLabel}>Account</Text>
      <Card>
        {!configured || !session ? (
          <View>
            <Text style={styles.helpText}>
              You're using the app without an account. Data lives only on
              this device.
            </Text>
            <PrimaryButton
              title="Sign In / Create Account"
              onPress={() => navigation.navigate('SignIn')}
            />
          </View>
        ) : (
          <View>
            <Text style={styles.accountName}>{accountLabel(session.user)}</Text>
            <Text style={styles.helpText}>
              Data auto-syncs to your account. Sign out clears this device.
            </Text>
            {message ? (
              <Text style={[styles.status, isError && styles.statusError]}>{message}</Text>
            ) : null}
            {busy ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.sm }} />
            ) : (
              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                <PrimaryButton title="Back Up Now" onPress={handleBackupNow} />
                <PrimaryButton title="Sign Out" variant="secondary" onPress={handleSignOut} />
              </View>
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
  accountName: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: spacing.xs },
  status: { color: colors.accent, fontSize: 12, fontWeight: '600', marginTop: spacing.sm },
  statusError: { color: colors.danger },
});
