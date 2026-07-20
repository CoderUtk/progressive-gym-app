import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Pill } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { getProfile, getWorkouts, getWeightUnit } from '../utils/storage';
import { computeStats, computeLevel, getBadgeStatus } from '../utils/badges';
import { formatWeight } from '../utils/units';

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalWorkouts: 0, totalSets: 0, totalWeight: 0, totalPRs: 0 });
  const [unit, setUnit] = useState('kg');

  useFocusEffect(
    useCallback(() => {
      Promise.all([getProfile(), getWorkouts(), getWeightUnit()]).then(([p, workouts, weightUnit]) => {
        setProfile(p);
        setStats(computeStats(workouts));
        setUnit(weightUnit);
      });
    }, [])
  );

  const level = computeLevel(stats.totalWorkouts);
  const badges = getBadgeStatus(stats);
  const earnedBadges = badges.filter((b) => b.earned);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      <Card style={{ alignItems: 'center', marginBottom: spacing.md }}>
        <Text style={styles.name}>{profile?.name || 'Guest'}</Text>
        <Text style={styles.ageLine}>{profile?.age ? `${profile.age} years old` : 'Age not set'}</Text>
        <View style={{ marginTop: spacing.sm }}>
          <Pill label={level.toUpperCase()} tone="accent" />
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Workouts</Text>
          <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Total Sets</Text>
          <Text style={styles.statValue}>{stats.totalSets}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>PRs</Text>
          <Text style={styles.statValue}>{stats.totalPRs}</Text>
        </Card>
      </View>

      <Card style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
        <Text style={styles.statLabel}>Total Weight Lifted</Text>
        <Text style={[styles.statValue, { fontSize: 24 }]}>{formatWeight(stats.totalWeight, unit)}</Text>
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
  name: { color: colors.text, fontSize: 22, fontWeight: '900' },
  ageLine: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 2 },
  statsGrid: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, alignItems: 'center' },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sectionLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.sm },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badgeCard: { width: '31%', alignItems: 'center', paddingVertical: spacing.md },
  badgeLocked: { opacity: 0.6 },
  badgeEmoji: { fontSize: 28, marginBottom: spacing.xs },
  badgeLabel: { color: colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
});
