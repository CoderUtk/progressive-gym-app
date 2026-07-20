import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { PrimaryButton } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { getProfile } from '../utils/storage';

export default function ProfileSummaryScreen({ navigation }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <View style={styles.logoGlow} />
          <Image source={require('../assets/icon.png')} style={styles.logo} />
        </View>
        <Text style={styles.title}>You're all set, {profile?.name || 'there'}!</Text>
        <Text style={styles.subtitle}>Here's what we've got so far.</Text>

        <View style={styles.card}>
          <Row label="Name" value={profile?.name || '—'} />
          <Row label="Age" value={profile?.age ? `${profile.age}` : 'Not set'} />
          <Row label="Weight" value={profile?.weight ? `${profile.weight}kg` : 'Not set'} />
          <Row label="Level" value="New" last />
        </View>

        <Text style={styles.hint}>
          You can update any of this later from your Profile tab, and pick a
          workout whenever you're ready from the Dashboard.
        </Text>

        <PrimaryButton title="Go to Dashboard" onPress={() => navigation.replace('Home')} />
      </View>
    </View>
  );
}

function Row({ label, value, last }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center' },
  content: { padding: spacing.lg },
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, height: 96 },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(62, 224, 158, 0.2)',
  },
  logo: { width: 64, height: 64, borderRadius: 16 },
  checkmark: { fontSize: 40, textAlign: 'center', marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 18 },
  button: { backgroundColor: colors.accent, paddingVertical: spacing.md, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: colors.bg, fontWeight: '800', fontSize: 15 },
});
