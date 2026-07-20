import React, { useCallback, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Pill } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { getProfile, getWorkouts, getWeightUnit, updateProfile } from '../utils/storage';
import { computeStats, computeLevel, getBadgeStatus } from '../utils/badges';
import { formatWeight, formatVolume } from '../utils/units';
import { estimate1RM, STRENGTH_LIFT_LABELS, computeStrengthTier } from '../utils/strength';

const TIER_TONE = { Elite: 'gold', Advanced: 'accent', Intermediate: 'accent', Novice: 'default' };

// Four minimalist default avatars — deterministic pick per user based on
// their name, so it stays stable across sessions without needing storage.
const DEFAULT_AVATARS = [
  { icon: 'zap', bg: '#1C222C', fg: '#3EE09E' },
  { icon: 'target', bg: '#1C222C', fg: '#3EE09E' },
  { icon: 'award', bg: '#1C222C', fg: '#3EE09E' },
  { icon: 'trending-up', bg: '#1C222C', fg: '#3EE09E' },
];

function pickAvatar(name) {
  const seed = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return DEFAULT_AVATARS[seed % DEFAULT_AVATARS.length];
}

// Two-step: prompt for source, then permission + picker. On simulator/web the
// picker still runs — expo-image-picker uses the browser file input on web.
async function pickAvatarPhoto(profile, setProfile) {
  const proceed = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access in Settings to choose a custom avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const next = await updateProfile({ avatarUri: result.assets[0].uri });
    setProfile(next);
  };

  if (profile?.avatarUri) {
    Alert.alert('Change avatar', 'Pick a new photo or reset to the default icon.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset to default', style: 'destructive', onPress: async () => {
        const next = await updateProfile({ avatarUri: null });
        setProfile(next);
      }},
      { text: 'Choose photo', onPress: proceed },
    ]);
  } else {
    proceed();
  }
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalWorkouts: 0, totalSets: 0, totalWeight: 0, totalPRs: 0 });
  const [unit, setUnit] = useState('kg');
  const [workouts, setWorkouts] = useState([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getProfile(), getWorkouts(), getWeightUnit()]).then(([p, w, weightUnit]) => {
        setProfile(p);
        setWorkouts(w);
        setStats(computeStats(w, p?.weight || 70));
        setUnit(weightUnit);
      });
    }, [])
  );

  const level = computeLevel(stats.totalWorkouts);
  const badges = getBadgeStatus(stats);
  const earnedBadges = badges.filter((b) => b.earned);

  // Best estimated 1RM per lift, from the heaviest-weight set ever logged.
  const bestSetByExercise = {};
  workouts.forEach((w) => {
    w.exercises.forEach((ex) => {
      const topSet = [...ex.sets].sort((a, b) => b.weight - a.weight)[0];
      const current = bestSetByExercise[ex.exerciseId];
      if (!current || topSet.weight > current.weight) {
        bestSetByExercise[ex.exerciseId] = topSet;
      }
    });
  });

  const strengthRows = Object.keys(STRENGTH_LIFT_LABELS).map((exerciseId) => {
    const best = bestSetByExercise[exerciseId];
    const e1RM = best ? estimate1RM(best.weight, best.reps) : null;
    const tier = computeStrengthTier(exerciseId, e1RM, profile?.weight);
    return { exerciseId, label: STRENGTH_LIFT_LABELS[exerciseId], e1RM, tier };
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      <Card style={{ alignItems: 'center', marginBottom: spacing.md }}>
        <View style={styles.avatarWrap}>
          {profile?.avatarUri ? (
            <Image source={{ uri: profile.avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: pickAvatar(profile?.name).bg }]}>
              <Feather name={pickAvatar(profile?.name).icon} size={34} color={pickAvatar(profile?.name).fg} />
            </View>
          )}
          <Pressable onPress={() => pickAvatarPhoto(profile, setProfile)} style={styles.avatarEditBtn}>
            <Feather name="camera" size={12} color={colors.ctaText} />
          </Pressable>
        </View>
        <Text style={styles.name}>{profile?.name || 'Guest'}</Text>
        <Text style={styles.ageLine}>{profile?.age ? `${profile.age} years old` : 'Age not set'}</Text>
        <View style={{ marginTop: spacing.sm }}>
          <Pill label={level.toUpperCase()} tone="accent" />
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Workouts</Text>
          <Text style={styles.statValue}>{stats.totalWorkouts.toLocaleString()}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Total Sets</Text>
          <Text style={styles.statValue}>{stats.totalSets.toLocaleString()}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>PRs</Text>
          <Text style={styles.statValue}>{stats.totalPRs.toLocaleString()}</Text>
        </Card>
      </View>

      <Card style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
        <Text style={styles.statLabel}>Total Weight Lifted</Text>
        <Text style={[styles.statValue, { fontSize: 24 }]}>{formatVolume(stats.totalWeight, unit)}</Text>
      </Card>

      <Text style={styles.sectionLabel}>Strength Tiers</Text>
      <Text style={styles.helpText}>
        Estimated 1-rep max (Epley formula) compared to your body weight.
        General reference points, not a verified standard.
      </Text>
      <Card style={{ marginBottom: spacing.md }}>
        {strengthRows.map((row, i) => (
          <View key={row.exerciseId} style={[styles.strengthRow, i < strengthRows.length - 1 && styles.strengthRowBorder]}>
            <View>
              <Text style={styles.strengthLift}>{row.label}</Text>
              <Text style={styles.strengthE1RM}>
                {row.e1RM ? `Est. 1RM: ${formatWeight(row.e1RM, unit)}` : 'Not logged yet'}
              </Text>
            </View>
            {row.tier ? (
              <Pill label={row.tier.toUpperCase()} tone={TIER_TONE[row.tier]} />
            ) : (
              <Text style={styles.strengthMissing}>{profile?.weight ? '—' : 'Set body weight'}</Text>
            )}
          </View>
        ))}
      </Card>

      <Text style={styles.sectionLabel}>Badges Earned ({earnedBadges.length}/{badges.length})</Text>
      <View style={styles.badgeGrid}>
        {badges.map((b) => (
          <Card key={b.id} style={[styles.badgeCard, !b.earned && styles.badgeLocked]}>
            <Text style={[styles.badgeEmoji, !b.earned && { opacity: 0.25 }]}>{b.emoji}</Text>
            <Text style={[styles.badgeLabel, !b.earned && { color: colors.muted }]}>{b.label}</Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  avatarWrap: { width: 80, height: 80, marginBottom: spacing.sm },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarEditBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  name: { color: colors.text, fontSize: 22, fontWeight: '900' },
  ageLine: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 2 },
  statsGrid: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, alignItems: 'center' },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sectionLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.xs },
  helpText: { color: colors.mutedDim, fontSize: 12, marginBottom: spacing.sm, lineHeight: 17 },
  strengthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  strengthRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  strengthLift: { color: colors.text, fontSize: 15, fontWeight: '700' },
  strengthE1RM: { color: colors.muted, fontSize: 12, marginTop: 2 },
  strengthMissing: { color: colors.mutedDim, fontSize: 12 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badgeCard: { width: '31%', alignItems: 'center', paddingVertical: spacing.md },
  badgeLocked: { opacity: 0.6 },
  badgeEmoji: { fontSize: 28, marginBottom: spacing.xs },
  badgeLabel: { color: colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
});
