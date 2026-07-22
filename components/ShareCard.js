import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { getExerciseById, TRACKING } from '../data/exercises';
import { isWorkingSet } from '../utils/progressiveOverload';
import { formatWeight, formatVolume } from '../utils/units';
import { formatSetTight, volumeForSet } from '../utils/setSchema';

// Card design tokens — locked to the app palette. No new colors are minted
// here; the point of the share card is to look like Progressive, not to look
// like a new brand.
const CARD = {
  bg1: '#0B0E11',
  bg2: '#151A21',
  panel: '#1C222C',
  hairline: 'rgba(255,255,255,0.10)',
  glow: 'rgba(62,224,158,0.15)',
  accent: '#3EE09E',
  gold: '#F5C542',
  text: '#FFFFFF',
  muted: '#94A3B8',
  caption: '#64748B',
};

// Scoreboard-style number face. Tabular figures on iOS keep column widths
// stable so the hero volume doesn't dance across renders; Android falls back
// to its default monospace which already ships tabular.
const NUM_FONT = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

function formatDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function computeHighlights(exercises, unit, bodyweight = 70) {
  const rows = exercises
    .map((ex) => {
      const exercise = getExerciseById(ex.exerciseId);
      const working = (ex.sets || []).filter(isWorkingSet);
      if (!exercise || working.length === 0) return null;
      // Pick a representative "top" set per type: heaviest for weighted,
      // longest duration for timed/cardio, most reps for bodyweight.
      const scorer = exercise.tracking_type === TRACKING.CARDIO || exercise.tracking_type === TRACKING.TIMED_HOLD
        ? (s) => s.durationSec || 0
        : exercise.tracking_type === TRACKING.BODYWEIGHT_REPS
          ? (s) => s.reps || 0
          : (s) => s.weight || 0;
      const top = working.reduce((a, b) => (scorer(b) > scorer(a) ? b : a), working[0]);
      const volume = working.reduce((sum, s) => sum + volumeForSet(exercise, s, bodyweight), 0);
      return {
        id: ex.exerciseId,
        name: exercise.name,
        top: formatSetTight(exercise, top, unit),
        volume,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);
  return rows;
}

// Perforation strip — imitates the tear-off line on a gym receipt / entry
// slip. Two SDKs, one purpose: a repeating row of tiny dots the reader parses
// as "this is a printed record," not "this is a dashboard."
function Perforation() {
  return (
    <View style={styles.perfRow}>
      {Array.from({ length: 40 }).map((_, i) => (
        <View key={i} style={styles.perfDot} />
      ))}
    </View>
  );
}

// Dotted rows are patched together the same way — 3px dot, 4px gap.
export default function ShareCard({ profile, session, unit = 'kg', prCount = 0, topPR = null, width = 360 }) {
  const height = Math.round(width * (16 / 9));
  const bodyweight = profile?.weight || 70;
  const totalVolume = session.exercises.reduce((sum, ex) => {
    const exercise = getExerciseById(ex.exerciseId);
    return sum + (ex.sets || []).filter(isWorkingSet).reduce((s, x) => s + volumeForSet(exercise, x, bodyweight), 0);
  }, 0);
  const totalSets = session.exercises.reduce(
    (sum, ex) => sum + (ex.sets || []).filter(isWorkingSet).length,
    0
  );
  const highlights = computeHighlights(session.exercises, unit, bodyweight);
  const durationLabel = formatDuration(session.durationMs);
  const workoutTitle = (session.name || 'Workout').toUpperCase() + ' COMPLETED';
  const hasPRs = prCount > 0;

  return (
    <View style={[styles.wrap, { width, height }]}>
      <LinearGradient
        colors={[CARD.bg1, CARD.bg2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Ambient mint glow — pinned to top third, radial-ish via nested blur. */}
      <View style={styles.glowOuter} pointerEvents="none">
        <View style={styles.glowInner} />
      </View>

      <View style={styles.frame}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandCluster}>
            <Image source={require('../assets/icon.png')} style={styles.brandMark} />
            <Text style={styles.wordmark}>PROGRESSIVE</Text>
          </View>
          <View style={styles.userCluster}>
            {profile?.avatarData || profile?.avatarUri ? (
              <Image source={{ uri: profile.avatarData || profile.avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Feather name="user" size={14} color={CARD.accent} />
              </View>
            )}
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.userName} numberOfLines={1}>{profile?.name || 'Athlete'}</Text>
              <Text style={styles.userDate}>{shortDate(session.date)}</Text>
            </View>
          </View>
        </View>

        <Perforation />

        {/* Hero — either PR headline OR total volume. If topPR is present,
            headline the specific PR (weight × reps) and put volume in a
            supporting line; otherwise volume IS the headline. */}
        <View style={styles.hero}>
          {topPR ? (
            <>
              <Text style={styles.heroEyebrow}>NEW PERSONAL RECORD</Text>
              <Text style={styles.heroPRName} numberOfLines={2}>{topPR.name}</Text>
              <Text style={styles.heroNumber}>{topPR.value}</Text>
              <Text style={styles.heroSublabel}>
                {formatVolume(totalVolume, unit)} total volume · {workoutTitle}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.heroEyebrow}>{workoutTitle}</Text>
              <Text style={styles.heroNumber}>{formatVolume(totalVolume, unit)}</Text>
              <View style={styles.heroUnderline} />
              <Text style={styles.heroSublabel}>TOTAL VOLUME LIFTED</Text>
            </>
          )}
        </View>

        <Perforation />

        {/* Highlights */}
        {highlights.length > 0 && (
          <View style={styles.highlights}>
            {highlights.map((row, i) => (
              <View
                key={row.id}
                style={[styles.highlightRow, i > 0 && styles.highlightRowBorder]}
              >
                <Text style={styles.highlightName} numberOfLines={1}>{row.name}</Text>
                <Text style={styles.highlightValue}>{row.top}</Text>
              </View>
            ))}
          </View>
        )}

        {/* KPI strip */}
        <View style={styles.kpiRow}>
          <KpiCell value={durationLabel} label="Duration" />
          <KpiCell value={String(totalSets)} label="Total Sets" />
          <KpiCell
            value={String(prCount)}
            label={prCount === 1 ? 'PR Hit' : 'PRs Hit'}
            tone={hasPRs ? 'gold' : 'default'}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Feather name="zap" size={11} color={CARD.caption} />
          <Text style={styles.footerText}>Tracked with Progressive</Text>
        </View>
      </View>
    </View>
  );
}

function KpiCell({ value, label, tone = 'default' }) {
  const isGold = tone === 'gold';
  return (
    <View style={[styles.kpiCell, isGold && styles.kpiCellGold]}>
      <Text style={[styles.kpiValue, isGold && { color: CARD.gold }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CARD.hairline,
    backgroundColor: CARD.bg1,
  },
  frame: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  glowOuter: {
    position: 'absolute',
    top: -40,
    left: '15%',
    right: '15%',
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  glowInner: {
    width: '100%',
    height: '100%',
    borderRadius: 200,
    backgroundColor: CARD.glow,
    // shadow gives the "radial" softness without needing a real radial gradient dep.
    shadowColor: CARD.accent,
    shadowOpacity: 0.35,
    shadowRadius: 80,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 24, height: 24, borderRadius: 6 },
  wordmark: {
    color: CARD.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
  userCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: CARD.hairline },
  avatarFallback: { backgroundColor: CARD.panel, alignItems: 'center', justifyContent: 'center' },
  userName: { color: CARD.text, fontSize: 12, fontWeight: '700', maxWidth: 120 },
  userDate: { color: CARD.muted, fontSize: 10, fontWeight: '600', marginTop: 1 },

  perfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 18,
    opacity: 0.55,
  },
  perfDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: CARD.muted,
  },

  hero: { alignItems: 'flex-start' },
  heroEyebrow: {
    color: CARD.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.4,
    marginBottom: 10,
  },
  heroPRName: {
    color: CARD.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroNumber: {
    color: CARD.text,
    fontFamily: NUM_FONT,
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 62,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  heroUnderline: {
    marginTop: 6,
    width: 48,
    height: 2,
    backgroundColor: CARD.accent,
    borderRadius: 1,
    shadowColor: CARD.accent,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  heroSublabel: {
    marginTop: 10,
    color: CARD.caption,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },

  highlights: {
    backgroundColor: CARD.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD.hairline,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  highlightRowBorder: { borderTopWidth: 1, borderTopColor: CARD.hairline },
  highlightName: { color: CARD.text, fontSize: 13, fontWeight: '700', flex: 1, paddingRight: 8 },
  highlightValue: {
    color: CARD.accent,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: NUM_FONT,
    fontVariant: ['tabular-nums'],
  },

  kpiRow: { flexDirection: 'row', gap: 8 },
  kpiCell: {
    flex: 1,
    backgroundColor: CARD.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD.hairline,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  kpiCellGold: {
    borderColor: 'rgba(245,197,66,0.45)',
    backgroundColor: 'rgba(245,197,66,0.10)',
  },
  kpiValue: {
    color: CARD.text,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: NUM_FONT,
    fontVariant: ['tabular-nums'],
  },
  kpiLabel: {
    color: CARD.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginTop: 3,
    textTransform: 'uppercase',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  footerText: { color: CARD.caption, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
});
