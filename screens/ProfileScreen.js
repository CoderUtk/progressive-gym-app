import React, { useCallback, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Card, Pill } from '../components/UI';
import EditProfileModal from '../components/EditProfileModal';
import { colors, spacing, fonts } from '../utils/theme';
import { getProfile, getWorkouts, getWeightUnit, updateProfile } from '../utils/storage';
import { computeStats, computeLevel, getBadgeStatus } from '../utils/badges';
import { computeMilestones, nextMilestoneSummary } from '../utils/milestones';
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
// The picked image is downscaled to 256x256 JPEG @ 0.6 quality and stored as
// a base64 data URI (avatarData). This keeps the profile blob small enough
// to include in the cloud snapshot upload (~15-30 KB per avatar) so the
// picture actually round-trips across devices instead of a dead local URI.
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

    // Resize + re-encode to keep the base64 blob under ~30 KB. Original
    // camera photos can be 5-15 MB, which base64-encodes to ~20 MB — that
    // would blow up every backup snapshot.
    const manipulated = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 256, height: 256 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    const avatarData = `data:image/jpeg;base64,${manipulated.base64}`;
    // Wipe the old avatarUri so displays don't keep pointing at the local
    // file — avatarData is the source of truth now.
    const next = await updateProfile({ avatarData, avatarUri: null });
    setProfile(next);
  };

  const hasAvatar = profile?.avatarData || profile?.avatarUri;
  if (hasAvatar) {
    Alert.alert('Change avatar', 'Pick a new photo or reset to the default icon.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset to default', style: 'destructive', onPress: async () => {
        const next = await updateProfile({ avatarData: null, avatarUri: null });
        setProfile(next);
      }},
      { text: 'Choose photo', onPress: proceed },
    ]);
  } else {
    proceed();
  }
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalWorkouts: 0, totalSets: 0, totalWeight: 0, totalPRs: 0 });
  const [unit, setUnit] = useState('kg');
  const [workouts, setWorkouts] = useState([]);
  const [editOpen, setEditOpen] = useState(false);

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
  const milestones = computeMilestones(workouts, profile?.weight || 70);

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
          {profile?.avatarData || profile?.avatarUri ? (
            <Image source={{ uri: profile.avatarData || profile.avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: pickAvatar(profile?.name).bg }]}>
              <Feather name={pickAvatar(profile?.name).icon} size={34} color={pickAvatar(profile?.name).fg} />
            </View>
          )}
          <Pressable onPress={() => pickAvatarPhoto(profile, setProfile)} style={styles.avatarEditBtn}>
            <Feather name="camera" size={12} color={colors.ctaText} />
          </Pressable>
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile?.name || 'Guest'}</Text>
          <Pressable onPress={() => setEditOpen(true)} style={styles.editBtn} hitSlop={10}>
            <Feather name="edit-2" size={14} color={colors.accent} />
          </Pressable>
        </View>
        <Text style={styles.ageLine}>
          {profile?.age ? `${profile.age} years old` : 'Age not set'}
          {profile?.weight ? ` · ${profile.weight}kg` : ''}
        </Text>
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

      {milestones.nextUp ? (
        <View style={{ marginBottom: spacing.md }}>
          <Text style={styles.sectionLabel}>Next Strength Milestone</Text>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Text style={{ fontSize: 32 }}>{milestones.nextUp.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.milestoneLabel}>{milestones.nextUp.label}</Text>
                <Text style={styles.milestoneSub}>{milestones.nextUp.display}</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(4, milestones.nextUp.pct * 100)}%` }]} />
            </View>
            <Text style={styles.milestoneHint}>{nextMilestoneSummary(milestones.nextUp)}</Text>
          </Card>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>
        Strength Milestones ({milestones.earned.length}/{milestones.all.length})
      </Text>
      <View style={styles.badgeGrid}>
        {milestones.all.map((m) => (
          <Card key={m.id} style={[styles.badgeCard, !m.earned && styles.badgeLocked]}>
            <Text style={[styles.badgeEmoji, !m.earned && { opacity: 0.25 }]}>{m.emoji}</Text>
            <Text style={[styles.badgeLabel, !m.earned && { color: colors.muted }]} numberOfLines={2}>
              {m.label}
            </Text>
          </Card>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Badges Earned ({earnedBadges.length}/{badges.length})</Text>
      <View style={styles.badgeGrid}>
        {badges.map((b) => (
          <Card key={b.id} style={[styles.badgeCard, !b.earned && styles.badgeLocked]}>
            <Text style={[styles.badgeEmoji, !b.earned && { opacity: 0.25 }]}>{b.emoji}</Text>
            <Text style={[styles.badgeLabel, !b.earned && { color: colors.muted }]}>{b.label}</Text>
          </Card>
        ))}
      </View>

      {/* Cross-platform Settings entry point. The Dashboard header gear works
          on native but isn't discoverable on web, so ensure Settings is
          reachable from Profile too. */}
      <Pressable onPress={() => navigation.navigate('Records')} style={styles.settingsRow}>
        <View style={styles.settingsIcon}>
          <Feather name="award" size={18} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingsLabel}>Records</Text>
          <Text style={styles.settingsSub}>Volume, sets, reps, and per-muscle personal bests</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.muted} />
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Settings')} style={styles.settingsRow}>
        <View style={styles.settingsIcon}>
          <Feather name="settings" size={18} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingsLabel}>Settings</Text>
          <Text style={styles.settingsSub}>Units, plate increment, account, sign out</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.muted} />
      </Pressable>

      <EditProfileModal
        visible={editOpen}
        profile={profile}
        onClose={() => setEditOpen(false)}
        onSaved={(next) => setProfile(next)}
      />
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  editBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardAlt,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 15 },
  settingsSub: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  name: { color: colors.text, fontFamily: fonts.display, fontSize: 28, includeFontPadding: false },
  ageLine: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  statsGrid: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, alignItems: 'center' },
  statLabel: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { color: colors.text, fontFamily: fonts.display, fontSize: 26, includeFontPadding: false, fontVariant: ['tabular-nums'] },
  sectionLabel: { color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: spacing.xs },
  helpText: { color: colors.mutedDim, fontFamily: fonts.body, fontSize: 12, marginBottom: spacing.sm, lineHeight: 17 },
  strengthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  strengthRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  strengthLift: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 15 },
  strengthE1RM: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  strengthMissing: { color: colors.mutedDim, fontFamily: fonts.body, fontSize: 12 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badgeCard: { width: '31%', alignItems: 'center', paddingVertical: spacing.md },
  badgeLocked: { opacity: 0.6 },
  badgeEmoji: { fontSize: 28, marginBottom: spacing.xs },
  badgeLabel: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 11, textAlign: 'center' },
  milestoneLabel: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  milestoneSub: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  milestoneHint: { color: colors.mutedDim, fontFamily: fonts.body, fontSize: 12, marginTop: spacing.sm, lineHeight: 17 },
  progressTrack: {
    height: 8,
    backgroundColor: colors.cardAlt,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
});
